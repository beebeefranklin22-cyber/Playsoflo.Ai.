import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RealtimeChatWindow from '@/components/chat/RealtimeChatWindow';

/**
 * BookingChatModal — opens or creates a conversation between the current user
 * and a provider/driver for a specific booking context (ride, delivery, rental).
 *
 * Props:
 *  - currentUser     : authenticated user object
 *  - providerEmail   : the other party's email
 *  - providerName    : display name for the other party
 *  - contextType     : 'ride' | 'delivery' | 'rental'
 *  - contextId       : the booking / order / rental ID
 *  - onClose         : callback to close the modal
 */
export default function BookingChatModal({ currentUser, providerEmail, providerName, contextType, contextId, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initConversation();
  }, [contextId]);

  const initConversation = async () => {
    setLoading(true);
    try {
      // Look for an existing conversation linked to this booking
      const existing = await base44.entities.ChatConversation.filter({
        context_type: contextType,
        context_id: contextId
      });

      if (existing.length > 0) {
        setConversation(existing[0]);
      } else {
        // Create a new conversation
        const conv = await base44.entities.ChatConversation.create({
          participants: [currentUser.email, providerEmail],
          name: `${contextType === 'ride' ? 'Ride' : contextType === 'delivery' ? 'Delivery' : 'Rental'} Chat`,
          is_group: false,
          context_type: contextType,
          context_id: contextId,
          unread_count: {},
          last_message: '',
          last_message_time: new Date().toISOString()
        });

        // Link conversation to the booking entity
        if (contextType === 'delivery') {
          await base44.entities.DeliveryOrder.update(contextId, { conversation_id: conv.id });
        } else if (contextType === 'ride') {
          await base44.entities.RideRequest.update(contextId, { conversation_id: conv.id });
        } else if (contextType === 'rental') {
          await base44.entities.CarRental.update(contextId, { conversation_id: conv.id });
        }

        setConversation(conv);
      }
    } catch (error) {
      console.error('Failed to init conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full md:w-[480px] h-[70vh] md:h-[600px] bg-gray-900 border border-white/10 rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">Chat with {providerName || providerEmail}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : (
              <RealtimeChatWindow
                conversation={conversation}
                currentUser={currentUser}
                onBack={onClose}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}