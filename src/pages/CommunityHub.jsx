import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, TrendingUp, Star, Pin, User, ThumbsUp,
  ChevronLeft, Plus, Send, Trophy, Award, DollarSign, Car,
  Video, Store, Users, CheckCircle, Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CommunityHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedHub, setSelectedHub] = useState("general");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    category: "discussion",
    tags: []
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const hubs = [
    { id: "general", label: "General", icon: Users, color: "purple" },
    { id: "driver_lounge", label: "Driver Lounge", icon: Car, color: "blue" },
    { id: "provider_network", label: "Provider Network", icon: Store, color: "green" },
    { id: "creator_corner", label: "Creator Corner", icon: Video, color: "pink" }
  ];

  const { data: posts = [] } = useQuery({
    queryKey: ['forum-posts', selectedHub],
    queryFn: async () => {
      return await base44.entities.ForumPost.filter({
        hub_type: selectedHub
      });
    },
    initialData: []
  });

  const { data: featuredStories = [] } = useQuery({
    queryKey: ['featured-stories'],
    queryFn: async () => {
      return await base44.entities.ForumPost.filter({
        is_featured: true
      });
    },
    initialData: []
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['forum-replies', selectedPost?.id],
    queryFn: async () => {
      if (!selectedPost) return [];
      return await base44.entities.ForumReply.filter({
        post_id: selectedPost.id
      });
    },
    enabled: !!selectedPost,
    initialData: []
  });

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ForumPost.create({
        ...data,
        hub_type: selectedHub,
        author_name: currentUser.full_name || currentUser.email,
        author_photo: currentUser.profile_photo || "",
        likes_count: 0,
        replies_count: 0,
        views_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-posts']);
      setShowCreatePost(false);
      setPostForm({ title: "", content: "", category: "discussion", tags: [] });
      toast.success("Post created!");
    }
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ postId, content }) => {
      const reply = await base44.entities.ForumReply.create({
        post_id: postId,
        content,
        author_name: currentUser.full_name || currentUser.email,
        author_photo: currentUser.profile_photo || "",
        likes_count: 0
      });

      // Update reply count
      await base44.entities.ForumPost.update(postId, {
        replies_count: (selectedPost.replies_count || 0) + 1
      });

      return reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies']);
      queryClient.invalidateQueries(['forum-posts']);
      setReplyContent("");
    }
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, replyId }) => {
      const existing = await base44.entities.ForumLike.filter({
        user_email: currentUser.email,
        ...(postId ? { post_id: postId } : { reply_id: replyId })
      });

      if (existing.length > 0) {
        await base44.entities.ForumLike.delete(existing[0].id);
        return -1;
      } else {
        await base44.entities.ForumLike.create({
          user_email: currentUser.email,
          post_id: postId || "",
          reply_id: replyId || ""
        });
        return 1;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-posts']);
      queryClient.invalidateQueries(['forum-replies']);
    }
  });

  const handleCreatePost = () => {
    if (!postForm.title || !postForm.content) {
      toast.error("Please fill in title and content");
      return;
    }
    createPostMutation.mutate(postForm);
  };

  const handleReply = () => {
    if (!replyContent.trim()) {
      toast.error("Please enter a reply");
      return;
    }
    createReplyMutation.mutate({
      postId: selectedPost.id,
      content: replyContent
    });
  };

  const categoryIcons = {
    question: "❓",
    tip: "💡",
    story: "📖",
    discussion: "💬",
    announcement: "📢"
  };

  return (
    <div className="min-h-screen p-6 pb-20 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(createPageUrl("Social"))}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Users className="w-10 h-10 text-purple-400" />
              Community Hub
            </h1>
            <p className="text-gray-300 text-lg">Connect, share tips, and learn from peers</p>
          </div>
          <Button
            onClick={() => setShowCreatePost(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Post
          </Button>
        </div>

        {/* Featured Success Stories */}
        {featuredStories.length > 0 && (
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Success Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {featuredStories.slice(0, 3).map(story => (
                  <div key={story.id} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {story.author_name?.[0] || "U"}
                      </div>
                      <div>
                        <p className="text-white font-bold">{story.author_name}</p>
                        <p className="text-gray-400 text-xs">{story.hub_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <h3 className="text-white font-bold mb-2">{story.title}</h3>
                    {story.featured_metrics && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {story.featured_metrics.earnings && (
                          <div className="bg-green-500/20 rounded-lg p-2">
                            <p className="text-green-400 font-bold">${story.featured_metrics.earnings}</p>
                            <p className="text-gray-400">Earned</p>
                          </div>
                        )}
                        {story.featured_metrics.rating && (
                          <div className="bg-yellow-500/20 rounded-lg p-2">
                            <p className="text-yellow-400 font-bold">{story.featured_metrics.rating}⭐</p>
                            <p className="text-gray-400">Rating</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hub Selection */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {hubs.map(hub => {
            const Icon = hub.icon;
            const isActive = selectedHub === hub.id;
            return (
              <button
                key={hub.id}
                onClick={() => setSelectedHub(hub.id)}
                className={`p-6 rounded-xl transition ${
                  isActive
                    ? `bg-${hub.color}-500/20 border-2 border-${hub.color}-500`
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Icon className={`w-8 h-8 mb-2 ${isActive ? `text-${hub.color}-400` : 'text-gray-400'}`} />
                <p className={`font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>{hub.label}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {posts.filter(p => p.hub_type === hub.id).length} posts
                </p>
              </button>
            );
          })}
        </div>

        {/* Posts List */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
                  <p className="text-gray-400 mb-6">Be the first to start a conversation!</p>
                  <Button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Post
                  </Button>
                </div>
              ) : (
                posts.map(post => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {post.author_name?.[0] || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-white font-bold flex items-center gap-2">
                              {categoryIcons[post.category]}
                              {post.title}
                              {post.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              by {post.author_name} • {new Date(post.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-purple-500/20 text-purple-300">{post.category}</Badge>
                        </div>
                        <p className="text-gray-300 line-clamp-2 mb-3">{post.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.replies_count}
                          </span>
                          <span>{post.views_count} views</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowCreatePost(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8"
            >
              <h2 className="text-3xl font-bold text-white mb-6">Create Post</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Category</label>
                  <div className="flex gap-2 flex-wrap">
                    {['question', 'tip', 'story', 'discussion'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPostForm({...postForm, category: cat})}
                        className={`px-4 py-2 rounded-lg transition ${
                          postForm.category === cat
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {categoryIcons[cat]} {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Title</label>
                  <Input
                    value={postForm.title}
                    onChange={(e) => setPostForm({...postForm, title: e.target.value})}
                    placeholder="What's your post about?"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Content</label>
                  <Textarea
                    value={postForm.content}
                    onChange={(e) => setPostForm({...postForm, content: e.target.value})}
                    rows={6}
                    placeholder="Share your thoughts, tips, or questions..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCreatePost(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={createPostMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Details Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                  {selectedPost.author_name?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedPost.title}</h2>
                  <p className="text-gray-400">
                    {selectedPost.author_name} • {new Date(selectedPost.created_date).toLocaleString()}
                  </p>
                  <Badge className="mt-2 bg-purple-500/20 text-purple-300">{selectedPost.category}</Badge>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLikeMutation.mutate({ postId: selectedPost.id });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                >
                  <ThumbsUp className="w-5 h-5 text-blue-400" />
                  <span className="text-white">{selectedPost.likes_count}</span>
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <p className="text-gray-300 whitespace-pre-wrap">{selectedPost.content}</p>
              </div>

              {/* Replies */}
              <div className="space-y-4 mb-6">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {replies.length} Replies
                </h3>
                {replies.map(reply => (
                  <div key={reply.id} className="flex items-start gap-3 bg-white/5 rounded-xl p-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {reply.author_name?.[0] || "U"}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm mb-1">{reply.author_name}</p>
                      <p className="text-gray-300">{reply.content}</p>
                      {reply.is_solution && (
                        <Badge className="mt-2 bg-green-500/20 text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Solution
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => toggleLikeMutation.mutate({ replyId: reply.id })}
                      className="text-gray-400 hover:text-blue-400 transition"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div className="flex gap-3">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="bg-white/10 border-white/20 text-white"
                  rows={3}
                />
                <Button
                  onClick={handleReply}
                  disabled={createReplyMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}