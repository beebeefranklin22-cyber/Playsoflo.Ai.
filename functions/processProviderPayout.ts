import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, payout_method, bank_account_id } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (amount < 10) {
      return Response.json({ error: 'Minimum payout is $10' }, { status: 400 });
    }

    // Get provider's completed bookings/rentals to calculate available earnings
    const [serviceBookings, carRentals, propertyBookings] = await Promise.all([
      base44.entities.ServiceBooking.filter({
        provider_email: user.email,
        status: 'completed'
      }),
      base44.entities.CarRental.filter({
        provider_email: user.email,
        status: 'completed'
      }),
      base44.entities.Booking.filter({
        host_email: user.email,
        status: 'completed'
      })
    ]);

    // Calculate net earnings after platform fees
    const bookingEarnings = serviceBookings.reduce((sum, b) => {
      const platformFee = (b.total_price || 0) * 0.05; // 5% platform fee
      return sum + ((b.total_price || 0) - platformFee);
    }, 0);

    const rentalEarnings = carRentals.reduce((sum, r) => {
      const fee = (r.total_amount || 0) * (r.platform_commission_rate || 0.19);
      return sum + ((r.total_amount || 0) - fee);
    }, 0);

    const propertyEarnings = propertyBookings.reduce((sum, b) => {
      const platformFee = (b.total_price || 0) * 0.10; // 10% platform fee
      return sum + ((b.total_price || 0) - platformFee);
    }, 0);

    const totalAvailable = bookingEarnings + rentalEarnings + propertyEarnings;
    const alreadyPaid = user.total_payouts_requested || 0;
    const availableForPayout = totalAvailable - alreadyPaid;

    if (amount > availableForPayout) {
      return Response.json({ 
        error: `Insufficient earnings. Available: $${availableForPayout.toFixed(2)}` 
      }, { status: 400 });
    }

    // Process payout to wallet
    if (payout_method === 'wallet') {
      const currentBalance = user.usd_balance || 0;
      await base44.asServiceRole.auth.updateUser(user.email, {
        usd_balance: currentBalance + amount,
        total_payouts_requested: alreadyPaid + amount
      });

      // Create payment record
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: amount,
        amount_rri: 0,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'other',
        memo: 'Provider earnings payout to wallet',
        recipient_email: user.email,
        created_by: user.email
      });

      // Create notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'payment_received',
        title: 'Payout Received',
        message: `$${amount.toFixed(2)} has been added to your wallet from your provider earnings.`,
        read: false,
        action_url: '/Wallet'
      });

      return Response.json({ 
        success: true,
        message: `$${amount.toFixed(2)} added to your wallet`,
        new_balance: currentBalance + amount
      });
    }

    // Process bank transfer
    if (payout_method === 'bank') {
      if (!bank_account_id) {
        return Response.json({ error: 'Bank account required' }, { status: 400 });
      }

      // Get bank account details
      const bankAccount = await base44.entities.BankAccount.get(bank_account_id);
      
      if (!bankAccount || bankAccount.user_email !== user.email) {
        return Response.json({ error: 'Invalid bank account' }, { status: 400 });
      }

      // Create pending transfer record
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: amount,
        amount_rri: 0,
        method: 'bank',
        status: 'pending',
        reference_type: 'withdrawal',
        memo: `Provider payout to ${bankAccount.bank_name} ••••${bankAccount.account_number_last4}`,
        recipient_email: user.email,
        created_by: user.email
      });

      // Update total payouts requested
      await base44.asServiceRole.auth.updateUser(user.email, {
        total_payouts_requested: alreadyPaid + amount
      });

      // Create notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'payment_received',
        title: 'Payout Initiated',
        message: `Bank transfer of $${amount.toFixed(2)} initiated. Funds will arrive in 1-3 business days.`,
        read: false,
        action_url: '/Wallet'
      });

      return Response.json({ 
        success: true,
        message: `Bank transfer of $${amount.toFixed(2)} initiated`,
        bank: bankAccount.bank_name
      });
    }

    return Response.json({ error: 'Invalid payout method' }, { status: 400 });
  } catch (error) {
    console.error('Payout error:', error);
    return Response.json({ 
      error: error.message || 'Payout processing failed' 
    }, { status: 500 });
  }
});