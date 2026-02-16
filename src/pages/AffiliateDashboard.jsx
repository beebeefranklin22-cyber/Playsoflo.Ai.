import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  TrendingUp, 
  Eye, 
  MousePointer, 
  DollarSign, 
  BarChart3,
  ExternalLink,
  Edit2,
  Pause,
  Play,
  Copy,
  Star,
  Trash2,
  Plus,
  Upload,
  Image as ImageIcon,
  Video,
  Loader2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
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

  React.useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: myListings = [] } = useQuery({
    queryKey: ['my-affiliate-listings'],
    queryFn: () => base44.entities.AffiliateListing.filter({ 
      poster_email: currentUser?.email 
    }, '-created_date'),
    enabled: !!currentUser
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const benefits = data.benefits ? data.benefits.split('\n').filter(Boolean) : [];
      const requirements = data.requirements ? data.requirements.split('\n').filter(Boolean) : [];
      return await base44.entities.AffiliateListing.update(id, { ...data, benefits, requirements });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-affiliate-listings']);
      setShowEditModal(false);
      setEditingListing(null);
      toast.success('Listing updated!');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      return await base44.entities.AffiliateListing.update(id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-affiliate-listings']);
      toast.success('Status updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.AffiliateListing.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-affiliate-listings']);
      toast.success('Listing deleted!');
    }
  });

  const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalClicks = myListings.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const totalRevenue = myListings.reduce((sum, l) => sum + (l.revenue_generated || 0), 0);
  const totalConversions = myListings.reduce((sum, l) => sum + (l.conversions || 0), 0);
  const avgRating = myListings.length > 0 
    ? (myListings.reduce((sum, l) => sum + (l.rating || 0), 0) / myListings.length).toFixed(1)
    : 0;

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

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
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, video_file: file_url });
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Failed to upload video');
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

  const handleEdit = (listing) => {
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
    setShowEditModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: editingListing.id, data: formData });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Affiliate Dashboard</h1>
          <p className="text-gray-400">Manage your products & track performance</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(createPageUrl("CommunityAffiliate"))}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Browse All
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("CommunityAffiliate"))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Eye className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Views</p>
                <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <MousePointer className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-white">{totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Conversions</p>
                <p className="text-2xl font-bold text-white">{totalConversions}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-500/20 rounded-xl">
                <Star className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-white">{avgRating} ⭐</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Listings Table */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Your Listings
          </h2>

          <div className="space-y-4">
            {myListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No affiliate listings yet</p>
                <Button
                  onClick={() => navigate(createPageUrl("CommunityAffiliate"))}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create Your First Listing
                </Button>
              </div>
            ) : (
              myListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{listing.title}</h3>
                        <Badge className={listing.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {listing.status}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{listing.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-300">
                          <Eye className="w-4 h-4" />
                          {listing.views || 0} views
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <MousePointer className="w-4 h-4" />
                          {listing.clicks || 0} clicks
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <TrendingUp className="w-4 h-4" />
                          {listing.conversions || 0} conversions
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          ${(listing.revenue_generated || 0).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <Star className="w-4 h-4 text-yellow-400" />
                          {listing.rating || 0} ({listing.review_count || 0} reviews)
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(listing.affiliate_url)}
                        className="border-white/20 text-white hover:bg-white/10"
                        title="Copy link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(listing)}
                        className="border-white/20 text-white hover:bg-white/10"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleStatusMutation.mutate({ id: listing.id, currentStatus: listing.status })}
                        className="border-white/20 text-white hover:bg-white/10"
                        title={listing.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {listing.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this listing?')) {
                            deleteMutation.mutate(listing.id);
                          }
                        }}
                        className="border-white/20 text-red-400 hover:bg-red-500/20"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Edit Listing Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) setEditingListing(null);
      }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product/Service</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Title *" required className="bg-white/10 border-white/20" />
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Images</label>
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
              <Input value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="Video URL" className="bg-white/10 border-white/20 mb-2" />
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
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-purple-600">{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}