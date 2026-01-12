import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Send, Phone, Video, MoreVertical,
  Plus, Search, Image as ImageIcon, Paperclip,
  Smile, Check, CheckCheck, ArrowLeft, Users,
  X, Camera, Mic, MapPin, Edit2, Trash2, FileText,
  Download, Lock, Pin, BellOff, Reply, Forward
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VideoCallModal from "../components/VideoCallModal";
import MessageReactions from "../components/chat/MessageReactions";
import { MessageEncryption } from "../components/chat/MessageEncryption";
import { toast } from "sonner";

export default function Messages() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
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
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Handle URL params for direct conversation
  useEffect(() => {
    const userParam = searchParams.get("user");
    const convParam = searchParams.get("conv");
    
    if (convParam && conversations.length > 0) {
      const conv = conversations.find(c => c.id === convParam);
      if (conv) setSelectedConversation(conv);
    } else if (userParam && currentUser && conversations.length > 0) {
      const conv = conversations.find(c => 
        !c.is_group && c.participants.includes(userParam) && c.participants.includes(currentUser.email)
      );
      if (conv) {
        setSelectedConversation(conv);
      } else {
        createConversationMutation.mutate(userParam);
      }
    }
  }, [searchParams, conversations, currentUser]);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allConvs = await base44.entities.ChatConversation.list('-last_message_time');
      return allConvs.filter(conv => conv.participants.includes(currentUser.email));
    },
    enabled: !!currentUser,
    initialData: [],
    refetchInterval: 2000
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
    refetchInterval: 1000 // Real-time updates - poll every second
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: presenceData = [] } = useQuery({
    queryKey: ['user-presence'],
    queryFn: () => base44.entities.UserPresence.list('-last_seen'),
    refetchInterval: 5000,
    initialData: []
  });

  // Initialize encryption for current conversation
  useEffect(() => {
    if (selectedConversation && !selectedConversation.is_group && encryptionEnabled && !encryptionKey) {
      MessageEncryption.generateKey().then(setEncryptionKey);
    }
  }, [selectedConversation, encryptionEnabled]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      let messageData = { ...data };

      // Encrypt if enabled and key exists
      if (encryptionEnabled && encryptionKey && !selectedConversation.is_group) {
        const encrypted = await MessageEncryption.encrypt(data.content, encryptionKey);
        messageData = {
          ...data,
          content: encrypted.ciphertext,
          is_encrypted: true,
          encryption_iv: encrypted.iv
        };
      }

      const message = await base44.entities.ChatMessage.create(messageData);
      
      // Update conversation
      await base44.entities.ChatConversation.update(selectedConversation.id, {
        last_message: encryptionEnabled ? "🔒 Encrypted message" : 
                     (data.message_type === 'image' ? "📷 Photo" :
                      data.message_type === 'video' ? "🎥 Video" :
                      data.message_type === 'audio' ? "🎵 Audio" :
                      data.message_type === 'file' ? "📎 File" :
                      data.content.substring(0, 50)),
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
          type: "new_message",
          title: `${currentUser.full_name || currentUser.email}`,
          message: encryptionEnabled ? "🔒 Encrypted message" : 
                   (data.message_type === 'image' ? "Sent a photo" :
                    data.message_type === 'video' ? "Sent a video" :
                    data.message_type === 'audio' ? "Sent an audio" :
                    data.message_type === 'file' ? "Sent a file" :
                    data.content),
          reference_type: "direct_message",
          reference_id: selectedConversation.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo,
          action_url: `/messages?conv=${selectedConversation.id}`,
          read: false
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

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, newContent }) => {
      return await base44.entities.ChatMessage.update(messageId, {
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setEditingMessage(null);
      setEditContent("");
      toast.success('Message updated');
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      return await base44.entities.ChatMessage.update(messageId, {
        content: "This message was deleted",
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted');
    }
  });

  const reactToMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = message.reactions || {};
      const userReactions = reactions[emoji] || [];
      
      const hasReacted = userReactions.includes(currentUser.email);
      const updatedReactions = {
        ...reactions,
        [emoji]: hasReacted
          ? userReactions.filter(email => email !== currentUser.email)
          : [...userReactions, currentUser.email]
      };

      return await base44.entities.ChatMessage.update(messageId, {
        reactions: updatedReactions
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async (participantEmail) => {
      // Check if conversation already exists
      const allConvs = await base44.entities.ChatConversation.list();
      const existing = allConvs.find(conv => 
        !conv.is_group &&
        conv.participants.length === 2 &&
        conv.participants.includes(currentUser.email) &&
        conv.participants.includes(participantEmail)
      );

      if (existing) return existing;

      const participant = allUsers.find(u => u.email === participantEmail);
      return await base44.entities.ChatConversation.create({
        participants: [currentUser.email, participantEmail],
        name: participant?.full_name || participantEmail,
        is_group: false,
        type: "general",
        unread_count: {}
      });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(conversation);
      setShowNewChat(false);
      setSearchQuery("");
    }
  });

  const createGroupChatMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.ChatConversation.create({
        participants: [currentUser.email, ...selectedParticipants],
        name: groupName,
        is_group: true,
        type: "general",
        unread_count: {}
      });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(conversation);
      setShowGroupChat(false);
      setGroupName("");
      setSelectedParticipants([]);
      setSearchQuery("");
      toast.success('Group chat created!');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = messages.find(m => m.id === messageId);
      if (!message || message.sender_email === currentUser.email) return;

      const readBy = message.read_by || [];
      const deliveredTo = message.delivered_to || [];
      
      if (!readBy.includes(currentUser.email)) {
        await base44.entities.ChatMessage.update(messageId, {
          read_by: [...readBy, currentUser.email],
          delivered_to: deliveredTo.includes(currentUser.email) ? deliveredTo : [...deliveredTo, currentUser.email]
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
      message_type: "text",
      ...(replyingTo && { reply_to_message_id: replyingTo.id })
    });
    
    setReplyingTo(null);
  };

  const handlePinConversation = async (conv) => {
    const isPinned = conv.pinned_by?.includes(currentUser.email);
    const newPinnedBy = isPinned
      ? (conv.pinned_by || []).filter(email => email !== currentUser.email)
      : [...(conv.pinned_by || []), currentUser.email];
    
    await base44.entities.ChatConversation.update(conv.id, {
      pinned_by: newPinnedBy
    });
    
    queryClient.invalidateQueries(['conversations']);
    toast.success(isPinned ? "Conversation unpinned" : "Conversation pinned");
  };

  const handleMuteConversation = async (conv) => {
    const isMuted = conv.muted_by?.includes(currentUser.email);
    const newMutedBy = isMuted
      ? (conv.muted_by || []).filter(email => email !== currentUser.email)
      : [...(conv.muted_by || []), currentUser.email];
    
    await base44.entities.ChatConversation.update(conv.id, {
      muted_by: newMutedBy
    });
    
    queryClient.invalidateQueries(['conversations']);
    toast.success(isMuted ? "Conversation unmuted" : "Conversation muted");
  };

  const handleFileUpload = async (file) => {
    if (!file || !selectedConversation) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File too large. Max size is 50MB');
      return;
    }

    toast.info('Uploading file...');
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const messageType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' :
                         file.type.startsWith('audio/') ? 'audio' : 'file';

      sendMessageMutation.mutate({
        conversation_id: selectedConversation.id,
        sender_email: currentUser.email,
        content: file.name,
        message_type: messageType,
        file_url,
        file_name: file.name,
        file_size: file.size,
        file_mime_type: file.type
      });
      
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const getUserPresence = (email) => {
    const presence = presenceData.find(p => p.user_email === email);
    if (!presence) return 'offline';
    
    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / (1000 * 60);
    
    if (diffMinutes < 2) return 'online';
    if (diffMinutes < 10) return 'away';
    return 'offline';
  };

  const isUserTyping = (email) => {
    const presence = presenceData.find(p => p.user_email === email);
    if (!presence || !presence.typing_to) return false;
    
    const typingTo = presence.typing_to;
    const shouldShowTyping = selectedConversation?.participants.includes(email) && 
                            typingTo === currentUser?.email;
    
    if (!shouldShowTyping) return false;
    
    const typingStarted = new Date(presence.typing_started);
    const now = new Date();
    const diffSeconds = (now - typingStarted) / 1000;
    
    return diffSeconds < 5;
  };

  // Update typing status
  useEffect(() => {
    if (!currentUser || !selectedConversation) return;
    
    const updateTypingStatus = async () => {
      const otherParticipant = selectedConversation.participants.find(p => p !== currentUser.email);
      if (!otherParticipant) return;

      const presence = presenceData.find(p => p.user_email === currentUser.email);
      
      if (messageInput.trim()) {
        if (presence) {
          await base44.entities.UserPresence.update(presence.id, {
            typing_to: otherParticipant,
            typing_started: new Date().toISOString(),
            status: 'online',
            last_seen: new Date().toISOString()
          });
        } else {
          await base44.entities.UserPresence.create({
            user_email: currentUser.email,
            user_name: currentUser.full_name,
            user_photo: currentUser.profile_photo,
            typing_to: otherParticipant,
            typing_started: new Date().toISOString(),
            status: 'online',
            last_seen: new Date().toISOString()
          });
        }
      } else if (presence?.typing_to) {
        await base44.entities.UserPresence.update(presence.id, {
          typing_to: null,
          typing_started: null
        });
      }
    };

    const timeout = setTimeout(updateTypingStatus, 500);
    return () => clearTimeout(timeout);
  }, [messageInput, selectedConversation, currentUser]);

  // Decrypt messages
  const decryptMessage = async (message) => {
    if (!message.is_encrypted || !encryptionKey) return message.content;
    
    try {
      return await MessageEncryption.decrypt(
        { ciphertext: message.content, iv: message.encryption_iv },
        encryptionKey
      );
    } catch (error) {
      return "🔒 Unable to decrypt message";
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Mark all unread messages as read when viewing conversation
    if (selectedConversation && messages.length > 0 && currentUser) {
      const unreadMessages = messages.filter(msg => 
        msg.sender_email !== currentUser.email && 
        !msg.read_by?.includes(currentUser.email)
      );
      
      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id);
      });
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

  const filteredConversations = conversations
    .filter(conv =>
      conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      // Sort pinned first
      const aPinned = a.pinned_by?.includes(currentUser?.email);
      const bPinned = b.pinned_by?.includes(currentUser?.email);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Then by last message time
      const aTime = new Date(a.last_message_time || 0);
      const bTime = new Date(b.last_message_time || 0);
      return bTime - aTime;
    });

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
                className={`p-4 cursor-pointer border-b border-white/5 relative group ${
                  selectedConversation?.id === conv.id ? 'bg-purple-500/20' : ''
                }`}
              >
                <div onClick={() => setSelectedConversation(conv)} className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {conv.group_photo ? (
                      <img src={conv.group_photo} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {conv.is_group ? (
                          <Users className="w-6 h-6" />
                        ) : (
                          otherParticipant?.[0]?.toUpperCase() || "U"
                        )}
                      </div>
                    )}
                    {!conv.is_group && (() => {
                      const status = getUserPresence(otherParticipant);
                      return (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                          status === 'online' ? 'bg-green-500' :
                          status === 'away' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`} />
                      );
                    })()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {conv.pinned_by?.includes(currentUser?.email) && (
                          <Pin className="w-3 h-3 text-purple-400" />
                        )}
                        <h3 className={`font-semibold truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                          {conv.is_group ? conv.name : otherParticipant}
                        </h3>
                        {conv.muted_by?.includes(currentUser?.email) && (
                          <BellOff className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
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
                      <p className={`text-sm truncate flex-1 ${isUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {conv.last_message || "No messages yet"}
                      </p>
                      {isUnread && !conv.muted_by?.includes(currentUser?.email) && (
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold ml-2">
                          {(conv.unread_count?.[currentUser?.email] || 1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Quick actions on hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinConversation(conv);
                    }}
                    className="p-2 hover:bg-white/20 rounded-full"
                    title="Pin"
                  >
                    <Pin className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuteConversation(conv);
                    }}
                    className="p-2 hover:bg-white/20 rounded-full"
                    title="Mute"
                  >
                    <BellOff className="w-4 h-4 text-gray-400" />
                  </button>
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
                    <h2 className="text-white font-semibold flex items-center gap-2">
                      {selectedConversation.is_group 
                        ? selectedConversation.name 
                        : selectedConversation.participants.find(p => p !== currentUser?.email)}
                      {encryptionEnabled && !selectedConversation.is_group && (
                        <Lock className="w-4 h-4 text-green-400" title="End-to-end encrypted" />
                      )}
                    </h2>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      {!selectedConversation.is_group && (() => {
                        const otherUser = selectedConversation.participants.find(p => p !== currentUser?.email);
                        const status = getUserPresence(otherUser);
                        const typing = isUserTyping(otherUser);
                        
                        if (typing) return "typing...";
                        
                        return (
                          <>
                            <span className={`w-2 h-2 rounded-full ${
                              status === 'online' ? 'bg-green-500' :
                              status === 'away' ? 'bg-yellow-500' :
                              'bg-gray-500'
                            }`} />
                            {status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'}
                          </>
                        );
                      })()}
                      {selectedConversation.is_group && 'Group chat'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedConversation.is_group && (
                    <Button
                      onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                      variant="ghost"
                      size="sm"
                      className={encryptionEnabled ? "text-green-400 hover:bg-green-500/20" : "text-gray-400 hover:bg-white/10"}
                      title="Toggle encryption"
                    >
                      <Lock className="w-5 h-5" />
                    </Button>
                  )}
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
                  const otherParticipants = selectedConversation.participants.filter(p => p !== currentUser?.email);
                  const isRead = otherParticipants.some(participant => 
                    message.read_by?.includes(participant)
                  );
                  const readCount = otherParticipants.filter(participant => 
                    message.read_by?.includes(participant)
                  ).length;

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

                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col group`}>
                        {!isOwn && selectedConversation.is_group && (
                          <p className="text-xs text-gray-500 mb-1 px-2">{message.sender_email}</p>
                        )}

                        {message.reply_to_message_id && (
                          <div className="mb-1 p-2 bg-black/20 rounded-lg border-l-2 border-purple-500">
                            <p className="text-xs text-gray-400">
                              {messages.find(m => m.id === message.reply_to_message_id)?.content || "Original message"}
                            </p>
                          </div>
                        )}

                        {message.message_type === 'image' && !message.is_deleted && (
                          <img
                            src={message.file_url}
                            alt="Shared image"
                            className="rounded-xl max-w-full mb-1 cursor-pointer"
                            onClick={() => window.open(message.file_url, '_blank')}
                          />
                        )}

                        {message.message_type === 'video' && !message.is_deleted && (
                          <video
                            src={message.file_url}
                            controls
                            className="rounded-xl max-w-full mb-1"
                          />
                        )}

                        {message.message_type === 'audio' && !message.is_deleted && (
                          <audio src={message.file_url} controls className="mb-1" />
                        )}

                        {message.message_type === 'file' && !message.is_deleted && (
                          <a
                            href={message.file_url}
                            download={message.file_name}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl mb-1 ${
                              isOwn ? 'bg-purple-600' : 'bg-white/10'
                            } hover:opacity-80 transition`}
                          >
                            <FileText className="w-5 h-5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{message.file_name}</p>
                              <p className="text-xs opacity-70">
                                {(message.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        {editingMessage?.id === message.id ? (
                          <div className="w-full">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="bg-white/10 border-white/20 text-white mb-2"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  editMessageMutation.mutate({
                                    messageId: message.id,
                                    newContent: editContent
                                  });
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessage(null);
                                  setEditContent("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`px-4 py-2 rounded-2xl relative ${
                              isOwn
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-white'
                            } ${message.is_deleted ? 'italic opacity-60' : ''}`}
                          >
                            {message.is_encrypted && <Lock className="w-3 h-3 inline mr-1 text-green-400" />}
                            <p className="text-sm">{message.is_deleted ? message.content : message.content}</p>
                            {message.is_edited && !message.is_deleted && (
                              <span className="text-xs opacity-60 ml-2">(edited)</span>
                            )}
                            
                            {!message.is_deleted && (
                              <div className={`absolute ${isOwn ? 'top-1 right-1' : 'top-1 left-1'} opacity-0 group-hover:opacity-100 transition flex gap-1`}>
                                {isOwn && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingMessage(message);
                                        setEditContent(message.content);
                                      }}
                                      className="p-1 hover:bg-white/20 rounded"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteMessageMutation.mutate(message.id)}
                                      className="p-1 hover:bg-red-500/20 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setReplyingTo(message)}
                                  className="p-1 hover:bg-white/20 rounded"
                                  title="Reply"
                                >
                                  <Reply className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {!message.is_deleted && (
                          <MessageReactions
                            message={message}
                            currentUser={currentUser}
                            onReact={(messageId, emoji) => 
                              reactToMessageMutation.mutate({ messageId, emoji })
                            }
                          />
                        )}

                        <div className="flex items-center gap-1 mt-1 px-2">
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {isOwn && (
                            selectedConversation.is_group ? (
                              readCount > 0 ? (
                                <div className="flex items-center gap-0.5">
                                  <CheckCheck className="w-3 h-3 text-blue-400" />
                                  <span className="text-xs text-blue-400">{readCount}</span>
                                </div>
                              ) : (
                                <Check className="w-3 h-3 text-gray-500" />
                              )
                            ) : (
                              isRead ? (
                                <CheckCheck className="w-3 h-3 text-blue-400" title="Read" />
                              ) : (
                                <Check className="w-3 h-3 text-gray-500" title="Sent" />
                              )
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
              {replyingTo && (
                <div className="mb-2 p-3 bg-white/5 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Replying to</p>
                    <p className="text-sm text-white truncate">{replyingTo.content}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                  onChange={(e) => {
                    handleFileUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-purple-400 hover:bg-purple-500/20"
                  title="Attach file (up to 50MB)"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current?.click();
                  }}
                  className="text-purple-400 hover:bg-purple-500/20"
                  title="Send image"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current?.click();
                  }}
                  className="text-purple-400 hover:bg-purple-500/20"
                  title="Send video"
                >
                  <Camera className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fileInputRef.current.accept = 'audio/*';
                    fileInputRef.current?.click();
                  }}
                  className="text-purple-400 hover:bg-purple-500/20"
                  title="Send audio"
                >
                  <Mic className="w-5 h-5" />
                </Button>

                <Input
                  placeholder={encryptionEnabled ? "🔒 Type an encrypted message..." : "Type a message..."}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-white/10 border-white/20 text-white"
                />

                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
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
                    onClick={() => {
                      createConversationMutation.mutate(user.email);
                    }}
                    disabled={createConversationMutation.isPending}
                    className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
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