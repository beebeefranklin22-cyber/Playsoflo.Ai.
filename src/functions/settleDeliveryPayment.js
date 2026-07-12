export async function settleDeliveryPayment(data) {
  try {
    const { order_id, payment_intent_id } = data;

    if (!order_id) {
      throw new Error('order_id is required');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/settleDeliveryPayment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          order_id,
          payment_intent_id
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to settle delivery payment');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error settling delivery payment:', error);
    throw error;
  }
}
