import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rentalData = await req.json();

    // Quick basic fraud check (no AI to avoid timeout)
    const days = Math.ceil(
      (new Date(rentalData.end_date) - new Date(rentalData.start_date)) / (1000 * 60 * 60 * 24)
    );
    
    // Simple fraud score based on rental patterns
    let fraudScore = 0;
    if (days > 30) fraudScore += 20; // Very long rental
    if (rentalData.total_amount > 10000) fraudScore += 15; // High value
    if (rentalData.delivery_option === 'delivery_both_ways') fraudScore += 5; // Delivery both ways
    
    // Generate unique unlock code if using app unlock
    const unlockCode = rentalData.unlock_method === 'app_unlock' 
      ? `PSFC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : null;

    // Calculate platform commission (16%-22%, default 19%)
    const commissionRate = rentalData.platform_commission_rate || 0.19;
    const platformCommission = rentalData.total_amount * commissionRate;
    const providerEarnings = rentalData.total_amount - platformCommission;

    // Create car rental record
    const rental = await base44.asServiceRole.entities.CarRental.create({
      ...rentalData,
      renter_email: user.email,
      platform_commission_rate: commissionRate,
      platform_commission_amount: platformCommission,
      provider_earnings: providerEarnings,
      fraud_check_passed: fraudScore < 50,
      fraud_score: fraudScore,
      unlock_code: unlockCode,
      status: fraudScore < 30 ? 'confirmed' : 'pending',
      verification_status: 'pending'
    });

    // Create conversation between renter and provider
    const conversation = await base44.asServiceRole.entities.ChatConversation.create({
      participants: [user.email, rentalData.provider_email],
      name: `Car Rental: ${rentalData.car_make} ${rentalData.car_model}`,
      unread_count: {}
    });

    // Update rental with conversation ID
    await base44.asServiceRole.entities.CarRental.update(rental.id, {
      conversation_id: conversation.id
    });

    // Send initial message
    await base44.asServiceRole.entities.ChatMessage.create({
      conversation_id: conversation.id,
      sender_email: user.email,
      content: `Hi! I'd like to rent your ${rentalData.car_make} ${rentalData.car_model} from ${new Date(rentalData.start_date).toLocaleDateString()} to ${new Date(rentalData.end_date).toLocaleDateString()}.`,
      message_type: 'text'
    });

    // Notify provider
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: rentalData.provider_email,
      type: 'booking_confirmed',
      title: '🚗 New Car Rental Request',
      message: `${user.full_name || user.email} wants to rent your ${rentalData.car_make} ${rentalData.car_model}`,
      reference_type: 'booking',
      reference_id: rental.id
    });

    return Response.json({
      success: true,
      rental,
      conversation_id: conversation.id,
      unlock_code: unlockCode,
      requires_manual_review: fraudScore >= 30
    });

  } catch (error) {
    console.error('Car rental creation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create car rental' 
    }, { status: 500 });
  }
});