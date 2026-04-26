import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, X, Shield, CheckCircle, AlertCircle,
  Award, FileText, Calendar, TrendingUp, Plus, User, List,
  DollarSign, Star, CreditCard, Loader2, Sparkles, Clock, ExternalLink
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BookingRequestsSection from "../provider/BookingRequestsSection";
import EarningsSection from "../provider/EarningsSection";
import PerformanceDashboard from "../provider/PerformanceDashboard";
import ProviderChatSection from "../provider/ProviderChatSection";
import PortfolioSection from "./PortfolioSection";
import ServiceVariationsManager from "../provider/ServiceVariationsManager";
import ServiceAddOnsManager from "../provider/ServiceAddOnsManager";
import AvailabilityOverridesManager from "../provider/AvailabilityOverridesManager";
import RentalAssetManager from "../provider/RentalAssetManager";
import RentalCalendar from "../provider/RentalCalendar";
import ServicePackageManager from "../provider/ServicePackageManager";
import ProviderPayoutManager from "../provider/ProviderPayoutManager";
import DashboardMetrics from "../provider/DashboardMetrics";
import RentalNotifications from "../provider/RentalNotifications";
import StripeExpressDashboard from "../provider/StripeExpressDashboard";
import ActiveRentalsManager from "../provider/ActiveRentalsManager";
import ContractTemplateManager from "../provider/ContractTemplateManager";
import AdvancedAnalytics from "../provider/AdvancedAnalytics";
import BusinessReportGenerator from "../provider/BusinessReportGenerator";
import FinancialDataExport from "../provider/FinancialDataExport";
import MultiAssetDashboard from "../provider/MultiAssetDashboard";

const rentalCategories = [
  "property_rental", "equipment_rental", "yacht_charter",
  "private_aviation", "bounce_house_rental", "party_rental", "photo_booth_rental"
];
const isRentalCategory = (cat) => rentalCategories.includes(cat);

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800"
};
const statusIcons = { pending: Clock, verified: CheckCircle, rejected: AlertCircle, expired: AlertCircle };

export default function BusinessHubProviderSection({ currentUser }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [stripeOnboarding, setStripeOnboarding] = useState(false);
  const [brand, setBrand] = useState({ provider_brand_name: "", provider_description: "", provider_logo_url: "" });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [sortBy, setSortBy] = useState("created_date");
  const [filterCategory, setFilterCategory] = useState("all");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingPricing, setGeneratingPricing] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    verification_type: "background_check", license_number: "", issuing_authority: "",
    issue_date: "", expiration_date: "", document_urls: []
  });
  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: "monday", is_available: true, start_time: "09:00", end_time: "17:00",
    break_start: "", break_end: "", slot_duration_minutes: 60
  });
  const [form, setForm] = useState({
    title: "", category: "consulting", price: 100, price_type: "fixed",
    image_url: "", description: "", escrow_required: false,
    portfolio_images: [], variations: [], add_ons: [], is_rental: false,
    rental_details: {}, blocked_dates: []
  });

  useEffect(() => {
    if (currentUser) {
      setBrand({
        provider_brand_name: currentUser.provider_brand_name || "",
        provider_description: currentUser.provider_description || "",
        provider_logo_url: currentUser.provider_logo_url || ""
      });
    }
  }, [currentUser]);

  const { data: myServices = [] } = useQuery({
    queryKey: ["my-services"],
    queryFn: () => base44.entities.MarketplaceItem.list(),
    initialData: []
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ["provider-bookings"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceBooking.filter({ provider_email: currentUser.email });
    },
    enabled: !!currentUser,
    refetchOnWindowFocus: false, staleTime: 60000, initialData: []
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['provider-unread-messages', currentUser?.email],
    queryFn: async () => {
      const msgs = await base44.entities.DirectMessage.filter({ recipient_email: currentUser.email, read: false });
      return msgs.length;
    },
    enabled: !!currentUser, refetchOnWindowFocus: false, staleTime: 60000
  });

  const { data: unreadBookingRequests = 0 } = useQuery({
    queryKey: ['provider-unread-bookings', currentUser?.email],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter({ recipient_email: currentUser.email, type: 'booking_request', read: false });
      return notifs.length;
    },
    enabled: !!currentUser, refetchOnWindowFocus: false, staleTime: 60000
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["my-availability"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ProviderAvailability.filter({ provider_email: currentUser.email });
    },
    enabled: !!currentUser, initialData: []
  });

  const { data: verifications = [] } = useQuery({
    queryKey: ["my-verifications"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ProviderVerification.filter({ provider_email: currentUser.email });
    },
    enabled: !!currentUser, initialData: []
  });

  const verifiedCount = verifications.filter(v => v.status === "verified").length;

  const createStripeAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createConnectedAccount', {
        email: currentUser.email,
        businessName: currentUser.provider_business_name || currentUser.full_name,
        country: 'US'
      });
      await base44.auth.updateMe({ stripe_account_id: response.data.accountId });
      return response.data.accountId;
    },
    onSuccess: async (accountId) => {
      const linkResponse = await base44.functions.invoke('createAccountLink', {
        accountId,
        returnUrl: `${window.location.origin}${createPageUrl('ProviderHub')}?onboarding=success`,
        refreshUrl: `${window.location.origin}${createPageUrl('ProviderHub')}?onboarding=refresh`
      });
      window.location.href = linkResponse.data.url;
    },
    onError: (error) => {
      toast.error('Failed to create Stripe account: ' + error.message);
      setStripeOnboarding(false);
    }
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data) => base44.entities.ProviderVerification.create({ ...data, provider_email: currentUser.email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-verifications"] });
      toast.success("Verification request submitted!");
      setVerificationForm({ verification_type: "background_check", license_number: "", issuing_authority: "", issue_date: "", expiration_date: "", document_urls: [] });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const serviceData = {
        ...data,
        provider_email: currentUser.email,
        provider_name: currentUser.provider_business_name || currentUser.full_name,
        verified_provider: verifiedCount > 0,
        availability: "available", rating: 5.0, reviews_count: 0, response_time: "within 1 hour"
      };
      return base44.entities.MarketplaceItem.create(serviceData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      qc.invalidateQueries({ queryKey: ["marketplace-items"] });
      setForm({ title: "", category: "consulting", price: 100, price_type: "fixed", image_url: "", description: "", escrow_required: false, portfolio_images: [], variations: [], add_ons: [], is_rental: false, rental_details: {}, blocked_dates: [] });
      toast.success("Service published to marketplace!");
    },
    onError: (error) => toast.error("Failed to publish: " + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketplaceItem.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-services"] }); setEditingId(null); setEditData(null); toast.success("Service updated!"); }
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (data) => {
      const existing = availability.find(a => a.day_of_week === data.day_of_week);
      if (existing) return await base44.entities.ProviderAvailability.update(existing.id, data);
      return await base44.entities.ProviderAvailability.create({ ...data, provider_email: currentUser.email });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-availability"] }); toast.success("Availability saved!"); }
  });

  const generateDescription = async () => {
    if (!form.title || !form.category) { toast.error('Enter a title and category first'); return; }
    setGeneratingDescription(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a compelling 2-3 sentence service description for: Title: ${form.title}, Category: ${form.category}. Professional, benefit-focused, end with a call to action. Only the description text.`,
      });
      setForm({ ...form, description: response });
      toast.success('Description generated!');
    } catch { toast.error('Failed to generate description'); }
    finally { setGeneratingDescription(false); }
  };

  const suggestPricing = async () => {
    if (!form.title || !form.category) { toast.error('Enter a title and category first'); return; }
    setGeneratingPricing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest a market price in USD for: Service: ${form.title}, Category: ${form.category}, Price Type: ${form.price_type}. Respond with ONLY a number.`,
        add_context_from_internet: true
      });
      const price = parseFloat(response.trim());
      if (!isNaN(price)) { setForm({ ...form, price }); toast.success(`Suggested: $${price}`); }
    } catch { toast.error('Failed to suggest pricing'); }
    finally { setGeneratingPricing(false); }
  };

  const handleUpload = async (file, field) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (field === "image_url") setForm(p => ({ ...p, image_url: file_url }));
    else if (field === "portfolio") setForm(p => ({ ...p, portfolio_images: [...(p.portfolio_images || []), file_url] }));
  };
  const handleEditUpload = async (file, field) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (field === "image_url") setEditData(p => ({ ...p, image_url: file_url }));
    else if (field === "portfolio") setEditData(p => ({ ...p, portfolio_images: [...(p.portfolio_images || []), file_url] }));
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const verificationLevelColors = {
    none: "from-gray-500/20 to-gray-600/20 border-gray-500/30",
    basic: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    standard: "from-green-500/20 to-green-600/20 border-green-500/30",
    premium: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    elite: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30"
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg">Provider Hub</h3>
          <p className="text-gray-400 text-sm">List and manage your services in the marketplace</p>
        </div>
        <Link to={createPageUrl("ProviderProfile")}>
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> Public Profile
          </Button>
        </Link>
      </div>

      {/* Stripe banner */}
      {!currentUser?.stripe_account_id && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Connect Stripe to receive payments</p>
              <p className="text-gray-400 text-xs">Set up your payout account to start earning</p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setStripeOnboarding(true); createStripeAccountMutation.mutate(); }}
            disabled={stripeOnboarding} className="bg-green-600 hover:bg-green-700 flex-shrink-0">
            {stripeOnboarding ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Connecting...</> : "Connect"}
          </Button>
        </div>
      )}

      {/* Onboarding banner */}
      {!currentUser?.provider_onboarding_completed && (
        <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">Complete your provider setup</p>
              <p className="text-gray-400 text-xs">Set up your profile, availability, and first service</p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(createPageUrl("ProviderOnboarding"))}
            className="bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
            Get Started
          </Button>
        </div>
      )}

      {/* Trust score */}
      <div className={`bg-gradient-to-r ${verificationLevelColors[currentUser?.provider_verification_level || "none"]} border rounded-2xl p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-white" />
          <div>
            <p className="text-white font-semibold">
              {currentUser?.provider_verification_level === "none" || !currentUser?.provider_verification_level
                ? "Get Verified" : `${currentUser?.provider_verification_level?.toUpperCase()} Verified`}
            </p>
            <p className="text-gray-300 text-xs">Trust Score: {currentUser?.provider_trust_score || 0}/100 · {verifiedCount} verification{verifiedCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setActiveTab("verification")} className="border-white/20 text-white hover:bg-white/10">
          {verifiedCount === 0 ? "Get Verified" : "Manage"}
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "My Listings", icon: List, tab: null, href: "ProviderListings", gradient: "from-purple-600 to-pink-600" },
          { label: "Add Service", icon: Plus, tab: "services", gradient: "from-indigo-600 to-blue-600" },
          { label: "Requests", icon: Calendar, tab: "requests", gradient: "from-green-600 to-teal-600" },
          { label: "Earnings", icon: DollarSign, tab: "earnings", gradient: "from-yellow-600 to-orange-600" },
        ].map(({ label, icon: Icon, tab, href, gradient }) => (
          href
            ? <Link key={label} to={createPageUrl(href)}>
                <button className={`w-full bg-gradient-to-r ${gradient} rounded-xl py-3 flex flex-col items-center gap-1 text-white text-xs font-medium hover:opacity-90 transition`}>
                  <Icon className="w-5 h-5" />{label}
                </button>
              </Link>
            : <button key={label} onClick={() => setActiveTab(tab)}
                className={`bg-gradient-to-r ${gradient} rounded-xl py-3 flex flex-col items-center gap-1 text-white text-xs font-medium hover:opacity-90 transition`}>
                <Icon className="w-5 h-5" />{label}
              </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="inline-flex w-auto min-w-full bg-white/10 border border-white/10 p-1 gap-1 rounded-2xl">
            {[
              { value: "dashboard", label: "Dashboard" },
              { value: "services", label: `Services (${myServices.length})` },
              { value: "requests", label: "Requests", badge: unreadBookingRequests },
              { value: "messages", label: "Messages", badge: unreadMessages },
              { value: "earnings", label: "Earnings" },
              { value: "assets", label: "Assets" },
              { value: "portfolio", label: "Portfolio" },
              { value: "availability", label: "Availability" },
              { value: "verification", label: "Verification" },
              { value: "contracts", label: "Contracts" },
              { value: "profile", label: "Profile" },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="relative whitespace-nowrap text-xs px-3 py-1.5">
                {t.label}
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <DashboardMetrics currentUser={currentUser} />
          <RentalNotifications currentUser={currentUser} />
          <StripeExpressDashboard currentUser={currentUser} />
          <AdvancedAnalytics currentUser={currentUser} />
          <BusinessReportGenerator currentUser={currentUser} />
          <FinancialDataExport currentUser={currentUser} />
          <PerformanceDashboard currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="services" className="space-y-4 mt-4">
          <ServicePackageManager myServices={myServices} currentUser={currentUser} />

          {/* Brand profile */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-white font-semibold">Brand Profile</h4>
            <Input placeholder="Business Name" value={brand.provider_brand_name} onChange={e => setBrand({...brand, provider_brand_name: e.target.value})} className="bg-white/10 border-white/20 text-white" />
            <Input placeholder="Logo URL" value={brand.provider_logo_url} onChange={e => setBrand({...brand, provider_logo_url: e.target.value})} className="bg-white/10 border-white/20 text-white" />
            <Input placeholder="About Your Business" value={brand.provider_description} onChange={e => setBrand({...brand, provider_description: e.target.value})} className="bg-white/10 border-white/20 text-white" />
            <Button onClick={async () => { await base44.auth.updateMe(brand); toast.success("Brand saved!"); }} className="bg-purple-600 hover:bg-purple-700 w-full">Save Brand Profile</Button>
          </div>

          {/* Add new service */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <h4 className="text-white font-semibold">Add New Service / Product</h4>
            <Input placeholder="Service/Product Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="bg-white/10 border-white/20 text-white" />

            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={form.category} onValueChange={v => setForm({...form, category: v, is_rental: isRentalCategory(v)})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent className="max-h-96">
                  {["barber_beauty","hair_extensions","hair_makeup","massage_therapy","home_services","cleaning","plumbing","electrical","hvac","landscaping","pool_maintenance","pest_control","roofing","painting","junk_removal","locksmith","restaurant","food_truck","personal_chef","catering","chauffeur","moving_services","property_rental","real_estate","interior_design","legal_services","accounting","consulting","financial_planning","tax_preparation","construction","automotive","wedding_planning","event_planning","photography","video_production","dj_entertainment","equipment_rental","graphic_design","marketing","web_development","content_writing","tutoring","music_lessons","fitness_training","life_coaching","childcare","pet_services","tech_support","computer_repair","virtual_assistant","health_insurance","car_insurance","bail_bonding","yacht_charter","bounce_house_rental","party_rental"].map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.price_type} onValueChange={v => setForm({...form, price_type: v})}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Pricing Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="per_day">Per Day</SelectItem>
                  <SelectItem value="per_project">Per Project</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-gray-400 text-xs">Price (USD)</label>
                  <Button type="button" size="sm" onClick={suggestPricing} disabled={generatingPricing || !form.title} className="bg-green-600 hover:bg-green-700 h-6 text-xs px-2">
                    {generatingPricing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />...</> : <><TrendingUp className="w-3 h-3 mr-1" />AI</>}
                  </Button>
                </div>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-gray-400 text-xs">Description</label>
                  <Button type="button" size="sm" onClick={generateDescription} disabled={generatingDescription || !form.title} className="bg-purple-600 hover:bg-purple-700 h-6 text-xs px-2">
                    {generatingDescription ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />...</> : <><Star className="w-3 h-3 mr-1" />AI</>}
                  </Button>
                </div>
                <Input placeholder="Service description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>

            {form.is_rental ? (
              <>
                <RentalAssetManager rentalDetails={form.rental_details} onChange={d => setForm({...form, rental_details: d})} />
                <RentalCalendar blockedDates={form.blocked_dates} onChange={d => setForm({...form, blocked_dates: d})} />
              </>
            ) : (
              <>
                <ServiceVariationsManager variations={form.variations} onChange={v => setForm({...form, variations: v})} />
                <ServiceAddOnsManager addOns={form.add_ons} onChange={a => setForm({...form, add_ons: a})} />
              </>
            )}

            <div>
              <label className="text-white text-sm font-medium block mb-2">Cover Image</label>
              {form.image_url && (
                <div className="relative inline-block mb-2">
                  <img src={form.image_url} alt="cover" className="w-28 h-28 object-cover rounded-xl border border-white/20" />
                  <button onClick={() => setForm({...form, image_url: ""})} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('hub-cover-upload').click()} className="border-white/20 text-white">
                  <Upload className="w-3.5 h-3.5 mr-1" />Upload
                </Button>
                <input id="hub-cover-upload" type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0], "image_url")} className="hidden" />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <Switch checked={form.escrow_required} onCheckedChange={v => setForm({...form, escrow_required: v})} />
              <div className="text-xs">
                <div className="text-white font-medium">Require Escrow Protection</div>
                <div className="text-gray-400">Payments held until service completion</div>
              </div>
            </div>

            <Button className="bg-green-600 hover:bg-green-700 w-full"
              onClick={() => {
                if (!form.title || !form.description || !form.image_url) { toast.error('Fill in title, description, and cover image'); return; }
                createMutation.mutate(form);
              }}
              disabled={createMutation.isLoading || !form.title || !form.description || !form.image_url}>
              {createMutation.isLoading ? 'Publishing...' : 'Publish to Marketplace'}
            </Button>
          </div>

          {/* Active services list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Your Active Services</h4>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white text-xs h-8"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {[...new Set(myServices.map(s => s.category))].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat.replace(/_/g,' ').toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myServices
                .filter(s => filterCategory === 'all' || s.category === filterCategory)
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .map(s => (
                  <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition">
                    {s.image_url && <img src={s.image_url} alt={s.title} className="h-36 w-full object-cover" />}
                    <div className="p-3">
                      <p className="text-white font-semibold text-sm">{s.title}</p>
                      <p className="text-gray-400 text-xs capitalize mb-1">{s.category?.replace(/_/g,' ')}</p>
                      <p className="text-white font-bold mb-2">${s.price?.toFixed(2)}</p>
                      {s.is_rental && <Badge className="bg-purple-500/20 text-purple-300 text-xs mb-2">Rental</Badge>}
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(s.id); setEditData({ price: s.price||0, price_type: s.price_type||"fixed", image_url: s.image_url||"", portfolio_images: s.portfolio_images||[], variations: s.variations||[], add_ons: s.add_ons||[], is_rental: s.is_rental||false, rental_details: s.rental_details||{}, blocked_dates: s.blocked_dates||[] }); }} className="w-full border-white/20 text-white text-xs">
                        Manage
                      </Button>

                      {editingId === s.id && editData && (
                        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                          <Input type="number" value={editData.price} onChange={e => setEditData({...editData, price: Number(e.target.value)})} placeholder="Price" className="bg-white/10 border-white/20 text-white" />
                          {editData.is_rental ? (
                            <>
                              <RentalAssetManager rentalDetails={editData.rental_details} onChange={d => setEditData({...editData, rental_details: d})} />
                              <RentalCalendar blockedDates={editData.blocked_dates} onChange={d => setEditData({...editData, blocked_dates: d})} />
                            </>
                          ) : (
                            <>
                              <ServiceVariationsManager variations={editData.variations} onChange={v => setEditData({...editData, variations: v})} />
                              <ServiceAddOnsManager addOns={editData.add_ons} onChange={a => setEditData({...editData, add_ons: a})} />
                            </>
                          )}
                          <AvailabilityOverridesManager serviceId={s.id} providerEmail={currentUser?.email} />
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => updateMutation.mutate({ id: s.id, data: editData })} disabled={updateMutation.isLoading}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData(null); }} className="flex-1 border-white/20 text-white">Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <BookingRequestsSection currentUser={currentUser} />
          <ActiveRentalsManager currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4 mt-4">
          <ProviderChatSection currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowPayoutModal(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <DollarSign className="w-4 h-4 mr-2" />Request Payout
            </Button>
          </div>
          <EarningsSection currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <MultiAssetDashboard currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4 mt-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-3">
            <Award className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Showcase Your Work</p>
              <p className="text-blue-200 text-xs">Build trust and attract more customers by showcasing your best work.</p>
            </div>
          </div>
          <PortfolioSection userEmail={currentUser?.email} isOwnProfile={true} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <h4 className="text-white font-semibold">Set Your Availability</h4>
            {daysOfWeek.map(day => {
              const existingAvail = availability.find(a => a.day_of_week === day);
              const isAvailable = existingAvail?.is_available ?? true;
              return (
                <div key={day} className="bg-white/5 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium capitalize text-sm">{day}</span>
                    <Switch checked={isAvailable} onCheckedChange={async checked => {
                      await saveAvailabilityMutation.mutateAsync({ day_of_week: day, is_available: checked, start_time: existingAvail?.start_time || "09:00", end_time: existingAvail?.end_time || "17:00", slot_duration_minutes: existingAvail?.slot_duration_minutes || 60 });
                    }} />
                  </div>
                  {isAvailable && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Start</label>
                        <Input type="time" value={existingAvail?.start_time || "09:00"} onChange={e => setAvailabilityForm({ day_of_week: day, is_available: true, start_time: e.target.value, end_time: existingAvail?.end_time || "17:00", slot_duration_minutes: existingAvail?.slot_duration_minutes || 60 })} onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)} className="bg-white/10 border-white/20 text-white text-xs" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">End</label>
                        <Input type="time" value={existingAvail?.end_time || "17:00"} onChange={e => setAvailabilityForm({ day_of_week: day, is_available: true, start_time: existingAvail?.start_time || "09:00", end_time: e.target.value, slot_duration_minutes: existingAvail?.slot_duration_minutes || 60 })} onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)} className="bg-white/10 border-white/20 text-white text-xs" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Slot</label>
                        <Select value={String(existingAvail?.slot_duration_minutes || 60)} onValueChange={val => saveAvailabilityMutation.mutate({ day_of_week: day, is_available: true, start_time: existingAvail?.start_time || "09:00", end_time: existingAvail?.end_time || "17:00", slot_duration_minutes: Number(val) })}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white text-xs h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15m</SelectItem>
                            <SelectItem value="30">30m</SelectItem>
                            <SelectItem value="60">1hr</SelectItem>
                            <SelectItem value="90">1.5hr</SelectItem>
                            <SelectItem value="120">2hr</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4 mt-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm mb-1">Why Get Verified?</p>
                <ul className="text-gray-300 text-xs space-y-0.5">
                  <li>• Build instant trust with customers</li>
                  <li>• Rank higher in search results</li>
                  <li>• Get a verified badge on your listings</li>
                  <li>• Increase booking rates by up to 300%</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <h4 className="text-white font-semibold">Request Verification</h4>
            <Select value={verificationForm.verification_type} onValueChange={v => setVerificationForm({...verificationForm, verification_type: v})}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="background_check">Background Check</SelectItem>
                <SelectItem value="license_validation">License Validation</SelectItem>
                <SelectItem value="insurance_license">Insurance License</SelectItem>
                <SelectItem value="driver_license">Driver License</SelectItem>
                <SelectItem value="business_registration">Business Registration</SelectItem>
                <SelectItem value="professional_certification">Professional Certification</SelectItem>
                <SelectItem value="health_permit">Health Permit</SelectItem>
                <SelectItem value="contractor_license">Contractor License</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="License/Certificate Number" value={verificationForm.license_number} onChange={e => setVerificationForm({...verificationForm, license_number: e.target.value})} className="bg-white/10 border-white/20 text-white" />
              <Input placeholder="Issuing Authority" value={verificationForm.issuing_authority} onChange={e => setVerificationForm({...verificationForm, issuing_authority: e.target.value})} className="bg-white/10 border-white/20 text-white" />
              <Input type="date" value={verificationForm.issue_date} onChange={e => setVerificationForm({...verificationForm, issue_date: e.target.value})} className="bg-white/10 border-white/20 text-white" />
              <Input type="date" value={verificationForm.expiration_date} onChange={e => setVerificationForm({...verificationForm, expiration_date: e.target.value})} className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('hub-verification-upload').click()} className="border-white/20 text-white">
                <Upload className="w-3.5 h-3.5 mr-1" />Upload Document
              </Button>
              <input id="hub-verification-upload" type="file" accept="image/*,application/pdf" onChange={async e => {
                if (!e.target.files?.[0]) return;
                const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
                setVerificationForm(p => ({...p, document_urls: [...(p.document_urls||[]), file_url]}));
              }} className="hidden" />
              {verificationForm.document_urls?.length > 0 && <p className="text-green-400 text-xs mt-1">{verificationForm.document_urls.length} document(s) uploaded</p>}
            </div>
            <Button onClick={() => submitVerificationMutation.mutate(verificationForm)} disabled={!verificationForm.license_number || submitVerificationMutation.isLoading} className="w-full bg-green-600 hover:bg-green-700">
              <FileText className="w-4 h-4 mr-2" />Submit Verification
            </Button>
          </div>

          {verifications.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-white font-semibold">My Verifications</h4>
              {verifications.map(v => {
                const Icon = statusIcons[v.status] || CheckCircle;
                return (
                  <div key={v.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${v.status === 'verified' ? 'text-green-400' : 'text-yellow-400'}`} />
                      <div>
                        <p className="text-white text-sm font-medium capitalize">{v.verification_type.replace(/_/g, ' ')}</p>
                        {v.license_number && <p className="text-gray-400 text-xs">{v.license_number}</p>}
                      </div>
                    </div>
                    <Badge className={statusColors[v.status]}>{v.status.toUpperCase()}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractTemplateManager currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-white font-semibold">Provider Profile</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Business Name</label>
                <Input placeholder="Your Business Name" value={currentUser?.provider_business_name || ""} onChange={async e => { await base44.auth.updateMe({ provider_business_name: e.target.value }); }} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Phone</label>
                <Input placeholder="+1 (555) 123-4567" value={currentUser?.provider_phone || ""} onChange={async e => { await base44.auth.updateMe({ provider_phone: e.target.value }); }} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Business Address</label>
                <Input placeholder="123 Main St, City, State ZIP" value={currentUser?.provider_business_address || ""} onChange={async e => { await base44.auth.updateMe({ provider_business_address: e.target.value }); }} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Website</label>
                <Input placeholder="https://yourbusiness.com" value={currentUser?.provider_website || ""} onChange={async e => { await base44.auth.updateMe({ provider_website: e.target.value }); }} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Years of Experience</label>
                <Input type="number" placeholder="10" value={currentUser?.provider_years_experience || ""} onChange={async e => { await base44.auth.updateMe({ provider_years_experience: Number(e.target.value) }); }} className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ProviderPayoutManager isOpen={showPayoutModal} onClose={() => setShowPayoutModal(false)} currentUser={currentUser} />
    </div>
  );
}