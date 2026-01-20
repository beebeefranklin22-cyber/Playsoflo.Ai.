import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Film, Edit, Trash2, Eye, DollarSign, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function VODManager({ currentUser, onEditVideo }) {
  const queryClient = useQueryClient();
  const [editingContent, setEditingContent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: myContent = [] } = useQuery({
    queryKey: ['my-vod-content'],
    queryFn: async () => {
      return await base44.entities.StreamingContent.filter({
        created_by: currentUser.email,
        is_live: false
      });
    },
    enabled: !!currentUser
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.StreamingContent.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vod-content'] });
      toast.success("Content updated successfully!");
      setShowEditModal(false);
      setEditingContent(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.StreamingContent.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-vod-content'] });
      toast.success("Content deleted successfully!");
    }
  });

  const handleEdit = (content) => {
    setEditingContent({ ...content });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingContent?.id) return;
    
    updateMutation.mutate({
      id: editingContent.id,
      data: {
        title: editingContent.title,
        description: editingContent.description,
        category: editingContent.category,
        tags: editingContent.tags || [],
        is_monetized: editingContent.is_monetized,
        price_usd: parseFloat(editingContent.price_usd) || 0,
        rental_price_usd: parseFloat(editingContent.rental_price_usd) || 0,
        status: editingContent.status
      }
    });
  };

  const addTag = (tag) => {
    if (!tag.trim()) return;
    setEditingContent({
      ...editingContent,
      tags: [...(editingContent.tags || []), tag.trim()]
    });
  };

  const removeTag = (index) => {
    setEditingContent({
      ...editingContent,
      tags: editingContent.tags.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Film className="w-6 h-6" />
          My VOD Content
        </h2>
        <div className="text-gray-400">
          {myContent.length} videos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {myContent.map((content) => (
            <motion.div
              key={content.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="bg-white/5 border-white/10 overflow-hidden">
                <div className="relative aspect-video">
                  <img 
                    src={content.thumbnail_url} 
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      content.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}>
                      {content.status}
                    </span>
                  </div>
                  {content.is_monetized && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${content.price_usd}
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-white text-base line-clamp-2">
                    {content.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Eye className="w-4 h-4" />
                    {content.views || 0} views
                  </div>
                  
                  {content.tags && content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(content)}
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/20 hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Settings
                    </Button>
                    {content.video_url && onEditVideo && (
                      <Button
                        onClick={() => onEditVideo(content)}
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 text-purple-400"
                      >
                        <Film className="w-4 h-4 mr-1" />
                        Edit Video
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        if (confirm('Delete this content?')) {
                          deleteMutation.mutate(content.id);
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {myContent.length === 0 && (
        <div className="text-center py-12">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No VOD content yet. Upload your first video!</p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Edit Content</h3>
              <button onClick={() => setShowEditModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Title</label>
                <Input
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                <Textarea
                  value={editingContent.description || ""}
                  onChange={(e) => setEditingContent({ ...editingContent, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  rows={4}
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Category</label>
                <Select
                  value={editingContent.category}
                  onValueChange={(v) => setEditingContent({ ...editingContent, category: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tags</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag (press Enter)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(editingContent.tags || []).map((tag, idx) => (
                      <div key={idx} className="bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-full text-sm text-white flex items-center gap-2">
                        #{tag}
                        <button onClick={() => removeTag(idx)} className="text-white/60 hover:text-white">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Status</label>
                <Select
                  value={editingContent.status}
                  onValueChange={(v) => setEditingContent({ ...editingContent, status: v })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-xl mb-4">
                  <input
                    type="checkbox"
                    checked={editingContent.is_monetized}
                    onChange={(e) => setEditingContent({ ...editingContent, is_monetized: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-white text-sm font-medium">Enable monetization</label>
                </div>

                {editingContent.is_monetized && (
                  <div className="space-y-4 pl-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Purchase Price (USD)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingContent.price_usd}
                        onChange={(e) => setEditingContent({ ...editingContent, price_usd: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Rental Price (USD)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingContent.rental_price_usd}
                        onChange={(e) => setEditingContent({ ...editingContent, rental_price_usd: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  className="bg-white/5 border-white/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}