import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

// Auto-creates a ChatConversation the first time a booking/order/purchase
// links two people together, so they land in a real thread instead of
// starting from scratch.
export default function AutoConversationCreator({ currentUser }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser) return;

    const createIfMissing = async ({ existingQuery, participants, name, type, referenceId }) => {
      // This used to fetch every ChatConversation on the platform just to
      // scan for one match -- a query that gets more expensive with every
      // booking/order/purchase ever made, run for every one of these
      // events on every connected user's session. A targeted filter finds
      // the same answer without transferring the whole table.
      const existing = await base44.entities.ChatConversation.filter(existingQuery, 1);
      if (existing.length > 0) return;

      await base44.entities.ChatConversation.create({
        participants,
        name,
        type,
        reference_id: referenceId,
        unread_count: {}
      });
      queryClient.invalidateQueries(['conversations']);
    };

    // Subscribing unfiltered to Booking/Order/ContentPurchase meant every
    // connected user's session received every one of these events created
    // anywhere on the platform, just to check "is this mine?" client-side.
    // Postgres Realtime filters only support a single column=eq.value
    // condition, so each entity needs two scoped subscriptions (one per
    // identity role) instead of one unfiltered one.
    //
    // Booking.guest_email/Order.buyer_email+seller_email don't exist as
    // columns on bookings/orders (created_by/provider_email and
    // customer_email/provider_email are the real ones) -- the original
    // unfiltered version's `if` check against those always came back
    // undefined, so this auto-chat feature has never actually fired for
    // a booking or a marketplace order. Fixed while moving the check
    // server-side, since a Realtime filter on a nonexistent column
    // would otherwise just break the subscription outright.
    const unsubs = [
      base44.entities.Booking.subscribe(async (event) => {
        if (event.type !== 'create') return;
        const participants = [event.data.created_by, event.data.provider_email].filter(Boolean);
        await createIfMissing({
          existingQuery: { type: 'booking', reference_id: event.data.id },
          participants,
          name: `Booking: ${event.data.experience_title || 'Service'}`,
          type: 'booking',
          referenceId: event.data.id
        });
      }, { filter: `created_by=eq.${currentUser.email}` }),

      base44.entities.Booking.subscribe(async (event) => {
        if (event.type !== 'create') return;
        const participants = [event.data.created_by, event.data.provider_email].filter(Boolean);
        await createIfMissing({
          existingQuery: { type: 'booking', reference_id: event.data.id },
          participants,
          name: `Booking: ${event.data.experience_title || 'Service'}`,
          type: 'booking',
          referenceId: event.data.id
        });
      }, { filter: `provider_email=eq.${currentUser.email}` }),

      base44.entities.Order.subscribe(async (event) => {
        if (event.type !== 'create') return;
        const participants = [event.data.customer_email, event.data.provider_email].filter(Boolean);
        await createIfMissing({
          existingQuery: { type: 'order', reference_id: event.data.id },
          participants,
          name: `Order: ${event.data.item_title || 'Item'}`,
          type: 'order',
          referenceId: event.data.id
        });
      }, { filter: `customer_email=eq.${currentUser.email}` }),

      base44.entities.Order.subscribe(async (event) => {
        if (event.type !== 'create') return;
        const participants = [event.data.customer_email, event.data.provider_email].filter(Boolean);
        await createIfMissing({
          existingQuery: { type: 'order', reference_id: event.data.id },
          participants,
          name: `Order: ${event.data.item_title || 'Item'}`,
          type: 'order',
          referenceId: event.data.id
        });
      }, { filter: `provider_email=eq.${currentUser.email}` }),

      base44.entities.ContentPurchase.subscribe(async (event) => {
        if (event.type !== 'create') return;
        const participants = [event.data.buyer_email, event.data.creator_email].filter(Boolean);
        await createIfMissing({
          // A conversation is per (content, buyer) -- the same content can
          // have a separate thread with each buyer who purchased it, so
          // the existence check has to include the buyer, not just the
          // content_id.
          existingQuery: { reference_id: event.data.content_id, participants: { $contains: event.data.buyer_email } },
          participants,
          name: `Content Discussion`,
          type: 'general',
          referenceId: event.data.content_id
        });
      }, { filter: `buyer_email=eq.${currentUser.email}` }),

      base44.entities.ContentPurchase.subscribe(async (event) => {
        if (event.type !== 'create') return;
        const participants = [event.data.buyer_email, event.data.creator_email].filter(Boolean);
        await createIfMissing({
          existingQuery: { reference_id: event.data.content_id, participants: { $contains: event.data.buyer_email } },
          participants,
          name: `Content Discussion`,
          type: 'general',
          referenceId: event.data.content_id
        });
      }, { filter: `creator_email=eq.${currentUser.email}` }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [currentUser]);

  return null;
}
