import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SCHEDULED TASK: Send notifications for rentals ending soon
 * Run this every hour to notify providers and renters of upcoming rental endings
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('Starting rental ending notifications check...');
    
    const now = new Date();
    const next24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const next48Hours = new Date(now.getTime() + (48 * 60 * 60 * 1000));

    // Fetch active car rentals
    const carRentals = await base44.asServiceRole.entities.CarRental.filter({
      status: { $in: ['active', 'confirmed'] }
    });

    // Fetch active property bookings
    const propertyBookings = await base44.asServiceRole.entities.Booking.filter({
      status: 'confirmed'
    });

    console.log(`Found ${carRentals.length} car rentals, ${propertyBookings.length} property bookings`);

    let notificationsSent = 0;

    // Process car rentals
    for (const rental of carRentals) {
      const endDate = new Date(rental.end_date);
      
      if (endDate >= now && endDate <= next48Hours) {
        const hoursLeft = Math.round((endDate - now) / (1000 * 60 * 60));
        
        // Notify provider
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: rental.provider_email,
          type: 'rental_ending_soon',
          title: 'Car Rental Ending Soon',
          message: `${rental.car_make} ${rental.car_model} rental ends in ${hoursLeft} hours. Prepare for vehicle return inspection.`,
          reference_type: 'car_rental',
          reference_id: rental.id
        });

        // Notify renter
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: rental.renter_email,
          type: 'rental_ending_soon',
          title: 'Rental Ending Soon - Return Reminder',
          message: `Your ${rental.car_make} ${rental.car_model} rental ends in ${hoursLeft} hours. Please return on time to avoid late fees.`,
          reference_type: 'car_rental',
          reference_id: rental.id
        });

        notificationsSent += 2;
        console.log(`Sent notifications for car rental ${rental.id} - ${hoursLeft}h left`);
      }
    }

    // Process property bookings
    for (const booking of propertyBookings) {
      const checkoutDate = new Date(booking.check_out);
      
      if (checkoutDate >= now && checkoutDate <= next48Hours) {
        const hoursLeft = Math.round((checkoutDate - now) / (1000 * 60 * 60));
        
        // Notify host
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: booking.host_email,
          type: 'booking_ending_soon',
          title: 'Guest Checkout Soon',
          message: `Guest checkout in ${hoursLeft} hours. Prepare for property inspection and cleaning assessment.`,
          reference_type: 'property_booking',
          reference_id: booking.id
        });

        // Notify guest
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: booking.guest_email,
          type: 'booking_ending_soon',
          title: 'Checkout Reminder',
          message: `Your stay ends in ${hoursLeft} hours. Please checkout on time and leave the property as you found it.`,
          reference_type: 'property_booking',
          reference_id: booking.id
        });

        notificationsSent += 2;
        console.log(`Sent notifications for booking ${booking.id} - ${hoursLeft}h left`);
      }
    }

    console.log(`✅ Completed: Sent ${notificationsSent} notifications`);

    return Response.json({
      success: true,
      notifications_sent: notificationsSent,
      car_rentals_checked: carRentals.length,
      property_bookings_checked: propertyBookings.length
    });

  } catch (error) {
    console.error('❌ Error sending rental notifications:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});