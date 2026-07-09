export async function dispatchFoodOrder(data) {
  try {
    const { food_order_id, payment_intent_id } = data;

    if (!food_order_id) {
      throw new Error('food_order_id is required');
    }

    // Call Supabase edge function to dispatch the order
    // This creates delivery orders, notifies restaurant and drivers
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispatchFoodOrder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          food_order_id,
          payment_intent_id
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to dispatch order');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error dispatching food order:', error);
    throw error;
  }
}
