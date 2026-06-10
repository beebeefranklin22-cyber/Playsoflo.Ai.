import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle, ArrowRight, ArrowLeft, Upload, Shield,
  DollarSign, Calendar, Sparkles, Star, Info, Plus,
  Building2, Clock, Image, CreditCard, ChevronRight, Loader2,
  CheckCircle2, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { PROVIDER_CATEGORIES, getCategoryById } from "./providerCategoryConfig";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ── Step IDs ─────────────────────────────────────────────────────────────────
const STEPS = ["category", "profile", "availability", "service", "payment", "media", "done"];

const DEFAULT_HOURS = { enabled: true, start: "09:00", end: "18:00" };
const DEFAULT_AVAILABILITY = {
  monday: { ...DEFAULT_HOURS },
  tuesday: { ...DEFAULT_HOURS },
  wednesday: { ...DEFAULT_HOURS },
  thursday: { ...DEFAULT_HOURS },
  friday: { ...DEFAULT_HOURS },
  saturday: { enabled: false, start: "10:00", end: "15:00" },
  sunday: { enabled: false, start: "10:00", end: "15:00" },
};

export default function ProviderOnboardingFlow({ currentUser, onComplete, onSkip }) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // Selected category config
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const category = getCategoryById(selectedCategoryId);

  // Profile
  const [profile, setProfile] = useState({
    provider_business_name: currentUser?.provider_business_name || "",
    provider_phone: currentUser?.provider_phone || "",
    provider_business_address: currentUser?.provider_business_address || "",
    provider_website: currentUser?.provider_website || "",
    subcategory: "",
    service_area: "",
  });

  // Availability
  const [availability, setAvailability] = useState({ ...DEFAULT_AVAILABILITY });

  // Service listing
  const [service, setService] = useState({
    title: "",
    description: "",
    price: "",
    duration: "",
    price_type: "fixed",
  });

  // Media & bio
  const [bio, setBio] = useState(currentUser?.about_us || "");
  const [galleryImages, setGalleryImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Payment
  const [stripeConnected] = useState(!!currentUser?.stripe_account_id);

  // When category is picked, pre-fill service template
  useEffect(() => {
    if (!category) return;
    const tpl = category.serviceTemplates[0];
    setService({
      title: tpl.title,
      description: "",
      price: String(tpl.price),
      duration: String(tpl.duration),
      price_type: tpl.price_type,
    });
  }, [selectedCategoryId]);

  const totalSteps = STEPS.length;
  const progress = ((stepIdx) / (totalSteps - 1)) * 100;
  const currentStep = STEPS[stepIdx];

  const next = () => setStepIdx((i) => Math.min(i + 1, totalSteps - 1));
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  const saveProfile = async () => {
    if (!profile.provider_business_name || !profile.provider_phone) {
      toast.error("Business name and phone are required");
      return false;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        provider_business_name: profile.provider_business_name,
        provider_phone: profile.provider_phone,
        provider_business_address: profile.provider_business_address,
        provider_website: profile.provider_website,
        provider_category: category?.id || "",
        service_area: profile.service_area,
        is_provider: true,
      });
      return true;
    } catch {
      toast.error("Failed to save profile");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.ProviderAvailability.filter({ provider_email: currentUser.email });
      const payload = { provider_email: currentUser.email, ...availability };
      if (existing.length > 0) {
        await base44.entities.ProviderAvailability.update(existing[0].id, payload);
      } else {
        await base44.entities.ProviderAvailability.create(payload);
      }
      return true;
    } catch {
      toast.error("Failed to save availability");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveService = async () => {
    if (!service.title || !service.price) {
      toast.error("Service title and price are required");
      return false;
    }
    setSaving(true);
    try {
      await base44.entities.MarketplaceItem.create({
        title: service.title,
        description: service.description,
        price: Number(service.price),
        price_type: service.price_type,
        category: category?.marketplaceCategory || "consulting",
        provider_email: currentUser.email,
        provider_name: profile.provider_business_name || currentUser.full_name,
        availability: "available",
        service_area: profile.service_area,
        rating: 5.0,
        reviews_count: 0,
        verified_provider: false,
      });
      return true;
    } catch {
      toast.error("Failed to create service listing");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ about_us: bio });
      return true;
    } catch {
      toast.error("Failed to save bio");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.UserGallery.create({
        user_email: currentUser.email,
        media_url: file_url,
        media_type: "image",
        caption: "",
      });
      setGalleryImages((prev) => [...prev, file_url]);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const complete = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ provider_onboarding_completed: true, is_provider: true });
      toast.success("🎉 Your provider profile is live!");
      onComplete();
    } catch {
      toast.error("Failed to complete setup");
    } finally {
      setSaving(false);
    }
  };

  // Step handlers with save-then-advance
  const handleNext = async () => {
    if (currentStep === "category") {
      if (!selectedCategoryId) { toast.error("Please select a category"); return; }
      next();
    } else if (currentStep === "profile") {
      const ok = await saveProfile(); if (ok) next();
    } else if (currentStep === "availability") {
      const ok = await saveAvailability(); if (ok) next();
    } else if (currentStep === "service") {
      const ok = await saveService(); if (ok) next();
    } else if (currentStep === "payment") {
      next();
    } else if (currentStep === "media") {
      const ok = await saveMedia(); if (ok) next();
    } else if (currentStep === "done") {
      await complete();
    }
  };

  const stepLabels = ["Category", "Profile", "Hours", "Services", "Payment", "Media", "Done"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-2xl bg-gray-900 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl"
        style={{ maxHeight: "min(96dvh, 760px)" }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${category?.color || "from-purple-600 to-pink-600"} p-5 flex-shrink-0 rounded-t-3xl sm:rounded-t-3xl`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                {category ? `${category.emoji} ${category.label}` : "Provider Setup"}
              </h2>
              <p className="text-white/70 text-sm">{stepLabels[stepIdx]} — Step {stepIdx + 1} of {totalSteps}</p>
            </div>
            <button onClick={onSkip} className="text-white/60 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/20 [&>div]:bg-white" />
          {/* Mini step dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i < stepIdx ? "bg-white flex-1" : i === stepIdx ? "bg-white flex-[2]" : "bg-white/30 flex-1"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
              className="p-6 space-y-5"
            >

              {/* ── STEP: Category ─────────────────────────────────────── */}
              {currentStep === "category" && (
                <>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1">What type of provider are you?</h3>
                    <p className="text-gray-400 text-sm">Your onboarding steps and service templates will be tailored to your category. You can run multiple businesses.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PROVIDER_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedCategoryId === cat.id
                            ? "border-purple-500 bg-purple-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.emoji}</div>
                        <div className="text-white text-sm font-semibold leading-tight">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                  {category && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                      <p className="text-purple-300 text-sm font-medium mb-1">💡 {category.businessHint}</p>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP: Profile ──────────────────────────────────────── */}
              {currentStep === "profile" && (
                <>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1">Business Profile</h3>
                    <p className="text-gray-400 text-sm">This appears on your marketplace listing.</p>
                  </div>

                  {/* Category tip */}
                  {category && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-2">
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-300 text-xs">{category.tips[0]}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Field label="Business Name *">
                      <Input value={profile.provider_business_name} onChange={e => setProfile({ ...profile, provider_business_name: e.target.value })}
                        placeholder={`e.g., ${category?.subcategories?.[0] || "Your Business"} by ${currentUser?.full_name?.split(" ")[0] || "You"}`}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>

                    <Field label="Phone *">
                      <Input value={profile.provider_phone} onChange={e => setProfile({ ...profile, provider_phone: e.target.value })}
                        placeholder="+1 (305) 555-0100" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>

                    {category && (
                      <Field label="Specialty / Sub-category">
                        <Select value={profile.subcategory} onValueChange={v => setProfile({ ...profile, subcategory: v })}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select your specialty" /></SelectTrigger>
                          <SelectContent>
                            {category.subcategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}

                    <Field label="Service Area / Location">
                      <Input value={profile.service_area} onChange={e => setProfile({ ...profile, service_area: e.target.value })}
                        placeholder="e.g., Miami, Brickell, Miami Beach"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>

                    <Field label="Business Address">
                      <Input value={profile.provider_business_address} onChange={e => setProfile({ ...profile, provider_business_address: e.target.value })}
                        placeholder="123 Collins Ave, Miami Beach, FL" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>

                    <Field label="Website (optional)">
                      <Input value={profile.provider_website} onChange={e => setProfile({ ...profile, provider_website: e.target.value })}
                        placeholder="https://yourbusiness.com" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>
                  </div>
                </>
              )}

              {/* ── STEP: Availability ─────────────────────────────────── */}
              {currentStep === "availability" && (
                <>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1">Working Hours</h3>
                    <p className="text-gray-400 text-sm">{category?.availabilityNote || "Set your default availability. You can refine this later."}</p>
                  </div>
                  <div className="space-y-2">
                    {Object.keys(availability).map((day) => (
                      <div key={day} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 w-28">
                          <Switch
                            checked={availability[day].enabled}
                            onCheckedChange={v => setAvailability({ ...availability, [day]: { ...availability[day], enabled: v } })}
                          />
                          <span className="text-white text-sm capitalize">{day.slice(0, 3)}</span>
                        </div>
                        {availability[day].enabled ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input type="time" value={availability[day].start}
                              onChange={e => setAvailability({ ...availability, [day]: { ...availability[day], start: e.target.value } })}
                              className="bg-white/10 border-white/20 text-white text-sm h-8" />
                            <span className="text-gray-500 text-xs">–</span>
                            <Input type="time" value={availability[day].end}
                              onChange={e => setAvailability({ ...availability, [day]: { ...availability[day], end: e.target.value } })}
                              className="bg-white/10 border-white/20 text-white text-sm h-8" />
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── STEP: Service Listing ──────────────────────────────── */}
              {currentStep === "service" && (
                <>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1">Create Your First Listing</h3>
                    <p className="text-gray-400 text-sm">This goes live in the marketplace. {category?.pricingNote}</p>
                  </div>

                  {/* Template pills */}
                  {category && (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Quick Templates</p>
                      <div className="flex flex-wrap gap-2">
                        {category.serviceTemplates.map((tpl, i) => (
                          <button key={i} onClick={() => setService({ title: tpl.title, description: "", price: String(tpl.price), duration: String(tpl.duration), price_type: tpl.price_type })}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                              service.title === tpl.title ? "bg-purple-500/30 border-purple-500 text-purple-300" : "bg-white/5 border-white/10 text-gray-300 hover:border-white/30"
                            }`}>
                            {tpl.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Field label="Service Title *">
                      <Input value={service.title} onChange={e => setService({ ...service, title: e.target.value })}
                        placeholder="e.g., 1-Hour Portrait Session" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>

                    <Field label="Description">
                      <Textarea value={service.description} onChange={e => setService({ ...service, description: e.target.value })}
                        placeholder="What's included? What should clients expect?" rows={3}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Price (USD) *">
                        <Input type="number" value={service.price} onChange={e => setService({ ...service, price: e.target.value })}
                          placeholder="150" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                      </Field>
                      <Field label="Price Type">
                        <Select value={service.price_type} onValueChange={v => setService({ ...service, price_type: v })}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="hourly">Per Hour</SelectItem>
                            <SelectItem value="per_day">Per Day</SelectItem>
                            <SelectItem value="per_month">Per Month</SelectItem>
                            <SelectItem value="per_project">Per Project</SelectItem>
                            <SelectItem value="negotiable">Negotiable</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    {category && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          {category.tips.slice(1).map((tip, i) => (
                            <p key={i} className="text-yellow-300 text-xs">{tip}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── STEP: Payment ──────────────────────────────────────── */}
              {currentStep === "payment" && (
                <>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1">Get Paid</h3>
                    <p className="text-gray-400 text-sm">Connect Stripe to receive payments directly to your bank account.</p>
                  </div>

                  {stripeConnected ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
                      <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-white font-semibold">Stripe Connected!</p>
                      <p className="text-gray-400 text-sm mt-1">You're ready to receive payments.</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="w-8 h-8 text-purple-400" />
                        <div>
                          <p className="text-white font-semibold">Stripe Express</p>
                          <p className="text-gray-400 text-xs">Payouts in 2 business days</p>
                        </div>
                      </div>
                      <ul className="space-y-2 mb-4">
                        {["Instant payouts available", "Escrow-backed payments", "Fraud protection included", "1099 tax forms generated automatically"].map(f => (
                          <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <Button onClick={() => navigate(createPageUrl("StripeOnboarding"))}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                        <CreditCard className="w-4 h-4 mr-2" /> Connect Stripe Account
                      </Button>
                    </div>
                  )}

                  <p className="text-gray-500 text-xs text-center">You can connect Stripe later from your Provider Dashboard.</p>
                </>
              )}

              {/* ── STEP: Media & Bio ──────────────────────────────────── */}
              {currentStep === "media" && (
                <>
                  <div>
                    <h3 className="text-white text-xl font-bold mb-1">Your Story & Portfolio</h3>
                    <p className="text-gray-400 text-sm">A compelling bio and strong portfolio photos can double your bookings.</p>
                  </div>

                  <Field label="About Your Business">
                    <Textarea value={bio} onChange={e => setBio(e.target.value)}
                      placeholder={`Tell clients about your ${category?.label || "services"}, experience, what makes you stand out...`}
                      rows={5} className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                  </Field>

                  <div>
                    <p className="text-gray-400 text-sm mb-2">Portfolio Photos</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {galleryImages.map((url, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-5 text-center hover:border-purple-500/50 transition">
                        {uploadingImage ? (
                          <Loader2 className="w-7 h-7 text-purple-400 mx-auto mb-1 animate-spin" />
                        ) : (
                          <Upload className="w-7 h-7 text-gray-400 mx-auto mb-1" />
                        )}
                        <p className="text-gray-400 text-sm">{uploadingImage ? "Uploading..." : "Click to upload images"}</p>
                      </div>
                    </label>
                  </div>
                </>
              )}

              {/* ── STEP: Done ─────────────────────────────────────────── */}
              {currentStep === "done" && (
                <div className="text-center py-6 space-y-6">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${category?.color || "from-purple-600 to-pink-600"} flex items-center justify-center mx-auto`}>
                    <span className="text-4xl">{category?.emoji || "🎉"}</span>
                  </div>
                  <div>
                    <h3 className="text-white text-2xl font-bold mb-2">You're All Set!</h3>
                    <p className="text-gray-400">Your <strong className="text-white">{profile.provider_business_name || "provider profile"}</strong> is ready to go live on the marketplace.</p>
                  </div>

                  {/* Summary */}
                  <div className="bg-white/5 rounded-2xl p-5 text-left space-y-3">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Setup Summary</p>
                    {[
                      { label: "Category", value: category ? `${category.emoji} ${category.label}` : "—" },
                      { label: "Business", value: profile.provider_business_name || "—" },
                      { label: "Service Created", value: service.title || "—" },
                      { label: "Payment", value: stripeConnected ? "✅ Connected" : "⏳ Pending" },
                      { label: "Portfolio", value: galleryImages.length > 0 ? `${galleryImages.length} photo(s)` : "Skipped" },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">{row.label}</span>
                        <span className="text-white text-sm font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <p className="text-purple-300 text-sm">💡 Want to manage multiple businesses? Head to your Provider Dashboard and click <strong>"Add Another Business"</strong>.</p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex-shrink-0 flex gap-3 p-5 pt-3 border-t border-white/10 bg-gray-900 rounded-b-3xl">
          {stepIdx > 0 && currentStep !== "done" && (
            <Button variant="outline" onClick={back} className="bg-white/5 border-white/20 text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={saving}
            className={`flex-1 bg-gradient-to-r ${category?.color || "from-purple-600 to-pink-600"} text-white font-semibold`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : currentStep === "done" ? (
              <><CheckCircle className="w-4 h-4 mr-2" /> Go to Provider Dashboard</>
            ) : currentStep === "payment" && !stripeConnected ? (
              <>Skip for Now <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : (
              <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Small helper
function Field({ label, children }) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}