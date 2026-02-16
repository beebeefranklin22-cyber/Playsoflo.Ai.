import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Newspaper, Plus, Heart, MessageCircle, Eye, Edit2, Trash2,
  ChevronLeft, Image as ImageIcon, Video, ExternalLink, Send, Upload, Loader2, Radio, Search, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import GoLiveNewsModal from "../components/news/GoLiveNewsModal";
import LiveNewsBroadcast from "../components/news/LiveNewsBroadcast";

export default function CommunityNews() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comment, setComment] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [activeLivePost, setActiveLivePost] = useState(null);
  const [liveChannelName, setLiveChannelName] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const videoInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "other",
    featured_image: "",
    video_url: "",
    source_url: ""
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['news-posts', sortBy],
    queryFn: async () => {
      const allPosts = await base44.entities.NewsPost.list('-created_date');
      const published = allPosts.filter(p => p.status === 'published');
      
      // Sort based on selection
      let sorted = [...published];
      if (sortBy === 'popular') {
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (sortBy === 'trending') {
        sorted.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      }
      
      // Live posts always first
      return sorted.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return 0;
      });
    },
    initialData: [],
    refetchInterval: 10000
  });

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    return post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
           post.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['news-comments', selectedPost?.id],
    queryFn: async () => {
      if (!selectedPost) return [];
      return await base44.entities.Comment.filter({
        post_id: selectedPost.id,
        post_type: 'news'
      });
    },
    enabled: !!selectedPost,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.NewsPost.create({
        ...data,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        author_photo: currentUser.profile_picture
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['news-posts']);
      setShowCreateModal(false);
      setFormData({ title: "", content: "", category: "other", featured_image: "", video_url: "", source_url: "" });
      toast.success('News post created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.NewsPost.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['news-posts']);
      setEditingPost(null);
      toast.success('Post updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.NewsPost.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['news-posts']);
      setSelectedPost(null);
      toast.success('Post deleted!');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (postId) => {
      const post = posts.find(p => p.id === postId);
      const likes = post.likes || [];
      const hasLiked = likes.includes(currentUser.email);
      
      return await base44.entities.NewsPost.update(postId, {
        likes: hasLiked 
          ? likes.filter(email => email !== currentUser.email)
          : [...likes, currentUser.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['news-posts']);
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, content }) => {
      await base44.entities.Comment.create({
        post_id: postId,
        post_type: 'news',
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        user_photo: currentUser.profile_picture,
        content
      });

      const post = posts.find(p => p.id === postId);
      if (post && post.author_email !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: post.author_email,
          type: 'new_comment',
          title: 'New comment on your news post',
          message: `${currentUser.full_name} commented on "${post.title}"`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['news-comments']);
      setComment("");
      toast.success('Comment posted!');
    }
  });

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, video_url: file_url });
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Video upload error:', error);
      alert('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleMessage = async (authorEmail) => {
    const convs = await base44.entities.ChatConversation.list();
    const existing = convs.find(c => 
      c.participants.includes(currentUser.email) && 
      c.participants.includes(authorEmail)
    );

    if (existing) {
      navigate(createPageUrl("Messages") + `?conv=${existing.id}`);
    } else {
      navigate(createPageUrl("Messages") + `?user=${authorEmail}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 pb-20">
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl("CommunityHub"))}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-blue-400" />
                News & Updates
              </h1>
              <p className="text-gray-400 text-sm">{posts.length} posts</p>
            </div>
          </div>
          {currentUser && (
            <div className="flex gap-2">
              <Button onClick={() => navigate(createPageUrl("NewsCreatorDashboard"))} variant="outline" className="border-white/20 text-white">
                <TrendingUp className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button onClick={() => setShowGoLiveModal(true)} className="bg-red-600 hover:bg-red-700">
                <Radio className="w-4 h-4 mr-2" />
                Go Live
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Post News
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news by title, content, or author..."
              className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="popular">Most Viewed</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6">
          <AnimatePresence>
            {filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition overflow-hidden">
                  {post.is_live && (
                    <div className="relative h-64 bg-gradient-to-br from-red-900 to-black flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <Radio className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-white font-bold text-xl">LIVE NOW</p>
                        <p className="text-gray-300 text-sm">{post.live_viewers || 0} watching</p>
                      </div>
                      <Badge className="absolute top-4 left-4 bg-red-600 animate-pulse">
                        🔴 LIVE
                      </Badge>
                      <Badge className="absolute top-4 right-4 bg-blue-600">{post.category}</Badge>
                    </div>
                  )}
                  {!post.is_live && post.featured_image && (
                    <div className="relative h-64">
                      <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute top-4 left-4 bg-blue-600">{post.category}</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.author_photo || "https://via.placeholder.com/40"}
                          alt={post.author_name}
                          className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 ring-blue-500 transition"
                          onClick={() => navigate(createPageUrl("NewsCreatorProfile") + `?email=${post.author_email}`)}
                        />
                        <div>
                          <p 
                            className="text-white font-semibold hover:text-blue-400 cursor-pointer"
                            onClick={() => navigate(createPageUrl("NewsCreatorProfile") + `?email=${post.author_email}`)}
                          >
                            {post.author_name}
                          </p>
                          <p className="text-gray-400 text-xs">{new Date(post.created_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {currentUser?.email === post.author_email && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPost(post);
                              setFormData({
                                title: post.title,
                                content: post.content,
                                category: post.category,
                                featured_image: post.featured_image || "",
                                video_url: post.video_url || "",
                                source_url: post.source_url || ""
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(post.id)}
                            className="p-2 hover:bg-red-500/20 rounded-full"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3">{post.title}</h2>
                    <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content.substring(0, 300)}...</p>

                    {post.video_url && (
                      <div className="mb-4">
                        <video src={post.video_url} controls className="w-full rounded-lg" />
                      </div>
                    )}

                    {post.source_url && (
                      <a
                        href={post.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mb-4"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Source
                      </a>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => currentUser && likeMutation.mutate(post.id)}
                        className={`flex items-center gap-2 ${
                          post.likes?.includes(currentUser?.email) ? 'text-red-400' : 'text-gray-400'
                        } hover:text-red-400 transition`}
                      >
                        <Heart className={`w-5 h-5 ${post.likes?.includes(currentUser?.email) ? 'fill-current' : ''}`} />
                        {post.likes?.length || 0}
                      </button>
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Comments
                      </button>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Eye className="w-5 h-5" />
                        {post.views}
                      </div>
                      {currentUser && currentUser.email !== post.author_email && (
                        <Button
                          onClick={() => handleMessage(post.author_email)}
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Message Author
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && !isLoading && (
            <div className="text-center py-20">
              <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No news posts yet</h3>
              <p className="text-gray-400">Be the first to share community news!</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setEditingPost(null);
          setFormData({ title: "", content: "", category: "other", featured_image: "", video_url: "", source_url: "" });
        }
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit' : 'Create'} News Post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-white/10 border-white/20"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="politics">Politics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Content *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={6}
                className="bg-white/10 border-white/20"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Featured Image URL</label>
              <Input
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="https://..."
                className="bg-white/10 border-white/20"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Video</label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="Video URL (e.g., YouTube)"
                className="bg-white/10 border-white/20"
              />
              <div className="text-center text-gray-400 my-2">OR</div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {uploadingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video from Phone
                  </>
                )}
              </Button>
              {formData.video_url && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                  <Video className="w-4 h-4" />
                  Video added
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Source URL</label>
              <Input
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                placeholder="https://..."
                className="bg-white/10 border-white/20"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingPost ? 'Update' : 'Post'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <img src={c.user_photo || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <p className="text-white font-semibold">{c.user_name}</p>
                  <p className="text-gray-300 text-sm">{c.content}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(c.created_date).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-gray-400 text-center py-8">No comments yet</p>
            )}
            {currentUser && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="bg-white/10 border-white/20"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && comment.trim()) {
                      commentMutation.mutate({ postId: selectedPost.id, content: comment });
                    }
                  }}
                />
                <Button
                  onClick={() => comment.trim() && commentMutation.mutate({ postId: selectedPost.id, content: comment })}
                  disabled={!comment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Go Live Modal */}
      <GoLiveNewsModal
        isOpen={showGoLiveModal}
        onClose={() => setShowGoLiveModal(false)}
        currentUser={currentUser}
        onGoLive={(newsPost, channelName) => {
          setActiveLivePost(newsPost);
          setLiveChannelName(channelName);
          setIsLiveBroadcasting(true);
        }}
      />

      {/* Live Broadcasting */}
      {isLiveBroadcasting && activeLivePost && liveChannelName && (
        <LiveNewsBroadcast
          newsPost={activeLivePost}
          channelName={liveChannelName}
          currentUser={currentUser}
          onEnd={() => {
            setIsLiveBroadcasting(false);
            setActiveLivePost(null);
            setLiveChannelName(null);
            queryClient.invalidateQueries(['news-posts']);
          }}
        />
      )}
    </div>
  );
}