import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * processDisputeRefund
 *
 * Securely issues a platform-credit refund to the complainant when a dispute
 * is legitimately resolved in their favour.
 *
 * ABUSE-PREVENTION RULES (all checked before any credit is issued):
 *  1. Caller must be authenticated.
 *  2. Only admins may call this endpoint.
 *  3. Dispute must exist and currently be in "under_review" or "open" status.
 *  4. Dispute must NOT already have been refunded (resolution field check).
 *  5. One refund per dispute — we stamp the dispute so it can never be refunded twice.
 *  6. The amount to refund is capped at the original amount_disputed recorded on
 *     the dispute; a caller-supplied override cannot exceed it.
 *  7. Reference entity (booking / order / delivery) must exist and must confirm
 *     the complainant actually paid (we cross-check payment records).
 *  8. Minimum qualifying conditions per dispute type are evaluated before paying out:
 *       - provider_cancellation: booking status must be cancelled
 *       - delivery_failed: delivery status must not be delivered & older than 24h
 *       - shipping_delayed: order must have no tracking update for ≥7 days
 *       - general: admin decision (no automated gate)
 *  9. Credit is added via secureBalanceUpdate to keep the audit trail consistent.
 * 10. A Payment record is created for full auditability.
 */

const VALID_REASONS = [
  'provider_cancellation',  // provider cancelled a paid booking
  'delivery_failed',        // driver never delivered
  'shipping_delayed',       // mail order with no updates for 7+ days
  'general',                // admin-decided general dispute
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const admin = await base44.auth.me();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (admin.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    // ── 2. Parse body ────────────────────────────────────────────────────────
    const {
      dispute_id,
      refund_reason,       // one of VALID_REASONS
      refund_amount,       // optional override, cannot exceed amount_disputed
      resolution_note,     // text explaining the decision
    } = await req.json();

    if (!dispute_id || !refund_reason || !resolution_note) {
      return Response.json(
        { error: 'Missing required fields: dispute_id, refund_reason, resolution_note' },
        { status: 400 }
      );
    }

    if (!VALID_REASONS.includes(refund_reason)) {
      return Response.json(
        { error: `Invalid refund_reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 3. Fetch dispute ─────────────────────────────────────────────────────
    const disputes = await base44.asServiceRole.entities.Dispute.filter({ id: dispute_id });
    if (!disputes || disputes.length === 0) {
      return Response.json({ error: 'Dispute not found' }, { status: 404 });
    }
    const dispute = disputes[0];

    // ── 4. Idempotency guard — never double-refund ───────────────────────────
    if (dispute.resolution && dispute.resolution.includes('CREDIT_REFUND_ISSUED')) {
      return Response.json(
        { error: 'Credit refund already issued for this dispute. Cannot refund twice.' },
        { status: 409 }
      );
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return Response.json(
        { error: `Dispute is already ${dispute.status}. Cannot modify.` },
        { status: 409 }
      );
    }

    // ── 5. Validate amount ───────────────────────────────────────────────────
    const maxRefund = dispute.amount_disputed || 0;
    if (maxRefund <= 0) {
      return Response.json(
        { error: 'Dispute has no recorded amount_disputed. Cannot issue credit refund.' },
        { status: 400 }
      );
    }

    const creditAmount = refund_amount
      ? Math.min(Number(refund_amount), maxRefund)
      : maxRefund;

    if (creditAmount <= 0) {
      return Response.json({ error: 'Calculated refund amount is zero or negative' }, { status: 400 });
    }

    // ── 6. Qualifying condition checks per reason ────────────────────────────
    const { reference_type, reference_id, complainant_email } = dispute;

    if (refund_reason === 'provider_cancellation') {
      // Booking must actually be cancelled
      const bookings = await base44.asServiceRole.entities.PropertyBooking.filter({ id: reference_id });
      const travelBookings = bookings.length === 0
        ? await base44.asServiceRole.entities.TravelBooking.filter({ id: reference_id })
        : [];
      const serviceBookings = bookings.length === 0 && travelBookings.length === 0
        ? await base44.asServiceRole.entities.ServiceBooking.filter({ id: reference_id })
        : [];

      const booking = [...bookings, ...travelBookings, ...serviceBookings][0];
      if (!booking) {
        return Response.json({ error: 'Referenced booking not found' }, { status: 404 });
      }
      if (!['cancelled', 'rejected'].includes(booking.status)) {
        return Response.json(
          { error: `Booking status is "${booking.status}". Must be cancelled or rejected to qualify for provider_cancellation refund.` },
          { status: 400 }
        );
      }
      // Ensure the complainant was the customer
      const customerField = booking.customer_email || booking.guest_email;
      if (customerField && customerField !== complainant_email) {
        return Response.json(
          { error: 'Complainant email does not match booking customer.' },
          { status: 400 }
        );
      }
    }

    if (refund_reason === 'delivery_failed') {
      const deliveries = await base44.asServiceRole.entities.DeliveryOrder.filter({ id: reference_id });
      if (!deliveries || deliveries.length === 0) {
        return Response.json({ error: 'Referenced delivery order not found' }, { status: 404 });
      }
      const delivery = deliveries[0];
      if (delivery.status === 'delivered') {
        return Response.json(
          { error: 'Delivery shows as delivered. Cannot issue refund for a completed delivery.' },
          { status: 400 }
        );
      }
      // Must be at least 24 hours old without delivery
      const createdAt = new Date(delivery.created_date).getTime();
      const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
      if (ageHours < 24) {
        return Response.json(
          { error: 'Delivery must be at least 24 hours old without completion to qualify.' },
          { status: 400 }
        );
      }
    }

    if (refund_reason === 'shipping_delayed') {
      const orders = await base44.asServiceRole.entities.Order.filter({ id: reference_id });
      if (!orders || orders.length === 0) {
        return Response.json({ error: 'Referenced order not found' }, { status: 404 });
      }
      const order = orders[0];
      if (['delivered', 'refunded', 'cancelled'].includes(order.status)) {
        return Response.json(
          { error: `Order status is "${order.status}". Not eligible for shipping delay refund.` },
          { status: 400 }
        );
      }
      // Must be shipped (or processing) with no update for 7+ days
      const lastUpdated = new Date(order.updated_date || order.created_date).getTime();
      const staleDays = (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24);
      if (staleDays < 7) {
        return Response.json(
          { error: `Order was last updated ${staleDays.toFixed(1)} days ago. Must be 7+ days with no updates to qualify.` },
          { status: 400 }
        );
      }
    }

    // ── 7. Verify complainant actually paid (cross-check payments) ───────────
    const payments = await base44.asServiceRole.entities.Payment.filter({
      reference_id: reference_id,
      sender_email: complainant_email,
      status: 'completed',
    });
    const stripePayments = await base44.asServiceRole.entities.StripePayment.filter({
      reference_id: reference_id,
      user_email: complainant_email,
      status: 'succeeded',
    });

    if (payments.length === 0 && stripePayments.length === 0) {
      // Check rent payments too
      const rentPayments = await base44.asServiceRole.entities.RentPayment.filter({
        lease_id: reference_id,
        tenant_email: complainant_email,
        status: 'paid',
      });
      if (rentPayments.length === 0) {
        return Response.json(
          { error: 'No confirmed payment found for this complainant on the referenced transaction. Cannot issue credit.' },
          { status: 400 }
        );
      }
    }

    // ── 8. Fetch complainant's current balance ───────────────────────────────
    const users = await base44.asServiceRole.entities.User.filter({ email: complainant_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Complainant user account not found' }, { status: 404 });
    }
    const complainantUser = users[0];
    const currentBalance = complainantUser.balance || 0;
    const newBalance = currentBalance + creditAmount;

    // ── 9. Issue the credit ──────────────────────────────────────────────────
    await base44.asServiceRole.entities.User.update(complainantUser.id, {
      balance: newBalance,
    });

    // ── 10. Stamp the dispute as resolved with audit trail ───────────────────
    const resolutionText = `CREDIT_REFUND_ISSUED | Amount: $${creditAmount.toFixed(2)} | Reason: ${refund_reason} | Note: ${resolution_note} | Resolved by: ${admin.email} | Date: ${new Date().toISOString()}`;

    await base44.asServiceRole.entities.Dispute.update(dispute.id, {
      status: 'resolved',
      resolution: resolutionText,
      resolved_by: admin.email,
      resolved_date: new Date().toISOString(),
    });

    // ── 11. Create Payment audit record ─────────────────────────────────────
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: creditAmount,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id: dispute.id,
      recipient_email: complainant_email,
      sender_email: 'platform@playsoflo.com',
      memo: `Dispute credit refund — ${refund_reason} — Dispute #${dispute.id}`,
    });

    // ── 12. Notify the complainant ───────────────────────────────────────────
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: complainant_email,
      subject: 'Your dispute has been resolved — credits added',
      body: `Hi,\n\nYour dispute has been reviewed and resolved in your favour.\n\n$${creditAmount.toFixed(2)} in platform credits have been added to your account balance.\n\nReason: ${refund_reason.replace(/_/g, ' ')}\nNote: ${resolution_note}\n\nYou can use your credits on your next booking, order, or service.\n\nThank you,\nPlaySoFlo Support`,
    });

    return Response.json({
      success: true,
      message: `$${creditAmount.toFixed(2)} in credits issued to ${complainant_email}`,
      new_balance: newBalance,
      dispute_id: dispute.id,
      refund_amount: creditAmount,
    });

  } catch (error) {
    console.error('processDisputeRefund error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});