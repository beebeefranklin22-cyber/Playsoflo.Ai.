export async function toggleStreamingEngagement(data) {
  try {
    const { stream_id, action, user_id } = data;

    if (!stream_id || !action) {
      throw new Error('stream_id and action are required');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggleStreamingEngagement`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          stream_id,
          action, // e.g. 'like', 'follow', 'subscribe', 'gift'
          user_id
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to toggle streaming engagement');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error toggling streaming engagement:', error);
    throw error;
  }
}
