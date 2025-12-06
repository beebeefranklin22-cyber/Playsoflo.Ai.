import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, ChevronLeft, Upload, Edit2, Trash2, Check, X,
  Image as ImageIcon, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProviderListings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [listingForm, setListingForm] = useState({
    title: "",
    category: "barber_beauty",
    description: "",
    provider_name: "",
    price_type: "hourly",
    price: 0,
    price_in_soflo: 0,
    image_url: "",
    portfolio_images: [],
    location: "",
    response_time: "within 24 hours",
    availability: "available",
    instant_booking: false,
    escrow_required: false
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setListingForm(prev => ({ 
        ...prev, 
        provider_name: user.full_name || user.email 
      }));
    }).catch(() => {});
  }, []);

  const { data: myListings = [] } = useQuery({
    queryKey: ['my-listings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MarketplaceItem.filter({
        created_by: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createListingMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MarketplaceItem.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-listings']);
      setShowCreateModal(false);
      resetForm();
      alert('✅ Listing created successfully!');
    }
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.MarketplaceItem.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-listings']);
      setEditingListing(null);
      resetForm();
      alert('✅ Listing updated successfully!');
    }
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.MarketplaceItem.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-listings']);
      alert('✅ Listing deleted successfully!');
    }
  });

  const handleImageUpload = async (file, isPortfolio = false) => {
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (isPortfolio) {
        setListingForm(prev => ({
          ...prev,
          portfolio_images: [...(prev.portfolio_images || []), file_url]
        }));
      } else {
        setListingForm(prev => ({ ...prev, image_url: file_url }));
      }
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!listingForm.title || !listingForm.description || !listingForm.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingListing) {
      updateListingMutation.mutate({
        id: editingListing.id,
        data: listingForm
      });
    } else {
      createListingMutation.mutate(listingForm);
    }
  };

  const handleEdit = (listing) => {
    setEditingListing(listing);
    setListingForm({
      title: listing.title,
      category: listing.category,
      description: listing.description,
      provider_name: listing.provider_name,
      price_type: listing.price_type,
      price: listing.price,
      price_in_soflo: listing.price_in_soflo || 0,
      image_url: listing.image_url,
      portfolio_images: listing.portfolio_images || [],
      location: listing.location || "",
      response_time: listing.response_time || "within 24 hours",
      availability: listing.availability,
      instant_booking: listing.instant_booking || false,
      escrow_required: listing.escrow_required || false
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setListingForm({
      title: "",
      category: "barber_beauty",
      description: "",
      provider_name: currentUser?.full_name || currentUser?.email || "",
      price_type: "hourly",
      price: 0,
      price_in_soflo: 0,
      image_url: "",
      portfolio_images: [],
      location: "",
      response_time: "within 24 hours",
      availability: "available",
      instant_booking: false,
      escrow_required: false
    });
  };

  const categories = [
    { value: "barber_beauty", label: "Barber & Beauty" },
    { value: "wellness", label: "Wellness" },
    { value: "home_services", label: "Home Services" },
    { value: "personal_chef", label: "Personal Chef" },
    { value: "chauffeur", label: "Chauffeur" },
    { value: "property_rental", label: "Property Rental" },
    { value: "event_planning", label: "Event Planning" },
    { value: "photography", label: "Photography" },
    { value: "fitness_training", label: "Fitness Training" },
    { value: "music_lessons", label: "Music Lessons" },
    { value: "graphic_design", label: "Graphic Design" },
    { value: "web_development", label: "Web Development" },
    { value: "app_development", label: "App Development" },
    { value: "audio_engineering", label: "Audio Engineering" },
    { value: "session_musician", label: "Session Musician" },
    { value: "songwriting", label: "Songwriting" },
    { value: "personal_stylist", label: "Personal Stylist" },
    { value: "yacht_charter", label: "Yacht Charter" },
    { value: "private_aviation", label: "Private Aviation" },
    { value: "catering", label: "Catering" },
    { value: "bartending", label: "Bartending" },
    { value: "dj_entertainment", label: "DJ Entertainment" },
    { value: "event_decor", label: "Event Decor" },
    { value: "video_production", label: "Video Production" },
    { value: "animation_services", label: "Animation Services" },
    { value: "content_writing", label: "Content Writing" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(createPageUrl("ProviderHub"))}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white">My Listings</h1>
            <p className="text-gray-300">Manage your marketplace offerings</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditingListing(null);
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Listing
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-white">{myListings.length}</p>
              <p className="text-gray-400 text-sm">Total Listings</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-white">
                {myListings.filter(l => l.availability === 'available').length}
              </p>
              <p className="text-gray-400 text-sm">Available</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-white">
                {myListings.reduce((sum, l) => sum + (l.reviews_count || 0), 0)}
              </p>
              <p className="text-gray-400 text-sm">Total Reviews</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-white">
                {myListings.filter(l => l.verified_provider).length}
              </p>
              <p className="text-gray-400 text-sm">Verified</p>
            </CardContent>
          </Card>
        </div>

        {/* Listings Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {myListings.map((listing) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                <div className="relative h-48">
                  <img
                    src={listing.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600"}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge className={
                      listing.availability === 'available' ? 'bg-green-500/90 text-white' :
                      listing.availability === 'limited' ? 'bg-yellow-500/90 text-white' :
                      'bg-red-500/90 text-white'
                    }>
                      {listing.availability}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-white font-bold text-lg mb-2">{listing.title}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {listing.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-purple-400 font-bold text-xl">
                        ${listing.price}
                        <span className="text-gray-400 text-sm ml-1">
                          /{listing.price_type}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-white font-medium">
                        {listing.rating || 'New'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(listing)}
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this listing?')) {
                          deleteListingMutation.mutate(listing.id);
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {myListings.length === 0 && (
          <div className="text-center py-20">
            <Plus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No listings yet</h3>
            <p className="text-gray-400 mb-6">Create your first marketplace listing</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Listing
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-bold text-white mb-6">
                {editingListing ? 'Edit Listing' : 'Create New Listing'}
              </h2>

              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Title *</label>
                  <Input
                    value={listingForm.title}
                    onChange={(e) => setListingForm({...listingForm, title: e.target.value})}
                    placeholder="e.g., Professional Haircut & Styling"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Category & Price Type */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Category *</label>
                    <Select value={listingForm.category} onValueChange={(v) => setListingForm({...listingForm, category: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Price Type *</label>
                    <Select value={listingForm.price_type} onValueChange={(v) => setListingForm({...listingForm, price_type: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="per_day">Per Day</SelectItem>
                        <SelectItem value="per_month">Per Month</SelectItem>
                        <SelectItem value="per_project">Per Project</SelectItem>
                        <SelectItem value="negotiable">Negotiable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Price (USD) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={listingForm.price}
                      onChange={(e) => setListingForm({...listingForm, price: Number(e.target.value)})}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Price (SoFloCoin)</label>
                    <Input
                      type="number"
                      value={listingForm.price_in_soflo}
                      onChange={(e) => setListingForm({...listingForm, price_in_soflo: Number(e.target.value)})}
                      placeholder="0"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Description *</label>
                  <Textarea
                    value={listingForm.description}
                    onChange={(e) => setListingForm({...listingForm, description: e.target.value})}
                    rows={4}
                    placeholder="Describe your service in detail..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Location</label>
                  <Input
                    value={listingForm.location}
                    onChange={(e) => setListingForm({...listingForm, location: e.target.value})}
                    placeholder="e.g., Miami, FL"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Main Image Upload */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Main Image</label>
                  {listingForm.image_url ? (
                    <div className="relative">
                      <img src={listingForm.image_url} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                      <button
                        onClick={() => setListingForm({...listingForm, image_url: ""})}
                        className="absolute top-2 right-2 p-2 bg-red-500 rounded-full"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="main-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files?.[0])}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => document.getElementById('main-image').click()}
                        disabled={uploadingImage}
                        className="w-full bg-white/10 border border-white/20"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingImage ? 'Uploading...' : 'Upload Main Image'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Portfolio Images */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Portfolio Images (optional)</label>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    {listingForm.portfolio_images?.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt={`Portfolio ${idx}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={() => {
                            setListingForm(prev => ({
                              ...prev,
                              portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    id="portfolio-images"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], true)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('portfolio-images').click()}
                    disabled={uploadingImage}
                    variant="outline"
                    className="bg-white/5"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Add Portfolio Image
                  </Button>
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Availability</label>
                    <Select value={listingForm.availability} onValueChange={(v) => setListingForm({...listingForm, availability: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited Availability</SelectItem>
                        <SelectItem value="booked">Fully Booked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Response Time</label>
                    <Input
                      value={listingForm.response_time}
                      onChange={(e) => setListingForm({...listingForm, response_time: e.target.value})}
                      placeholder="e.g., within 24 hours"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={listingForm.instant_booking}
                      onChange={(e) => setListingForm({...listingForm, instant_booking: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span className="text-white">Instant Booking</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={listingForm.escrow_required}
                      onChange={(e) => setListingForm({...listingForm, escrow_required: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span className="text-white">Require Escrow</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingListing(null);
                      resetForm();
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createListingMutation.isLoading || updateListingMutation.isLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    {editingListing ? 'Update Listing' : 'Create Listing'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}