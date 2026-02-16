import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, Eye, ThumbsUp, Edit2, Trash2, Plus, Play, Video,
  BarChart3, Users, MessageSquare, Calendar, Radio, PauseCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import GoLiveNewsModal from "@/components/news/GoLiveNewsModal";
import LiveNewsBroadcast from "@/components/news/LiveNewsBroadcast";

export default function NewsCreatorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showGoLive, setShowGoLive] = useState(false);
  const [activeLivePost, setActiveLivePost] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "local",
    featured_image: "",
    video_url: "",
    source_url: "",
    status: "published"
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => navigate(createPageUrl("Home")));
  }, []);

  const { data: myPosts = [] } = useQuery({
    queryKey: ['my-news-posts'],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.NewsPost.filter({ author_email: currentUser.email }, '-created_date');
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: livePost } = useQuery({
    queryKey: ['my-live-post'],
    queryFn: async () => {
      const live = myPosts.find(p => p.is_live);
      return live || null;
    },
    enabled: myPosts.length > 0
  });

  const stats = {
    totalViews: myPosts.reduce((sum, p) => sum + (p.views || 0), 0),
    totalLikes: myPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
    publishedPosts: myPosts.filter(p => p.status === 'published').length,
    draftPosts: myPosts.filter(p => p.status === 'draft').length
  };

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
      queryClient.invalidateQueries(['my-news-posts']);
      setShowCreateModal(false);
      setFormData({ title: "", content: "", category: "local", featured_image: "", video_url: "", source_url: "", status: "published" });
      toast.success('Post created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.NewsPost.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-news-posts']);
      setEditingPost(null);
      setShowCreateModal(false);
      toast.success('Post updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.NewsPost.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-news-posts']);
      toast.success('Post deleted!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const endLiveStream = async () => {
    if (activeLivePost) {
      await base44.entities.NewsPost.update(activeLivePost.id, {
        is_live: false,
        live_ended_at: new Date().toISOString()
      });
      queryClient.invalidateQueries(['my-news-posts']);
      setActiveLivePost(null);
    }
  };

  if (!currentUser) return null;

  if (activeLivePost) {
    return (
      <LiveNewsBroadcast
        newsPost={activeLivePost}
        onEnd={endLiveStream}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 pb-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">News Creator Dashboard</h1>
            <p className="text-gray-400">Manage your news content and analytics</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowGoLive(true)} className="bg-red-600 hover:bg-red-700">
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Views</p>
                  <p className="text-3xl font-bold text-white">{stats.totalViews}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Likes</p>
                  <p className="text-3xl font-bold text-white">{stats.totalLikes}</p>
                </div>
                <ThumbsUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Published</p>
                  <p className="text-3xl font-bold text-white">{stats.publishedPosts}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Drafts</p>
                  <p className="text-3xl font-bold text-white">{stats.draftPosts}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts List */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="all">All Posts</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {myPosts.map((post) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {post.featured_image && (
                        <img src={post.featured_image} alt={post.title} className="w-32 h-32 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-white">{post.title}</h3>
                              {post.is_live && (
                                <Badge className="bg-red-500 text-white animate-pulse">
                                  <Radio className="w-3 h-3 mr-1" />
                                  LIVE
                                </Badge>
                              )}
                              <Badge className={`${post.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {post.status}
                              </Badge>
                              <Badge className="bg-blue-500/20 text-blue-400">{post.category}</Badge>
                            </div>
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{post.content}</p>
                            <div className="flex items-center gap-6 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {post.views || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-4 h-4" />
                                {post.likes?.length || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(post.created_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {post.is_live && (
                              <Button
                                onClick={() => setActiveLivePost(post)}
                                className="bg-red-600 hover:bg-red-700"
                                size="sm"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Join Stream
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setEditingPost(post);
                                setFormData({
                                  title: post.title,
                                  content: post.content,
                                  category: post.category,
                                  featured_image: post.featured_image || "",
                                  video_url: post.video_url || "",
                                  source_url: post.source_url || "",
                                  status: post.status
                                });
                                setShowCreateModal(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-white/20 text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => deleteMutation.mutate(post.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-500/20 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="published">
            {myPosts.filter(p => p.status === 'published').map((post) => (
              <Card key={post.id} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                  <p className="text-gray-400 text-sm">{post.content.substring(0, 150)}...</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="draft">
            {myPosts.filter(p => p.status === 'draft').map((post) => (
              <Card key={post.id} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                  <p className="text-gray-400 text-sm">{post.content.substring(0, 150)}...</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="live">
            {myPosts.filter(p => p.is_live).map((post) => (
              <Card key={post.id} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                      <p className="text-gray-400 text-sm">Live viewers: {post.live_viewers || 0}</p>
                    </div>
                    <Button onClick={() => setActiveLivePost(post)} className="bg-red-600">
                      Join Stream
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setEditingPost(null);
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit' : 'Create'} News Post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Post Title *"
              required
              className="bg-white/10 border-white/20"
            />
            
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
              </SelectContent>
            </Select>

            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your news content... *"
              required
              rows={6}
              className="bg-white/10 border-white/20"
            />

            <Input
              value={formData.featured_image}
              onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
              placeholder="Featured Image URL"
              className="bg-white/10 border-white/20"
            />

            <Input
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="Video URL"
              className="bg-white/10 border-white/20"
            />

            <Input
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
              placeholder="Source URL"
              className="bg-white/10 border-white/20"
            />

            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="bg-white/10 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600">
                {editingPost ? 'Update' : 'Create'} Post
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Go Live Modal */}
      {showGoLive && (
        <GoLiveNewsModal
          onClose={() => setShowGoLive(false)}
          onGoLive={(post) => {
            setActiveLivePost(post);
            setShowGoLive(false);
            queryClient.invalidateQueries(['my-news-posts']);
          }}
        />
      )}
    </div>
  );
}