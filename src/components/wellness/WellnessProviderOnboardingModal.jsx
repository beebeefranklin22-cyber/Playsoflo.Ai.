import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Upload, Plus, Trash2, Activity, DollarSign, CheckCircle, CreditCard, Loader2, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const wellnessCategories = [
  { id: "acupuncture", label: "Acupuncture" },
  { id: "chiropractic", label: "Chiropractic Care" },
  { id: "orthodontics", label: "Orthodontics" },
  { id: "physical_therapy", label: "Physical Therapy" },
  { id: "mental_health_counseling", label: "Mental Health Counseling" },
  { id: "nutrition_counseling", label: "Nutrition Counseling" },
  { id: "massage_therapy", label: "Massage Therapy" },
  { id: "wellness", label: "General Wellness" },
  { id: "yoga_meditation", label: "Yoga & Meditation" },
  { id: "rehab", label: "Rehabilitation" },
  { id: "physical_rehabilitation", label: "Physical Rehabilitation" },
  { id: "substance_abuse_counseling", label: "Substance Abuse Support" },
  { id: "occupational_therapy", label: "Occupational Therapy" },
  { id: "speech_therapy", label: "Speech Therapy" },
  { id: "injury_care", label: "Injury Care" },
  { id: "senior_care", label: "Senior Care" },
  { id: "elder_care", label: "Elder Care" },
  { id: "hospice_care", label: "Hospice Care" },
  { id: "home_healthcare", label: "Home Healthcare" },
  { id: "mobility_assistance", label: "Mobility Assistance" },
  { id: "medical_equipment_rental", label: "Medical Equipment Rental" },
  { id: "medical_health", label: "Medical & Health" }
];

const steps = ["Profile", "Service", "Pricing", "Verification", "Payments"];

export default function WellnessProviderOnboardingModal({ onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const [profile, setProfile] = useState({
    provider_business_name: "",
    provider_phone: "",
    provider_business_address: "",
    provider_description: ""
  });

  const [service, setService] = useState({
    title: "",
    category: "wellness",
    description: "",
    image_url: "",
    portfolio_images: [],
    instant_booking: true,
    service_area: "",
    response_time: "within 1 hour"
  });

  const [pricing, setPricing] = useState({
    price: 75,
    price_type: "hourly",
    add_ons: []
  });

  const [newAddOn, setNewAddOn] = useState({ name: "", price: 0, description: "" });
  const [verification, setVerification] = useState({
    license_number: "",
    issuing_authority: "",
    verification_type: "professional_certification",
    issue_date: "",
    expiration_date: ""
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      if (u) {
        setProfile({
          provider_business_name: u.provider_business_name || "",
          provider_phone: u.provider_phone || "",
          provider_business_address: u.provider_business_address || "",
          provider_description: u.provider_description || ""
        });
      }
    }).catch(() => {});
  }, []);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      await base44.auth.updateMe({ ...profile, is_provider: true, provider_onboarding_completed: true });

      const serviceData = {
        ...service,
        ...pricing,
        provider_email: currentUser.email,
        provider_name: profile.provider_business_name || currentUser.full_name,
        verified_provider: !!verification.license_number,
        availability: "available",
        rating: 5.0,
        reviews_count: 0,
        location: profile.provider_business_address
      };
      await base44.entities.MarketplaceItem.create(serviceData);

      if (verification.license_number) {
        await base44.entities.ProviderVerification.create({
          ...verification,
          provider_email: currentUser.email,
          status: "pending"
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wellness-services"] });
      toast.success("Your wellness service is now live!");
      onClose();
    },
    onError: (e) => toast.error("Failed to publish: " + e.message)
  });

  const handleUploadImage = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setService(prev => ({ ...prev, image_url: file_url }));
      toast.success("Image uploaded!");
    } catch (e) {
      toast.error("Image upload failed: " + (e.message || "Network error"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadPortfolio = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setService(prev => ({ ...prev, portfolio_images: [...prev.portfolio_images, file_url] }));
    } catch (e) {
      toast.error("Portfolio upload failed: " + (e.message || "Network error"));
    }
  };

  const generateDescription = async () => {
    if (!service.title) { toast.error("Enter a service title first"); return; }
    setGeneratingDesc(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a professional 2-3 sentence description for a health & wellness service titled "${service.title}" in the category "${service.category}". Focus on benefits to the patient/client. Be warm and professional.`
      });
      setService(prev => ({ ...prev, description: result }));
      toast.success("Description generated!");
    } catch { toast.error("Could not generate description"); }
    finally { setGeneratingDesc(false); }
  };

  const connectStripe = async () => {
    if (!currentUser) return;
    setStripeLoading(true);
    try {
      const res = await base44.functions.invoke("createConnectedAccount", {
        email: currentUser.email,
        businessName: profile.provider_business_name || currentUser.full_name,
        country: "US"
      });
      await base44.auth.updateMe({ stripe_account_id: res.data.accountId });
      const linkRes = await base44.functions.invoke("createAccountLink", {
        accountId: res.data.accountId,
        returnUrl: window.location.href,
        refreshUrl: window.location.href
      });
      window.location.href = linkRes.data.url;
    } catch (e) {
      toast.error("Failed to connect Stripe: " + e.message);
    } finally {
      setStripeLoading(false);
    }
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
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl overflow-hidden my-4"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">List Your Health & Wellness Service</h2>
              <p className="text-green-100 text-sm">Step {step + 1} of {steps.length}: {steps[step]}</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full transition-all ${i <= step ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Step 0: Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Your Provider Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Business / Practice Name *</label>
                  <Input value={profile.provider_business_name} onChange={e => setProfile(p => ({ ...p, provider_business_name: e.target.value }))} placeholder="e.g., Miami Wellness Center" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Phone Number</label>
                  <Input value={profile.provider_phone} onChange={e => setProfile(p => ({ ...p, provider_phone: e.target.value }))} placeholder="+1 (305) 555-0100" className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Business Address</label>
                <Input value={profile.provider_business_address} onChange={e => setProfile(p => ({ ...p, provider_business_address: e.target.value }))} placeholder="123 Health Blvd, Miami, FL" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">About Your Practice</label>
                <textarea
                  value={profile.provider_description}
                  onChange={e => setProfile(p => ({ ...p, provider_description: e.target.value }))}
                  placeholder="Tell potential clients about your practice, approach, and experience..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step 1: Service */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Service Details</h3>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Service Title *</label>
                <Input value={service.title} onChange={e => setService(s => ({ ...s, title: e.target.value }))} placeholder="e.g., Deep Tissue Massage Therapy" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Service Category *</label>
                <Select value={service.category} onValueChange={v => setService(s => ({ ...s, category: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {wellnessCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-400 text-sm">Description *</label>
                  <Button size="sm" onClick={generateDescription} disabled={generatingDesc || !service.title} className="bg-purple-600 hover:bg-purple-700 h-7 text-xs">
                    {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Star className="w-3 h-3 mr-1" />}
                    AI Generate
                  </Button>
                </div>
                <textarea
                  value={service.description}
                  onChange={e => setService(s => ({ ...s, description: e.target.value }))}
                  placeholder="Describe what you offer, what's included, expected outcomes..."
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Service Area / Location</label>
                <Input value={service.service_area} onChange={e => setService(s => ({ ...s, service_area: e.target.value }))} placeholder="e.g., Miami, FL — In-office & home visits" className="bg-white/10 border-white/20 text-white" />
              </div>

              {/* Cover Image */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Cover Image *</label>
                {service.image_url && (
                  <div className="relative inline-block mb-2">
                    <img src={service.image_url} alt="cover" className="w-48 h-32 object-cover rounded-xl border border-white/20" />
                    <button onClick={() => setService(s => ({ ...s, image_url: "" }))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" disabled={uploadingImage} onClick={() => document.getElementById("wellness-cover").click()} className="flex-shrink-0">
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload Photo
                  </Button>
                  <input id="wellness-cover" type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e.target.files?.[0])} />
                  <Input placeholder="Or paste image URL" onKeyDown={e => { if (e.key === "Enter" && e.currentTarget.value) { setService(s => ({ ...s, image_url: e.currentTarget.value })); e.currentTarget.value = ""; } }} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>

              {/* Portfolio */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Portfolio / Gallery (Optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {service.portfolio_images.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`p-${i}`} className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                      <button onClick={() => setService(s => ({ ...s, portfolio_images: s.portfolio_images.filter((_, j) => j !== i) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById("wellness-portfolio").click()}>
                  <Plus className="w-4 h-4 mr-2" />Add Photo
                </Button>
                <input id="wellness-portfolio" type="file" accept="image/*" className="hidden" onChange={e => handleUploadPortfolio(e.target.files?.[0])} />
              </div>

              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                <Switch checked={service.instant_booking} onCheckedChange={v => setService(s => ({ ...s, instant_booking: v }))} />
                <div>
                  <div className="text-white text-sm font-medium">Enable Instant Booking</div>
                  <div className="text-gray-400 text-xs">Clients can book without approval</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Base Price (USD) *</label>
                  <Input type="number" value={pricing.price} onChange={e => setPricing(p => ({ ...p, price: Number(e.target.value) }))} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Price Type</label>
                  <Select value={pricing.price_type} onValueChange={v => setPricing(p => ({ ...p, price_type: v }))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Per Hour</SelectItem>
                      <SelectItem value="fixed">Fixed / Per Session</SelectItem>
                      <SelectItem value="per_day">Per Day</SelectItem>
                      <SelectItem value="per_project">Per Package</SelectItem>
                      <SelectItem value="negotiable">Negotiable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing tiers hint */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-300 text-sm font-medium mb-1">💡 Pricing Tip</p>
                <p className="text-gray-300 text-xs">Average rates in South Florida: Massage $80-120/hr • Physical Therapy $100-150/hr • Mental Health $120-200/hr • Yoga $50-90/hr</p>
              </div>

              {/* Add-ons */}
              <div>
                <label className="text-white font-medium block mb-2">Add-On Services (Optional)</label>
                {pricing.add_ons.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 mb-2">
                    <div className="flex-1">
                      <span className="text-white text-sm font-medium">{a.name}</span>
                      <span className="text-gray-400 text-xs ml-2">+${a.price}</span>
                    </div>
                    <button onClick={() => setPricing(p => ({ ...p, add_ons: p.add_ons.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Input placeholder="Add-on name" value={newAddOn.name} onChange={e => setNewAddOn(a => ({ ...a, name: e.target.value }))} className="bg-white/10 border-white/20 text-white col-span-2" />
                  <Input type="number" placeholder="$Price" value={newAddOn.price || ""} onChange={e => setNewAddOn(a => ({ ...a, price: Number(e.target.value) }))} className="bg-white/10 border-white/20 text-white" />
                </div>
                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => {
                  if (newAddOn.name && newAddOn.price > 0) {
                    setPricing(p => ({ ...p, add_ons: [...p.add_ons, { ...newAddOn, id: Date.now() }] }));
                    setNewAddOn({ name: "", price: 0, description: "" });
                  }
                }}>
                  <Plus className="w-4 h-4 mr-2" />Add Add-On
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Credentials & Verification</h3>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">Verified providers get a badge, rank higher, and earn more trust. You can skip and verify later.</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Credential Type</label>
                <Select value={verification.verification_type} onValueChange={v => setVerification(prev => ({ ...prev, verification_type: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional_certification">Professional Certification</SelectItem>
                    <SelectItem value="license_validation">State License</SelectItem>
                    <SelectItem value="health_permit">Health Permit</SelectItem>
                    <SelectItem value="background_check">Background Check</SelectItem>
                    <SelectItem value="business_registration">Business Registration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">License / Certificate #</label>
                  <Input value={verification.license_number} onChange={e => setVerification(v => ({ ...v, license_number: e.target.value }))} placeholder="e.g., MT-12345" className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Issuing Authority</label>
                  <Input value={verification.issuing_authority} onChange={e => setVerification(v => ({ ...v, issuing_authority: e.target.value }))} placeholder="Florida Board of..." className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Issue Date</label>
                  <Input type="date" value={verification.issue_date} onChange={e => setVerification(v => ({ ...v, issue_date: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Expiration Date</label>
                  <Input type="date" value={verification.expiration_date} onChange={e => setVerification(v => ({ ...v, expiration_date: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payments */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Set Up Payments</h3>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-white font-medium mb-1">Get Paid Directly</p>
                    <p className="text-gray-300 text-sm">Connect your Stripe account to receive payments from clients. Money goes directly to your bank account.</p>
                  </div>
                </div>
              </div>

              {currentUser?.stripe_account_id ? (
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Stripe Connected!</p>
                    <p className="text-gray-300 text-sm">You're ready to receive payments.</p>
                  </div>
                </div>
              ) : (
                <Button onClick={connectStripe} disabled={stripeLoading} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 py-4 text-lg">
                  {stripeLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Connecting...</> : <><CreditCard className="w-5 h-5 mr-2" />Connect Stripe & Get Paid</>}
                </Button>
              )}

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-300 text-sm font-medium mb-2">What happens after you publish:</p>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>✅ Your service goes live in the Health & Wellness marketplace</li>
                  <li>✅ Clients can book and pay you directly</li>
                  <li>✅ 5% platform fee on each transaction</li>
                  <li>✅ Payouts to your bank within 2-3 business days</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => {
                if (step === 0 && !profile.provider_business_name) { toast.error("Enter your business name"); return; }
                if (step === 1 && !service.title) { toast.error("Please enter a service title"); return; }
                setStep(s => s + 1);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              {publishMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</> : "🚀 Go Live in Marketplace"}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}