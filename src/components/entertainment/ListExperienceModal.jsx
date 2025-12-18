import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ListExperienceModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [experience, setExperience] = useState({
    title: "",
    description: "",
    category: "yacht_charter",
    price: 0,
    duration: "",
    location: "",
    capacity: 1,
    image_url: "",
    images: [],
    included_items: [],
    provider_email: currentUser?.email || ""
  });

  const [newItem, setNewItem] = useState("");

  const createExperienceMutation = useMutation({
    mutationFn: (data) => base44.entities.Experience.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['entertainment-experiences']);
      toast.success('Experience listed successfully!');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to list experience');
    }
  });

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!experience.image_url) {
        setExperience(prev => ({ ...prev, image_url: file_url }));
      } else {
        setExperience(prev => ({ ...prev, images: [...prev.images, file_url] }));
      }
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!experience.title || !experience.price || !experience.image_url || !experience.location) {
      toast.error('Please fill in all required fields and upload at least one image');
      return;
    }

    createExperienceMutation.mutate({
      ...experience,
      provider_email: currentUser.email
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 my-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-400" />
              List Your Experience
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <label className="text-white font-semibold mb-2 block">Experience Title *</label>
              <Input
                value={experience.title}
                onChange={(e) => setExperience({ ...experience, title: e.target.value })}
                placeholder="Sunset Yacht Charter Experience"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Category</label>
              <Select value={experience.category} onValueChange={(v) => setExperience({ ...experience, category: v })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yacht_charter">Yacht Charter</SelectItem>
                  <SelectItem value="exotic_car">Exotic Car Experience</SelectItem>
                  <SelectItem value="wine_tasting">Wine Tasting</SelectItem>
                  <SelectItem value="photography">Photography Session</SelectItem>
                  <SelectItem value="event_planning">Event Planning</SelectItem>
                  <SelectItem value="nightlife">Nightlife Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Description</label>
              <Textarea
                value={experience.description}
                onChange={(e) => setExperience({ ...experience, description: e.target.value })}
                placeholder="Describe your experience in detail..."
                rows={4}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Location *</label>
                <Input
                  value={experience.location}
                  onChange={(e) => setExperience({ ...experience, location: e.target.value })}
                  placeholder="Miami Beach, FL"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Duration</label>
                <Input
                  value={experience.duration}
                  onChange={(e) => setExperience({ ...experience, duration: e.target.value })}
                  placeholder="4 hours"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Price *</label>
                <Input
                  type="number"
                  value={experience.price}
                  onChange={(e) => setExperience({ ...experience, price: Number(e.target.value) })}
                  placeholder="0"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-white font-semibold mb-2 block">Max Capacity</label>
                <Input
                  type="number"
                  value={experience.capacity}
                  onChange={(e) => setExperience({ ...experience, capacity: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="text-white font-semibold mb-2 block">Photos *</label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {experience.image_url && (
                  <div className="relative">
                    <img src={experience.image_url} className="w-full h-24 object-cover rounded-lg border-2 border-purple-500" />
                    <div className="absolute top-1 left-1 px-2 py-0.5 bg-purple-500 rounded text-xs text-white">Main</div>
                  </div>
                )}
                {experience.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={() => setExperience(prev => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== idx)
                      }))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                id="exp-images"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => document.getElementById('exp-images').click()}
                disabled={uploading}
                variant="outline"
                className="w-full"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Photos
              </Button>
            </div>

            {/* What's Included */}
            <div>
              <label className="text-white font-semibold mb-2 block">What's Included</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newItem.trim()) {
                      e.preventDefault();
                      setExperience(prev => ({ ...prev, included_items: [...prev.included_items, newItem.trim()] }));
                      setNewItem("");
                    }
                  }}
                  placeholder="Champagne, Catering, etc."
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newItem.trim()) {
                      setExperience(prev => ({ ...prev, included_items: [...prev.included_items, newItem.trim()] }));
                      setNewItem("");
                    }
                  }}
                  className="bg-purple-600"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {experience.included_items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
                    <span className="text-white text-sm">{item}</span>
                    <button
                      onClick={() => setExperience(prev => ({
                        ...prev,
                        included_items: prev.included_items.filter((_, i) => i !== idx)
                      }))}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createExperienceMutation.isPending || uploading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {createExperienceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Listing...
                </>
              ) : (
                'List Experience'
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}