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
  DollarSign, Plus, Heart, MessageCircle, Eye, Edit2, Trash2,
  ChevronLeft, ExternalLink, Send, TrendingUp, Star, Upload, 
  Image as ImageIcon, Video, Loader2, X, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AffiliateReviewsModal from "../components/affiliate/AffiliateReviewsModal";

export default function CommunityAffiliate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [comment, setComment] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    affiliate_url: "",
    commission_rate: "",
    payout_method: "",
    company_name: "",
    contact_email: "",
    featured_image: "",
    images: [],
    video_url: "",
    video_file: "",
    benefits: "",
    requirements: ""
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['affiliate-listings', filterCategory],
    queryFn: async () => {
      let all = await base44.entities.AffiliateListing.list('-created_date');
      all = all.filter(l => l.status === 'active');
      if (filterCategory !== 'all') all = all.filter(l => l.category === filterCategory);
      return all;
    },
    initialData: []
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['affiliate-comments', selectedListing?.id],
    queryFn: async () => {
      if (!selectedListing) return [];
      return await base44.entities.Comment.filter({
        post_id: selectedListing.id,
        post_type: 'affiliate'
      });
    },
    enabled: !!selectedListing,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const benefits = data.benefits ? data.benefits.split('\n').filter(Boolean) : [];
      const requirements = data.requirements ? data.requirements.split('\n').filter(Boolean) : [];
      
      return await base44.entities.AffiliateListing.create({
        ...data,
        benefits,
        requirements,
        poster_email: currentUser.email,
        poster_name: currentUser.full_name,
        poster_photo: currentUser.profile_picture
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-listings']);
      setShowCreateModal(false);
      setFormData({
        title: "", description: "", category: "other", affiliate_url: "",
        commission_rate: "", payout_method: "", company_name: "",
        contact_email: "", featured_image: "", images: [], video_url: "", video_file: "", benefits: "", requirements: ""
      });
      toast.success('Affiliate listing created!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const benefits = data.benefits ? data.benefits.split('\n').filter(Boolean) : [];
      const requirements = data.requirements ? data.requirements.split('\n').filter(Boolean) : [];
      return await base44.entities.AffiliateListing.update(id, { ...data, benefits, requirements });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-listings']);
      setEditingListing(null);
      toast.success('Listing updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.AffiliateListing.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-listings']);
      setSelectedListing(null);
      toast.success('Listing deleted!');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (listingId) => {
      const listing = listings.find(l => l.id === listingId);
      const likes = listing.likes || [];
      const hasLiked = likes.includes(currentUser.email);
      
      return await base44.entities.AffiliateListing.update(listingId, {
        likes: hasLiked 
          ? likes.filter(email => email !== currentUser.email)
          : [...likes, currentUser.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-listings']);
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ listingId, content }) => {
      await base44.entities.Comment.create({
        post_id: listingId,
        post_type: 'affiliate',
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        user_photo: currentUser.profile_picture,
        content
      });

      const listing = listings.find(l => l.id === listingId);
      if (listing && listing.poster_email !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: listing.poster_email,
          type: 'new_comment',
          title: 'New comment on your affiliate listing',
          message: `${currentUser.full_name} commented on "${listing.title}"`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-comments']);
      setComment("");
      toast.success('Comment posted!');
    }
  });

  const trackClickMutation = useMutation({
    mutationFn: async (listingId) => {
      const listing = listings.find(l => l.id === listingId);
      await base44.entities.AffiliateListing.update(listingId, {
        clicks: (listing.clicks || 0) + 1
      });
    }
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setFormData({ ...formData, images: [...(formData.images || []), ...urls] });
      toast.success('Images uploaded!');
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

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
      setFormData({ ...formData, video_file: file_url });
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Video upload error:', error);
      alert('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleMessage = async (posterEmail) => {
    const convs = await base44.entities.ChatConversation.list();
    const existing = convs.find(c => 
      c.participants.includes(currentUser.email) && 
      c.participants.includes(posterEmail)
    );

    if (existing) {
      navigate(createPageUrl("Messages") + `?conv=${existing.id}`);
    } else {
      navigate(createPageUrl("Messages") + `?user=${posterEmail}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingListing) {
      updateMutation.mutate({ id: editingListing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950 to-gray-950 pb-20">
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(createPageUrl("CommunityHub"))} className="p-2 hover:bg-white/10 rounded-full">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-orange-400" />
                  Affiliate Programs
                </h1>
                <p className="text-gray-400 text-sm">{listings.length} programs</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(createPageUrl("AffiliateDashboard"))}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
              {currentUser && (
                <Button onClick={() => setShowCreateModal(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Program
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
              <SelectItem value="products">Products</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="courses">Courses</SelectItem>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {listings.map((listing, idx) => (
              <motion.div key={listing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition h-full">
                  {listing.featured_image && (
                    <div className="relative h-40">
                      <img src={listing.featured_image} alt={listing.title} className="w-full h-full object-cover" />
                      <Badge className="absolute top-2 left-2 bg-orange-600">{listing.category}</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img src={listing.poster_photo || "https://via.placeholder.com/40"} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-white text-sm font-semibold">{listing.company_name || listing.poster_name}</p>
                        </div>
                      </div>
                      {currentUser?.email === listing.poster_email && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingListing(listing);
                              setFormData({
                                title: listing.title,
                                description: listing.description,
                                category: listing.category,
                                affiliate_url: listing.affiliate_url,
                                commission_rate: listing.commission_rate || "",
                                payout_method: listing.payout_method || "",
                                company_name: listing.company_name || "",
                                contact_email: listing.contact_email || "",
                                featured_image: listing.featured_image || "",
                                images: listing.images || [],
                                video_url: listing.video_url || "",
                                video_file: listing.video_file || "",
                                benefits: listing.benefits?.join('\n') || "",
                                requirements: listing.requirements?.join('\n') || ""
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(listing.id)} className="p-2 hover:bg-red-500/20 rounded-full">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{listing.title}</h3>
                    <p className="text-gray-300 text-sm mb-4 line-clamp-3">{listing.description}</p>

                    {listing.commission_rate && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                        <p className="text-green-400 font-bold text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          {listing.commission_rate} Commission
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <button
                        onClick={() => currentUser && likeMutation.mutate(listing.id)}
                        className={`flex items-center gap-1 ${listing.likes?.includes(currentUser?.email) ? 'text-red-400' : 'text-gray-400'}`}
                      >
                        <Heart className={`w-4 h-4 ${listing.likes?.includes(currentUser?.email) ? 'fill-current' : ''}`} />
                        {listing.likes?.length || 0}
                      </button>
                      <button onClick={() => setSelectedListing(listing)} className="flex items-center gap-1 text-gray-400">
                        <MessageCircle className="w-4 h-4" />
                        Comments
                      </button>
                      <button
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowReviewsModal(true);
                        }}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition"
                      >
                        <Star className="w-4 h-4 text-yellow-400" />
                        {listing.rating || 0} ({listing.review_count || 0})
                      </button>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-4 h-4" />
                        {listing.clicks || 0}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        className="flex-1 bg-gradient-to-r from-orange-600 to-red-600"
                        onClick={() => trackClickMutation.mutate(listing.id)}
                      >
                        <a href={listing.affiliate_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visit Program
                        </a>
                      </Button>
                      {currentUser && currentUser.email !== listing.poster_email && (
                        <Button onClick={() => handleMessage(listing.poster_email)} variant="outline" size="sm">
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {listings.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No affiliate programs yet</h3>
            <p className="text-gray-400">Share your affiliate opportunities!</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) setEditingListing(null);
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingListing ? 'Edit' : 'Add'} Affiliate Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Program Title *" required className="bg-white/10 border-white/20" />
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description *" required rows={4} className="bg-white/10 border-white/20" />
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="courses">Courses</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input value={formData.affiliate_url} onChange={(e) => setFormData({ ...formData, affiliate_url: e.target.value })} placeholder="Affiliate URL *" required className="bg-white/10 border-white/20" />
            <Input value={formData.commission_rate} onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })} placeholder="Commission Rate (e.g., 20%)" className="bg-white/10 border-white/20" />
            <Input value={formData.payout_method} onChange={(e) => setFormData({ ...formData, payout_method: e.target.value })} placeholder="Payout Method" className="bg-white/10 border-white/20" />
            <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Company Name" className="bg-white/10 border-white/20" />
            <Input value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="Contact Email" type="email" className="bg-white/10 border-white/20" />
            <Input value={formData.featured_image} onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })} placeholder="Featured Image URL" className="bg-white/10 border-white/20" />
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product/Service Images</label>
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              <Button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImages} className="w-full bg-blue-600 hover:bg-blue-700">
                {uploadingImages ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><ImageIcon className="w-4 h-4 mr-2" />Upload Images</>}
              </Button>
              {formData.images && formData.images.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video</label>
              <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="Video URL (e.g., YouTube)" className="bg-white/10 border-white/20 mb-2" />
              <div className="text-center text-gray-400 my-2">OR</div>
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              <Button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} className="w-full bg-purple-600 hover:bg-purple-700">
                {uploadingVideo ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload Video</>}
              </Button>
              {formData.video_file && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                  <Video className="w-4 h-4" />
                  Video uploaded
                </div>
              )}
            </div>

            <Textarea value={formData.benefits} onChange={(e) => setFormData({ ...formData, benefits: e.target.value })} placeholder="Benefits (one per line)" rows={3} className="bg-white/10 border-white/20" />
            <Textarea value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} placeholder="Requirements (one per line)" rows={3} className="bg-white/10 border-white/20" />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1 bg-orange-600">{editingListing ? 'Update' : 'Post'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={!!selectedListing && !showReviewsModal} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader>
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
            {comments.length === 0 && <p className="text-gray-400 text-center py-8">No comments yet</p>}
            {currentUser && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." className="bg-white/10 border-white/20" onKeyPress={(e) => e.key === 'Enter' && comment.trim() && commentMutation.mutate({ listingId: selectedListing.id, content: comment })} />
                <Button onClick={() => comment.trim() && commentMutation.mutate({ listingId: selectedListing.id, content: comment })} disabled={!comment.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviews Modal */}
      {selectedListing && (
        <AffiliateReviewsModal
          listing={selectedListing}
          isOpen={showReviewsModal}
          onClose={() => {
            setShowReviewsModal(false);
            setSelectedListing(null);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}