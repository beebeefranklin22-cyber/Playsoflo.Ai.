import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, Plus, Pin, Eye, Edit2, Trash2, ChevronLeft,
  Send, Lock, ThumbsUp, User, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CommunityForums() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingThread, setEditingThread] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentGroup, setCurrentGroup] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    video_url: ""
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['forum-threads', filterCategory, groupId],
    queryFn: async () => {
      let all = await base44.entities.ForumThread.list('-created_date');
      
      if (groupId) {
        all = all.filter(t => t.group_id === groupId);
      }
      
      if (filterCategory !== 'all') all = all.filter(t => t.category === filterCategory);
      
      return all.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });
    },
    initialData: []
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['forum-replies', selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return [];
      return await base44.entities.ForumReply.filter({
        thread_id: selectedThread.id
      });
    },
    enabled: !!selectedThread,
    initialData: []
  });

  useEffect(() => {
    const threadId = searchParams.get("thread");
    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) setSelectedThread(thread);
    }
  }, [searchParams, threads]);

  useEffect(() => {
    const fetchGroup = async () => {
      if (groupId) {
        const group = await base44.entities.ForumGroup.list();
        const found = group.find(g => g.id === groupId);
        setCurrentGroup(found);
      } else {
        setCurrentGroup(null);
      }
    };
    fetchGroup();
  }, [groupId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const thread = await base44.entities.ForumThread.create({
        ...data,
        group_id: groupId || null,
        group_name: currentGroup?.name || null,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        author_photo: currentUser.profile_picture
      });

      // Update group thread count
      if (groupId && currentGroup) {
        await base44.entities.ForumGroup.update(groupId, {
          thread_count: (currentGroup.thread_count || 0) + 1
        });
      }

      return thread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-threads']);
      queryClient.invalidateQueries(['forum-groups']);
      setShowCreateModal(false);
      setFormData({ title: "", content: "", category: "general", video_url: "" });
      toast.success('Thread created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ForumThread.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-threads']);
      setEditingThread(null);
      toast.success('Thread updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ForumThread.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-threads']);
      setSelectedThread(null);
      toast.success('Thread deleted!');
    }
  });

  const replyMutation = useMutation({
    mutationFn: async ({ threadId, content }) => {
      const reply = await base44.entities.ForumReply.create({
        thread_id: threadId,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        user_photo: currentUser.profile_picture,
        content
      });

      // Update thread reply count
      const thread = threads.find(t => t.id === threadId);
      await base44.entities.ForumThread.update(threadId, {
        reply_count: (thread.reply_count || 0) + 1,
        last_reply_at: new Date().toISOString(),
        last_reply_by: currentUser.email
      });

      // Notify thread author
      if (thread && thread.author_email !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: thread.author_email,
          type: 'new_comment',
          title: 'New reply on your thread',
          message: `${currentUser.full_name} replied to "${thread.title}"`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies']);
      queryClient.invalidateQueries(['forum-threads']);
      setReplyContent("");
      toast.success('Reply posted!');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (replyId) => {
      const reply = replies.find(r => r.id === replyId);
      const likes = reply.likes || [];
      const hasLiked = likes.includes(currentUser.email);
      
      return await base44.entities.ForumReply.update(replyId, {
        likes: hasLiked 
          ? likes.filter(email => email !== currentUser.email)
          : [...likes, currentUser.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingThread) {
      updateMutation.mutate({ id: editingThread.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (selectedThread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-950 pb-20">
        <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <button onClick={() => setSelectedThread(null)} className="p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{selectedThread.title}</h1>
              <p className="text-gray-400 text-sm">by {selectedThread.author_name}</p>
            </div>
            {currentUser?.email === selectedThread.author_email && (
              <button onClick={() => deleteMutation.mutate(selectedThread.id)} className="p-2 hover:bg-red-500/20 rounded-full">
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <img src={selectedThread.author_photo || "https://via.placeholder.com/40"} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="text-white font-semibold">{selectedThread.author_name}</p>
                  <p className="text-gray-400 text-sm">{new Date(selectedThread.created_date).toLocaleString()}</p>
                </div>
                {selectedThread.is_pinned && <Pin className="w-5 h-5 text-yellow-400 ml-auto" />}
              </div>
              <p className="text-gray-300 whitespace-pre-wrap">{selectedThread.content}</p>
              {selectedThread.video_url && (
                <video src={selectedThread.video_url} controls className="w-full rounded-lg mt-4" />
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">{replies.length} Replies</h3>
            {replies.map((reply) => (
              <Card key={reply.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={reply.user_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{reply.user_name}</p>
                      <p className="text-gray-400 text-xs">{new Date(reply.created_date).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => likeMutation.mutate(reply.id)}
                      className={`flex items-center gap-1 ${reply.likes?.includes(currentUser?.email) ? 'text-purple-400' : 'text-gray-400'} hover:text-purple-400`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${reply.likes?.includes(currentUser?.email) ? 'fill-current' : ''}`} />
                      {reply.likes?.length || 0}
                    </button>
                  </div>
                  <p className="text-gray-300">{reply.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {currentUser && !selectedThread.is_locked && (
            <div className="mt-6 flex gap-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="bg-white/10 border-white/20 text-white"
                rows={3}
              />
              <Button
                onClick={() => {
                  if (replyContent.trim()) {
                    replyMutation.mutate({ threadId: selectedThread.id, content: replyContent });
                  }
                }}
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
          {selectedThread.is_locked && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <Lock className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-medium">This thread is locked</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-950 pb-20">
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => currentGroup ? navigate(createPageUrl("ForumGroups")) : navigate(createPageUrl("CommunityHub"))} className="p-2 hover:bg-white/10 rounded-full">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-green-400" />
                  {currentGroup ? currentGroup.name : 'Community Forums'}
                </h1>
                <p className="text-gray-400 text-sm">{threads.length} discussions</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!groupId && (
                <Button onClick={() => navigate(createPageUrl("ForumGroups"))} variant="outline" className="border-white/20 text-white">
                  <Users className="w-4 h-4 mr-2" />
                  Groups
                </Button>
              )}
              {currentUser && (
                <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Thread
                </Button>
              )}
            </div>
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 bg-white/10 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="lifestyle">Lifestyle</SelectItem>
              <SelectItem value="help">Help</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-4">
          <AnimatePresence>
            {threads.map((thread, idx) => (
              <motion.div key={thread.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card
                  onClick={() => setSelectedThread(thread)}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <img src={thread.author_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white">{thread.title}</h3>
                            {thread.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                            {thread.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                          </div>
                          <p className="text-gray-400 text-sm">by {thread.author_name} • {new Date(thread.created_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {currentUser?.email === thread.author_email && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingThread(thread);
                              setFormData({
                                title: thread.title,
                                content: thread.content,
                                category: thread.category,
                                video_url: thread.video_url || ""
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(thread.id)} className="p-2 hover:bg-red-500/20 rounded-full">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-300 mb-4 line-clamp-2">{thread.content}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <Badge className="bg-green-500/20 text-green-400">{thread.category}</Badge>
                      <div className="flex items-center gap-1 text-gray-400">
                        <MessageSquare className="w-4 h-4" />
                        {thread.reply_count || 0}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-4 h-4" />
                        {thread.views || 0}
                      </div>
                      {thread.last_reply_at && (
                        <div className="flex items-center gap-1 text-gray-400 ml-auto">
                          <Clock className="w-4 h-4" />
                          Last reply {new Date(thread.last_reply_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {threads.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No threads yet</h3>
            <p className="text-gray-400">Start a discussion!</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setEditingThread(null);
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingThread ? 'Edit' : 'Create'} Thread</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Thread Title *" required className="bg-white/10 border-white/20" />
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
                <SelectItem value="help">Help</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Content *" required rows={6} className="bg-white/10 border-white/20" />
            <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="Video URL (optional)" className="bg-white/10 border-white/20" />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1 bg-green-600">{editingThread ? 'Update' : 'Post'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}