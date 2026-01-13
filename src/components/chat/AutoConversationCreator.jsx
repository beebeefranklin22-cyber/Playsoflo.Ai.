import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function AutoConversationCreator({ currentUser }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to booking confirmations
    const bookingUnsub = base44.entities.Booking.subscribe(async (event) => {
      if (event.type === 'create' && 
          (event.data.guest_email === currentUser.email || event.data.provider_email === currentUser.email)) {
        
        const participants = [event.data.guest_email, event.data.provider_email].filter(Boolean);
        
        // Check if conversation exists
        const existing = await base44.entities.ChatConversation.list();
        const hasConv = existing.some(conv => 
          conv.type === 'booking' &&
          conv.reference_id === event.data.id
        );
        
        if (!hasConv) {
          await base44.entities.ChatConversation.create({
            participants,
            name: `Booking: ${event.data.experience_title || 'Service'}`,
            type: 'booking',
            reference_id: event.data.id,
            unread_count: {}
          });
          
          queryClient.invalidateQueries(['conversations']);
        }
      }
    });

    // Subscribe to marketplace orders
    const orderUnsub = base44.entities.Order.subscribe(async (event) => {
      if (event.type === 'create' && 
          (event.data.buyer_email === currentUser.email || event.data.seller_email === currentUser.email)) {
        
        const participants = [event.data.buyer_email, event.data.seller_email].filter(Boolean);
        
        const existing = await base44.entities.ChatConversation.list();
        const hasConv = existing.some(conv => 
          conv.type === 'order' &&
          conv.reference_id === event.data.id
        );
        
        if (!hasConv) {
          await base44.entities.ChatConversation.create({
            participants,
            name: `Order: ${event.data.items?.[0]?.name || 'Item'}`,
            type: 'order',
            reference_id: event.data.id,
            unread_count: {}
          });
          
          queryClient.invalidateQueries(['conversations']);
        }
      }
    });

    // Subscribe to content purchases
    const purchaseUnsub = base44.entities.ContentPurchase.subscribe(async (event) => {
      if (event.type === 'create' && 
          (event.data.buyer_email === currentUser.email || event.data.creator_email === currentUser.email)) {
        
        const participants = [event.data.buyer_email, event.data.creator_email].filter(Boolean);
        
        const existing = await base44.entities.ChatConversation.list();
        const hasConv = existing.some(conv => 
          conv.reference_id === event.data.content_id &&
          conv.participants.includes(event.data.buyer_email)
        );
        
        if (!hasConv) {
          await base44.entities.ChatConversation.create({
            participants,
            name: `Content Discussion`,
            type: 'general',
            reference_id: event.data.content_id,
            unread_count: {}
          });
          
          queryClient.invalidateQueries(['conversations']);
        }
      }
    });

    return () => {
      bookingUnsub();
      orderUnsub();
      purchaseUnsub();
    };
  }, [currentUser]);

  return null;
}