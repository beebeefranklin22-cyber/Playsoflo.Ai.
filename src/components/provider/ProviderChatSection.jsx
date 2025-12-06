import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User, Clock, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ProviderChatSection({ currentUser }) {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");

  // Fetch all messages where user is recipient or sender
  const { data: allMessages = [] } = useQuery({
    queryKey: ['provider-messages', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.DirectMessage.filter({
        $or: [
          { sender_email: currentUser.email },
          { recipient_email: currentUser.email }
        ]
      }, '-created_date');
    },
    enabled: !!currentUser,
    refetchInterval: 5000 // Real-time polling every 5 seconds
  });

  // Group messages by conversation
  const conversations = {};
  allMessages.forEach(msg => {
    const otherUser = msg.sender_email === currentUser.email 
      ? msg.recipient_email 
      : msg.sender_email;
    
    if (!conversations[msg.conversation_id]) {
      conversations[msg.conversation_id] = {
        id: msg.conversation_id,
        otherUserEmail: otherUser,
        otherUserName: msg.sender_email === currentUser.email ? msg.recipient_email : msg.sender_name,
        messages: [],
        unreadCount: 0,
        lastMessage: null
      };
    }
    
    conversations[msg.conversation_id].messages.push(msg);
    
    // Count unread messages
    if (msg.recipient_email === currentUser.email && !msg.read) {
      conversations[msg.conversation_id].unreadCount++;
    }
    
    // Track last message
    if (!conversations[msg.conversation_id].lastMessage || 
        new Date(msg.created_date) > new Date(conversations[msg.conversation_id].lastMessage.created_date)) {
      conversations[msg.conversation_id].lastMessage = msg;
    }
  });

  const conversationList = Object.values(conversations).sort((a, b) => 
    new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
  );

  const selectedMessages = selectedConversation 
    ? conversations[selectedConversation]?.messages.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      ) || []
    : [];

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedConversation) {
      const unreadMessages = selectedMessages.filter(
        msg => msg.recipient_email === currentUser.email && !msg.read
      );
      
      unreadMessages.forEach(async (msg) => {
        await base44.entities.DirectMessage.update(msg.id, { 
          read: true, 
          read_at: new Date().toISOString() 
        });
      });
      
      if (unreadMessages.length > 0) {
        queryClient.invalidateQueries(['provider-messages']);
      }
    }
  }, [selectedConversation, selectedMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const newMessage = await base44.entities.DirectMessage.create(messageData);
      
      // Send notification to recipient
      await base44.entities.Notification.create({
        recipient_email: messageData.recipient_email,
        type: 'new_message',
        title: 'New Message',
        message: `${currentUser.full_name} sent you a message`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo
      });
      
      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-messages']);
      setMessageText("");
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    const conversation = conversations[selectedConversation];
    
    sendMessageMutation.mutate({
      conversation_id: selectedConversation,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      sender_photo: currentUser.profile_photo,
      recipient_email: conversation.otherUserEmail,
      content: messageText
    });
  };

  const totalUnread = conversationList.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <div className="grid md:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <Card className="bg-white/5 border-white/10 md:col-span-1">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">Conversations</h3>
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white">{totalUnread}</Badge>
            )}
          </div>

          <div className="space-y-2 overflow-y-auto h-[500px]">
            {conversationList.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No messages yet</p>
              </div>
            ) : (
              conversationList.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedConversation === conv.id
                      ? 'bg-purple-600/30 border-purple-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  } border border-white/10`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {conv.otherUserName?.[0] || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {conv.otherUserName || conv.otherUserEmail}
                        </p>
                      </div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">{conv.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs truncate">
                    {conv.lastMessage?.content}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(conv.lastMessage?.created_date).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="bg-white/5 border-white/10 md:col-span-2">
        <CardContent className="p-4 flex flex-col h-full">
          {!selectedConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {conversations[selectedConversation]?.otherUserName?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-white font-bold">
                      {conversations[selectedConversation]?.otherUserName || conversations[selectedConversation]?.otherUserEmail}
                    </p>
                    <p className="text-gray-400 text-xs">Customer</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                <AnimatePresence>
                  {selectedMessages.map((msg) => {
                    const isMe = msg.sender_email === currentUser.email;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMe ? 'bg-purple-600' : 'bg-white/10'} rounded-2xl px-4 py-2`}>
                          <p className="text-white text-sm">{msg.content}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs opacity-70 text-white">
                              {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isMe && msg.read && (
                              <CheckCheck className="w-3 h-3 text-blue-300" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}