import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, SlidersHorizontal, Trash2, Eye, Edit, Radio, Video, Upload, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ContentLibrary({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: allContent = [] } = useQuery({
    queryKey: ['library-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StreamingContent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['library-content']);
      toast.success('Content deleted');
    }
  });

  // Filtering logic
  const filteredContent = allContent
    .filter(c => {
      const matchesSearch = !searchQuery || 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === "all" || c.type === filterType;
      const matchesCategory = filterCategory === "all" || c.category === filterCategory;
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "live" && c.is_live) ||
        (filterStatus === "archived" && !c.is_live);

      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === "views") return (b.view_count || 0) - (a.view_count || 0);
      if (sortBy === "engagement") return (b.engagement_rate || 0) - (a.engagement_rate || 0);
      return 0;
    });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.StreamingContent.create({
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: "movie",
        category: "entertainment",
        description: "Uploaded from Content Hub",
        thumbnail_url: file_url,
        creator_email: currentUser.email,
        is_live: false,
        rating: 0
      });

      queryClient.invalidateQueries(['library-content']);
      toast.success('Content uploaded successfully!');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search content..."
                  className="pl-10 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="live_event">Live Events</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="series">Series</SelectItem>
                <SelectItem value="gaming_stream">Gaming</SelectItem>
                <SelectItem value="music_concert">Music</SelectItem>
                <SelectItem value="podcast">Podcasts</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
                <SelectItem value="engagement">Highest Engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterStatus(filterStatus === "all" ? "live" : "all")}
              className={filterStatus === "live" ? "bg-red-500/20 border-red-500/30 text-red-300" : "bg-white/5"}
            >
              <Radio className="w-4 h-4 mr-2" />
              Live Only
            </Button>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Content
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-gray-400 text-sm">
        Showing {filteredContent.length} of {allContent.length} content pieces
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredContent.map(content => (
            <motion.div
              key={content.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition group">
                <div className="relative">
                  {content.thumbnail_url ? (
                    <img src={content.thumbnail_url} className="w-full h-48 object-cover rounded-t-xl" />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-t-xl flex items-center justify-center">
                      <Video className="w-12 h-12 text-white/40" />
                    </div>
                  )}
                  {content.is_live && (
                    <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                      <Radio className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition flex gap-2">
                    <Link to={createPageUrl("LivestreamViewer") + `?id=${content.id}`}>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Delete this content?')) {
                          deleteMutation.mutate(content.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="text-white font-bold mb-2 line-clamp-1">{content.title}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{content.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-purple-500/20 text-purple-300 capitalize">
                      {content.type?.replace('_', ' ')}
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-300 capitalize">
                      {content.category}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-white font-bold">{content.view_count || 0}</div>
                      <div className="text-gray-500 text-xs">Views</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{content.like_count || 0}</div>
                      <div className="text-gray-500 text-xs">Likes</div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{(content.engagement_rate || 0).toFixed(1)}%</div>
                      <div className="text-gray-500 text-xs">Engage</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No content found</h3>
          <p className="text-gray-400">Try adjusting your filters or upload new content</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setShowUploadModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Upload Content</h3>
            
            <input
              id="content-upload"
              type="file"
              accept="video/*,image/*"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
              className="hidden"
            />
            
            <Button
              onClick={() => document.getElementById('content-upload').click()}
              disabled={uploading}
              className="w-full h-32 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 mr-2" />
                  Select File
                </>
              )}
            </Button>

            <p className="text-gray-400 text-sm text-center mt-4">
              Supports videos and images up to 500MB
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}