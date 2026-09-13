import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';

// Backs completeDelivery. Only the assigned driver can update their own
// delivery's status; reaching 'delivered' credits the driver's earnings
// (set at order-creation time — see api/checkout.js's analogous pattern —
// or a flat fallback if none was recorded).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { order_id, new_status, message } = req.body || {};
  const admin = getSupabaseAdmin();

  try {
    const { data: order, error: fetchError } = await admin.from('delivery_orders').select('*').eq('id', order_id).single();
    if (fetchError || !order) throw new Error('Delivery order not found');
    if (order.driver_email !== user.email) throw new Error('You are not the assigned driver for this delivery');

    const { error: updateError } = await admin
      .from('delivery_orders')
      .update({ status: new_status, tracking_updates: [...(order.tracking_updates || []), { status: new_status, message, at: new Date().toISOString() }] })
      .eq('id', order_id);
    if (updateError) throw updateError;

    if (new_status === 'delivered' && order.status !== 'delivered') {
      const earnings = order.driver_earnings || order.price_total * 0.8 || 5;
      const { error: moveError } = await admin.rpc('wallet_move', {
        p_from_email: null,
        p_to_email: user.email,
        p_debit_amount: null,
        p_credit_amount: earnings,
        p_reference_type: 'delivery_earnings',
        p_reference_id: order_id,
        p_memo: null,
      });
      if (moveError) console.error('Failed to credit delivery earnings for', order_id, moveError);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('completeDelivery error:', err);
    return res.status(200).json({ error: err.message });
  }
}
