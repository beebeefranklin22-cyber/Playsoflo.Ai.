import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Send, Phone, Video, MoreVertical,
  Plus, Search, Image as ImageIcon, Paperclip,
  Smile, Check, CheckCheck, ArrowLeft, Users,
  X, Camera, Mic, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VideoCallModal from "../components/VideoCallModal";
import { toast } from "sonner";

export default function Messages() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.ChatConversation.list('-last_message_time'),
    initialData: [],
    refetchInterval: 3000 // Poll every 3 seconds for new messages
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const msgs = await base44.entities.ChatMessage.filter({
        conversation_id: selectedConversation.id
      });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!selectedConversation,
    initialData: [],
    refetchInterval: 2000 // Poll for new messages
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const message = await base44.entities.ChatMessage.create(data);
      
      // Update conversation
      await base44.entities.ChatConversation.update(selectedConversation.id, {
        last_message: data.content,
        last_message_time: new Date().toISOString(),
        last_message_sender: currentUser.email
      });

      // Send notifications to other participants
      const otherParticipants = selectedConversation.participants.filter(
        p => p !== currentUser.email
      );
      
      const notificationPromises = otherParticipants.map(recipient => 
        base44.entities.Notification.create({
          recipient_email: recipient,
          type: "chat_message",
          title: `New message from ${currentUser.full_name || currentUser.email}`,
          message: data.content.substring(0, 100),
          reference_type: "conversation",
          reference_id: selectedConversation.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        })
      );
      
      await Promise.all(notificationPromises);

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageInput("");
      scrollToBottom();
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async (participantEmail) => {
      // Check if conversation already exists
      const existing = conversations.find(conv => 
        conv.participants.length === 2 &&
        conv.participants.includes(currentUser.email) &&
        conv.participants.includes(participantEmail)
      );

      if (existing) return existing;

      return await base44.entities.ChatConversation.create({
        participants: [currentUser.email, participantEmail],
        name: participantEmail,
        unread_count: {}
      });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(conversation);
      setShowNewChat(false);
    }
  });

  const createGroupChatMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.ChatConversation.create({
        participants: [currentUser.email, ...selectedParticipants],
        name: groupName,
        is_group: true,
        unread_count: {}
      });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(conversation);
      setShowGroupChat(false);
      setGroupName("");
      setSelectedParticipants([]);
      toast.success('Group chat created!');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const readBy = message.read_by || [];
      if (!readBy.includes(currentUser.email)) {
        await base44.entities.ChatMessage.update(messageId, {
          read_by: [...readBy, currentUser.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      conversation_id: selectedConversation.id,
      sender_email: currentUser.email,
      content: messageInput,
      message_type: "text"
    });
  };

  const handleFileUpload = async (file) => {
    if (!file || !selectedConversation) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const messageType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'file';

    sendMessageMutation.mutate({
      conversation_id: selectedConversation.id,
      sender_email: currentUser.email,
      content: file.name,
      message_type: messageType,
      file_url
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Mark messages as read when viewing conversation
    if (selectedConversation && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_email !== currentUser?.email) {
        markAsReadMutation.mutate(lastMessage.id);
      }
    }
  }, [messages, selectedConversation]);

  // Typing indicator simulation
  useEffect(() => {
    let timeout;
    if (messageInput) {
      setIsTyping(true);
      timeout = setTimeout(() => setIsTyping(false), 1000);
    }
    return () => clearTimeout(timeout);
  }, [messageInput]);

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUsers = allUsers.filter(user =>
    user.email !== currentUser?.email &&
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-screen flex pb-20">
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-white/10 flex flex-col bg-gray-900/50`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-purple-400" />
              Messages
            </h1>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowNewChat(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowGroupChat(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => {
            const otherParticipant = conv.participants.find(p => p !== currentUser?.email);
            const isUnread = conv.last_message_sender !== currentUser?.email;
            
            return (
              <motion.div
                key={conv.id}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 cursor-pointer border-b border-white/5 ${
                  selectedConversation?.id === conv.id ? 'bg-purple-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {conv.is_group ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        otherParticipant?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {conv.is_group ? conv.name : otherParticipant}
                      </h3>
                      {conv.last_message_time && (
                        <span className="text-xs text-gray-500">
                          {new Date(conv.last_message_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${isUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {conv.last_message || "No messages yet"}
                      </p>
                      {isUnread && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No conversations yet</p>
              <Button
                onClick={() => setShowNewChat(true)}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                Start a conversation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'block' : 'hidden md:block'} flex-1 flex flex-col bg-gray-950/50`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-gray-900/50 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setSelectedConversation(null)}
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>

                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedConversation.is_group ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      selectedConversation.participants.find(p => p !== currentUser?.email)?.[0]?.toUpperCase()
                    )}
                  </div>

                  <div>
                    <h2 className="text-white font-semibold">
                      {selectedConversation.is_group 
                        ? selectedConversation.name 
                        : selectedConversation.participants.find(p => p !== currentUser?.email)}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {isTyping ? "typing..." : "Active now"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowVideoCall(true)}
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:bg-purple-500/20"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:bg-white/10"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:bg-white/10"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages.map((message, idx) => {
                  const isOwn = message.sender_email === currentUser?.email;
                  const showAvatar = idx === 0 || messages[idx - 1].sender_email !== message.sender_email;
                  const isRead = message.read_by?.includes(
                    selectedConversation.participants.find(p => p !== currentUser?.email)
                  );

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
                    >
                      {!isOwn && showAvatar && (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {message.sender_email[0].toUpperCase()}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-8" />}

                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwn && selectedConversation.is_group && (
                          <p className="text-xs text-gray-500 mb-1 px-2">{message.sender_email}</p>
                        )}
                        {message.message_type === 'image' && (
                          <img
                            src={message.file_url}
                            alt="Shared image"
                            className="rounded-xl max-w-full mb-1"
                          />
                        )}

                        {message.message_type === 'video' && (
                          <video
                            src={message.file_url}
                            controls
                            className="rounded-xl max-w-full mb-1"
                          />
                        )}

                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>

                        <div className="flex items-center gap-1 mt-1 px-2">
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {isOwn && (
                            isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-500" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 bg-gray-900/50 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById('file-upload').click()}
                  className="text-purple-400 hover:bg-purple-500/20"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById('file-upload').click()}
                  className="text-purple-400 hover:bg-purple-500/20"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>

                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-white/10 border-white/20 text-white"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:bg-white/10"
                >
                  <Smile className="w-5 h-5" />
                </Button>

                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose from existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">New Message</h3>
                <button onClick={() => setShowNewChat(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4 bg-white/10 border-white/20 text-white"
              />

              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => createConversationMutation.mutate(user.email)}
                    className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{user.full_name || user.email}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                    {user.is_creator && (
                      <Badge className="bg-purple-500/20 text-purple-400">Creator</Badge>
                    )}
                    {user.is_provider && (
                      <Badge className="bg-blue-500/20 text-blue-400">Provider</Badge>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Chat Modal */}
      <AnimatePresence>
        {showGroupChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowGroupChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  Create Group Chat
                </h3>
                <button onClick={() => setShowGroupChat(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">Group Name</label>
                <Input
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">
                  Add Participants ({selectedParticipants.length} selected)
                </label>
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {selectedParticipants.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedParticipants.map((email) => {
                    const user = allUsers.find(u => u.email === email);
                    return (
                      <Badge key={email} className="bg-blue-600 flex items-center gap-1">
                        {user?.full_name || email}
                        <button
                          onClick={() => setSelectedParticipants(prev => prev.filter(e => e !== email))}
                          className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {filteredUsers.map((user) => {
                  const isSelected = selectedParticipants.includes(user.email);
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedParticipants(prev => prev.filter(e => e !== user.email));
                        } else {
                          setSelectedParticipants(prev => [...prev, user.email]);
                        }
                      }}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition ${
                        isSelected ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{user.full_name || user.email}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-white" />}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() => createGroupChatMutation.mutate()}
                disabled={!groupName.trim() || selectedParticipants.length < 2 || createGroupChatMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Create Group ({selectedParticipants.length + 1} members)
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Call Modal */}
      {showVideoCall && selectedConversation && (
        <VideoCallModal
          conversation={selectedConversation}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </div>
  );
}