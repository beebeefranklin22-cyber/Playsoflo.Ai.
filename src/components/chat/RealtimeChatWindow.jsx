import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Phone, Video, MoreVertical, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';
import OnlineStatusBadge from './OnlineStatusBadge';

export default function RealtimeChatWindow({ conversation, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;

    // Load initial messages
    loadMessages();

    // Subscribe to real-time updates
    unsubscribeRef.current = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data.conversation_id === conversation.id) {
        if (event.type === 'create') {
          setMessages(prev => [...prev, event.data]);
          scrollToBottom();
          
          // Mark as read if not sent by current user
          if (event.data.sender_email !== currentUser.email) {
            markAsRead(event.data.id);
          }
        } else if (event.type === 'update') {
          setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        } else if (event.type === 'delete') {
          setMessages(prev => prev.filter(m => m.id !== event.id));
        }
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [conversation?.id]);

  const loadMessages = async () => {
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: conversation.id },
        'created_date',
        100
      );
      setMessages(msgs);
      scrollToBottom();
      
      // Mark all as read
      msgs.forEach(msg => {
        if (msg.sender_email !== currentUser.email && !msg.read_by.includes(currentUser.email)) {
          markAsRead(msg.id);
        }
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      const readBy = [...new Set([...message.read_by, currentUser.email])];
      await base44.entities.ChatMessage.update(messageId, { read_by: readBy });
      
      // Update conversation unread count
      const unreadCount = conversation.unread_count || {};
      unreadCount[currentUser.email] = Math.max(0, (unreadCount[currentUser.email] || 0) - 1);
      await base44.entities.ChatConversation.update(conversation.id, { unread_count: unreadCount });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Optimistic update
    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: conversation.id,
      sender_email: currentUser.email,
      content: messageContent,
      message_type: 'text',
      read_by: [currentUser.email],
      delivered_to: [currentUser.email],
      created_date: new Date().toISOString(),
      _optimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const messageData = {
        conversation_id: conversation.id,
        sender_email: currentUser.email,
        content: messageContent,
        message_type: 'text',
        read_by: [currentUser.email],
        delivered_to: [currentUser.email]
      };

      const createdMessage = await base44.entities.ChatMessage.create(messageData);
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? createdMessage : m));
      
      // Update conversation's last message
      await base44.entities.ChatConversation.update(conversation.id, {
        last_message: messageContent.substring(0, 100),
        last_message_time: new Date().toISOString(),
        last_message_sender: currentUser.email
      });
      
      // Send notification to other participants
      const otherParticipants = conversation.participants.filter(p => p !== currentUser.email);
      const notificationPromises = otherParticipants.map(participant =>
        base44.entities.Notification.create({
          recipient_email: participant,
          type: 'new_message',
          title: 'New Message',
          message: `${currentUser.full_name}: ${messageContent.substring(0, 50)}`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          reference_type: 'message',
          reference_id: conversation.id,
          action_url: `/messages?conversation=${conversation.id}`
        }).catch(err => console.error('Notification error:', err))
      );
      await Promise.all(notificationPromises);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const getOtherParticipant = () => {
    return conversation.participants.find(p => p !== currentUser.email);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!conversation) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-effect border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden text-gray-400 hover:text-white">
            ←
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {conversation.is_group ? <Users className="w-5 h-5" /> : getOtherParticipant()?.[0]?.toUpperCase()}
            </div>
            {!conversation.is_group && <OnlineStatusBadge email={getOtherParticipant()} />}
          </div>
          <div>
            <h3 className="text-white font-semibold">
              {conversation.name || (conversation.is_group ? 'Group Chat' : getOtherParticipant())}
            </h3>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMine = message.sender_email === currentUser.email;
          return (
            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMine ? 'order-2' : ''}`}>
                <div className={`rounded-2xl px-4 py-2 ${
                  isMine 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'glass-effect text-white'
                }`}>
                  {conversation.is_group && !isMine && (
                    <p className="text-xs text-gray-300 mb-1">{message.sender_email}</p>
                  )}
                  <p className="break-words">{message.content}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 px-2">
                  <span className="text-xs text-gray-400">{formatTime(message.created_date)}</span>
                  {isMine && message.read_by.length > 1 && (
                    <span className="text-xs text-blue-400">Read</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="glass-effect border-t border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder-gray-400"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}