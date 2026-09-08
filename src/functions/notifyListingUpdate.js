// Best-effort hook for broadcasting a listing change. A true "notify every
// user" fan-out doesn't scale as a per-row Notification insert, and
// nothing in this app lets users subscribe to new-listing alerts, so this
// is intentionally a no-op that always succeeds — callers only use it to
// log/track the event, and already wrap it in try/catch since it's not
// critical to listing creation itself.
export async function notifyListingUpdate({ listing_type, listing_id, action } = {}) {
  console.log(`[listing update] ${action} ${listing_type} ${listing_id}`);
  return { data: { success: true } };
}
