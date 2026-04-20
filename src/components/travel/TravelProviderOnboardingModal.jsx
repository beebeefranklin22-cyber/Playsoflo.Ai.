import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export default function TravelProviderOnboardingModal({ category, categoryLabel, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    price_type: "per_hour",
    location: "",
    capacity: "",
    specs: "",
    images: [],
    add_ons: [],
    provider_phone: "",
  });
  const [newAddon, setNewAddon] = useState({ name: "", price: "", description: "" });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.TravelListing.create({
        ...data,
        category,
        provider_email: user.email,
        provider_name: user.full_name,
        is_active: true,
      });
    },
    onSuccess,
    onError: (e) => toast.error(e.message || "Failed to create listing"),
  });

  const handleUpload = async (files, gallery = false) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setForm(prev => ({ ...prev, images: [...prev.images, file_url] }));
      }
      toast.success("Photo uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.title || !form.price) {
      toast.error("Please fill in title and price");
      return;
    }
    createMutation.mutate({
      ...form,
      price: Number(form.price),
      capacity: Number(form.capacity) || undefined,
    });
  };

  const addAddon = () => {
    if (!newAddon.name || !newAddon.price) return;
    setForm(prev => ({ ...prev, add_ons: [...prev.add_ons, { ...newAddon, price: Number(newAddon.price) }] }));
    setNewAddon({ name: "", price: "", description: "" });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" style={{ paddingBottom: '80px' }}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        className="w-full max-w-2xl bg-gray-900 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        style={{ height: "calc(100vh - 100px)", maxHeight: "calc(100vh - 100px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">List Your {categoryLabel}</h2>
            <p className="text-gray-400 text-sm">Step {step} of 3</p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 px-6 py-4 flex-shrink-0">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-white" : "bg-white/20"}`} />
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-white text-sm font-semibold mb-1 block">Service Title *</label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={`e.g. Luxury ${categoryLabel} Experience`}
                  className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-white text-sm font-semibold mb-1 block">Description *</label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Describe your service..."
                  className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-semibold mb-1 block">Price *</label>
                  <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="0" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-white text-sm font-semibold mb-1 block">Price Type</label>
                  <select value={form.price_type} onChange={e => setForm(p => ({ ...p, price_type: e.target.value }))}
                    className="w-full h-9 rounded-md bg-white/10 border border-white/20 text-white px-3 text-sm">
                    <option value="per_hour">Per Hour</option>
                    <option value="per_day">Per Day</option>
                    <option value="per_trip">Per Trip</option>
                    <option value="negotiable">Negotiable</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-semibold mb-1 block">Location</label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="Miami, FL" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-white text-sm font-semibold mb-1 block">Capacity</label>
                  <Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
                    placeholder="Max guests" className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div>
                <label className="text-white text-sm font-semibold mb-1 block">Specs / Details</label>
                <Textarea value={form.specs} onChange={e => setForm(p => ({ ...p, specs: e.target.value }))}
                  rows={2} placeholder="Year, model, features, etc."
                  className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-white text-sm font-semibold mb-1 block">Phone (optional)</label>
                <Input value={form.provider_phone} onChange={e => setForm(p => ({ ...p, provider_phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000" className="bg-white/10 border-white/20 text-white" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-gray-300 text-sm">Upload photos of your {categoryLabel.toLowerCase()}. First photo will be the cover.</p>
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-full h-24 object-cover rounded-xl" />
                      <button
                        onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">Cover</span>}
                    </div>
                  ))}
                </div>
              )}
              <input id="photo-upload" type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleUpload(e.target.files)} />
              <Button variant="outline" className="w-full border-white/20 text-white"
                onClick={() => document.getElementById("photo-upload").click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {form.images.length > 0 ? "Add More Photos" : "Upload Photos"}
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-gray-300 text-sm">Add optional add-ons customers can select when booking.</p>
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={newAddon.name} onChange={e => setNewAddon(p => ({ ...p, name: e.target.value }))}
                    placeholder="Add-on name (e.g. Catering)"
                    className="bg-white/10 border-white/20 text-white" />
                  <Input type="number" value={newAddon.price} onChange={e => setNewAddon(p => ({ ...p, price: e.target.value }))}
                    placeholder="Price ($)" className="bg-white/10 border-white/20 text-white" />
                </div>
                <Input value={newAddon.description} onChange={e => setNewAddon(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)" className="bg-white/10 border-white/20 text-white" />
                <Button onClick={addAddon} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  <Plus className="w-4 h-4 mr-2" /> Add Add-on
                </Button>
              </div>
              {form.add_ons.length > 0 && (
                <div className="space-y-2">
                  {form.add_ons.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <p className="text-white font-medium">{a.name}</p>
                        {a.description && <p className="text-gray-400 text-xs">{a.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold">${a.price}</span>
                        <button onClick={() => setForm(p => ({ ...p, add_ons: p.add_ons.filter((_, j) => j !== i) }))}>
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-white/10 flex-shrink-0" style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 border-white/20 text-white">Back</Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} className="flex-1 bg-white text-gray-900 font-bold">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1 bg-white text-gray-900 font-bold">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Publish Listing
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}