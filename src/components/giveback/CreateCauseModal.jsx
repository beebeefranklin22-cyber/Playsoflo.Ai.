import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Upload, Plus, Heart, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const causeTypeOptions = [
  { value: "single_mothers", label: "Single Mothers" },
  { value: "families_in_need", label: "Families in Need" },
  { value: "homeless_support", label: "Homeless Support" },
  { value: "veterans_support", label: "Veterans Support" },
  { value: "charities", label: "Charities" },
  { value: "churches", label: "Churches & Faith" },
  { value: "food_banks", label: "Food Banks" },
  { value: "rehab_shelter", label: "Rehab & Shelter" },
  { value: "senior_care", label: "Senior Care" },
  { value: "community_health", label: "Community Health" },
  { value: "community_projects", label: "Community Projects" },
  { value: "restoration_services", label: "Restoration Services" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "community_assets", label: "Community Assets" },
  { value: "job_creation", label: "Job Creation" },
  { value: "education_scholarships", label: "Education & Scholarships" },
  { value: "youth_programs", label: "Youth Programs" },
  { value: "disaster_relief", label: "Disaster Relief" },
  { value: "humanitarian_aid", label: "Humanitarian Aid" },
  { value: "environmental_conservation", label: "Environmental Conservation" },
  { value: "long_term_initiative", label: "Long-term Initiative" }
];

export default function CreateCauseModal({ onClose, editCause = null }) {
  const qc = useQueryClient();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [form, setForm] = useState({
    title: editCause?.title || "",
    cause_type: editCause?.cause_type || "charities",
    description: editCause?.description || "",
    story: editCause?.story || "",
    goal_usd: editCause?.goal_usd || "",
    image_url: editCause?.image_url || "",
    photos: editCause?.photos || [],
    location: editCause?.location || "",
    contact_email: editCause?.contact_email || "",
    website: editCause?.website || "",
    long_term_initiative: editCause?.long_term_initiative || false,
    community_owned: editCause?.community_owned || false,
    beneficiary_count: editCause?.beneficiary_count || ""
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const data = {
        ...form,
        goal_usd: form.goal_usd ? Number(form.goal_usd) : undefined,
        beneficiary_count: form.beneficiary_count ? Number(form.beneficiary_count) : undefined,
        creator_email: user.email,
        creator_name: user.full_name,
        is_active: true
      };
      if (editCause) {
        return base44.entities.Donation.update(editCause.id, data);
      }
      return base44.entities.Donation.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donations"] });
      toast.success(editCause ? "Cause updated!" : "Your cause is now live! 🎉");
      onClose();
    },
    onError: (e) => toast.error("Failed to save: " + e.message)
  });

  const uploadCover = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
    } finally { setUploadingCover(false); }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photos: [...f.photos, file_url] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl overflow-hidden my-4"
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">{editCause ? "Edit Cause" : "Create a Cause"}</h2>
              <p className="text-emerald-100 text-sm">Share your story and receive community support</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm mb-1 block">Cause Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Help the Martinez Family Rebuild" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Category *</label>
              <Select value={form.cause_type} onValueChange={v => setForm(f => ({ ...f, cause_type: v }))}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {causeTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Fundraising Goal ($)</label>
              <Input type="number" value={form.goal_usd} onChange={e => setForm(f => ({ ...f, goal_usd: e.target.value }))} placeholder="e.g., 5000" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Short Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A brief summary of your cause (2-3 sentences)..." rows={3} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm" />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Full Story / Background</label>
            <textarea value={form.story} onChange={e => setForm(f => ({ ...f, story: e.target.value }))} placeholder="Tell people the full story — who you are, why this cause matters, how funds will be used, what the impact will be..." rows={5} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm" />
          </div>

          {/* Cover Image */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Cover Image</label>
            {form.image_url && (
              <div className="relative inline-block mb-2">
                <img src={form.image_url} alt="cover" className="w-48 h-32 object-cover rounded-xl border border-white/20" />
                <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" disabled={uploadingCover} onClick={() => document.getElementById("cause-cover").click()}>
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}Upload Cover
              </Button>
              <input id="cause-cover" type="file" accept="image/*" className="hidden" onChange={e => uploadCover(e.target.files?.[0])} />
            </div>
          </div>

          {/* Additional Photos */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Additional Photos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt={`photo-${i}`} className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                  <button onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => document.getElementById("cause-photos").click()} className="w-20 h-20 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition">
                <Plus className="w-6 h-6" />
              </button>
            </div>
            <input id="cause-photos" type="file" accept="image/*" className="hidden" onChange={e => uploadPhoto(e.target.files?.[0])} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Location</label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Miami, FL" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Contact Email</label>
              <Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="contact@cause.org" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Website (Optional)</label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">People Helped</label>
              <Input type="number" value={form.beneficiary_count} onChange={e => setForm(f => ({ ...f, beneficiary_count: e.target.value }))} placeholder="Estimated beneficiaries" className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <Switch checked={form.long_term_initiative} onCheckedChange={v => setForm(f => ({ ...f, long_term_initiative: v }))} />
              <div>
                <div className="text-white text-sm font-medium">Long-term / Ongoing Initiative</div>
                <div className="text-gray-400 text-xs">This cause runs indefinitely</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <Switch checked={form.community_owned} onCheckedChange={v => setForm(f => ({ ...f, community_owned: v }))} />
              <div>
                <div className="text-white text-sm font-medium">Community Owned</div>
                <div className="text-gray-400 text-xs">Open to fractional community ownership model</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.title || !form.description}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Heart className="w-4 h-4 mr-2" />{editCause ? "Save Changes" : "Launch Cause"}</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}