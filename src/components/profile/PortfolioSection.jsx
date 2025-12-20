import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, X, ExternalLink, Play, Image as ImageIcon, 
  Star, Eye, Heart, Trash2, Edit2, Loader2, Upload
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const categories = [
  { value: "photography", label: "Photography" },
  { value: "videography", label: "Videography" },
  { value: "design", label: "Design" },
  { value: "music", label: "Music" },
  { value: "writing", label: "Writing" },
  { value: "art", label: "Art" },
  { value: "development", label: "Development" },
  { value: "other", label: "Other" }
];

export default function PortfolioSection({ userEmail, isOwnProfile, currentUser }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    category: "other",
    media_type: "image",
    media_url: "",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");

  const { data: portfolioItems = [], isLoading } = useQuery({
    queryKey: ['portfolio', userEmail],
    queryFn: () => base44.entities.PortfolioItem.filter({ user_email: userEmail }, '-created_date'),
    enabled: !!userEmail
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!currentUser?.email) throw new Error("User not authenticated");
      return base44.entities.PortfolioItem.create({
        ...data,
        user_email: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', userEmail] });
      setShowAddModal(false);
      resetForm();
      toast.success('Portfolio item added!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add portfolio item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PortfolioItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', userEmail] });
      toast.success('Item removed');
    }
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: ({ id, is_featured }) => 
      base44.entities.PortfolioItem.update(id, { is_featured: !is_featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', userEmail] });
    }
  });

  const resetForm = () => {
    setNewItem({
      title: "",
      description: "",
      category: "other",
      media_type: "image",
      media_url: "",
      tags: []
    });
    setTagInput("");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const mediaType = file.type.startsWith('video/') ? 'video' : 
                       file.type.startsWith('audio/') ? 'audio' : 'image';
      setNewItem(prev => ({ ...prev, media_url: file_url, media_type: mediaType }));
      toast.success('Upload successful!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newItem.tags.includes(tagInput.trim())) {
      setNewItem(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const featuredItems = portfolioItems.filter(item => item.is_featured);
  const regularItems = portfolioItems.filter(item => !item.is_featured);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Portfolio</h3>
        {isOwnProfile && (
          <Button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Work
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : portfolioItems.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
          <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No portfolio items yet</p>
          {isOwnProfile && (
            <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-purple-600 hover:bg-purple-700">
              Add Your First Work
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Featured Items */}
          {featuredItems.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" /> Featured Work
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredItems.map(item => (
                  <PortfolioCard 
                    key={item.id} 
                    item={item} 
                    isOwnProfile={isOwnProfile}
                    onDelete={() => deleteMutation.mutate(item.id)}
                    onToggleFeature={() => toggleFeatureMutation.mutate({ id: item.id, is_featured: item.is_featured })}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Items */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {regularItems.map(item => (
              <PortfolioCard 
                key={item.id} 
                item={item} 
                isOwnProfile={isOwnProfile}
                compact
                onDelete={() => deleteMutation.mutate(item.id)}
                onToggleFeature={() => toggleFeatureMutation.mutate({ id: item.id, is_featured: item.is_featured })}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add Modal */}
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add Portfolio Item</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Upload Media</label>
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
                    {newItem.media_url ? (
                      <div className="relative">
                        {newItem.media_type === 'video' ? (
                          <video src={newItem.media_url} className="max-h-48 mx-auto rounded-lg" controls />
                        ) : (
                          <img src={newItem.media_url} className="max-h-48 mx-auto rounded-lg object-cover" />
                        )}
                        <button 
                          onClick={() => setNewItem(prev => ({ ...prev, media_url: "" }))}
                          className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          id="portfolio-upload"
                          className="hidden"
                          accept="image/*,video/*,audio/*"
                          onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        />
                        <label htmlFor="portfolio-upload" className="cursor-pointer">
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                              <p className="text-gray-400 text-sm">Click to upload image, video, or audio</p>
                            </>
                          )}
                        </label>
                      </>
                    )}
                  </div>
                </div>

                <Input
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  className="bg-white/10 border-white/20 text-white"
                  rows={3}
                />

                <Select 
                  value={newItem.category} 
                  onValueChange={(v) => setNewItem(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Tags */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tag..."
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    <Button onClick={addTag} variant="outline" className="bg-white/5 border-white/10">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newItem.tags.map((tag, i) => (
                      <Badge key={i} className="bg-purple-500/20 text-purple-300">
                        {tag}
                        <button onClick={() => setNewItem(prev => ({ 
                          ...prev, 
                          tags: prev.tags.filter((_, idx) => idx !== i) 
                        }))}>
                          <X className="w-3 h-3 ml-1" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => createMutation.mutate(newItem)}
                  disabled={!newItem.title || !newItem.media_url || createMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Portfolio'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

      {/* Item Detail Modal */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden"
            >
              <div className="relative aspect-video bg-black">
                {selectedItem.media_type === 'video' ? (
                  <video src={selectedItem.media_url} className="w-full h-full object-contain" controls autoPlay />
                ) : (
                  <img src={selectedItem.media_url} className="w-full h-full object-contain" />
                )}
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedItem.title}</h3>
                {selectedItem.description && (
                  <p className="text-gray-400 mb-4">{selectedItem.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-purple-500/20 text-purple-300">{selectedItem.category}</Badge>
                  {selectedItem.tags?.map((tag, i) => (
                    <Badge key={i} variant="outline" className="border-white/20 text-gray-300">{tag}</Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
    </div>
  );
}

function PortfolioCard({ item, isOwnProfile, compact, onDelete, onToggleFeature, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`relative group cursor-pointer rounded-xl overflow-hidden bg-white/5 border border-white/10 ${
        compact ? 'aspect-square' : 'aspect-video'
      }`}
    >
      {item.media_type === 'video' ? (
        <>
          <img src={item.thumbnail_url || item.media_url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-12 h-12 text-white/80" />
          </div>
        </>
      ) : (
        <img src={item.media_url} className="w-full h-full object-cover" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h4 className="text-white font-medium truncate">{item.title}</h4>
          {!compact && item.description && (
            <p className="text-gray-300 text-sm truncate">{item.description}</p>
          )}
        </div>
      </div>

      {item.is_featured && (
        <div className="absolute top-2 left-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        </div>
      )}

      {isOwnProfile && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFeature(); }}
            className="p-1.5 bg-black/50 rounded-full hover:bg-black/70"
          >
            <Star className={`w-4 h-4 ${item.is_featured ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 bg-black/50 rounded-full hover:bg-red-500/50"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </motion.div>
  );
}