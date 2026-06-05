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
  Upload, X, Shield, CheckCircle, AlertCircle, Award, FileText, Calendar,
  TrendingUp, Plus, User, List, DollarSign, Star, CreditCard, Loader2,
  Sparkles, Clock, LayoutDashboard, Briefcase, MessageSquare, Settings,
  Video, BarChart3, Package, ChevronDown, ChevronUp, Save, Building2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BookingRequestsSection from "../components/provider/BookingRequestsSection";
import EarningsSection from "../components/provider/EarningsSection";
import PerformanceDashboard from "../components/provider/PerformanceDashboard";
import ProviderChatSection from "../components/provider/ProviderChatSection";
import ServiceVariationsManager from "../components/provider/ServiceVariationsManager";
import ServiceAddOnsManager from "../components/provider/ServiceAddOnsManager";
import AvailabilityOverridesManager from "../components/provider/AvailabilityOverridesManager";
import RentalAssetManager from "../components/provider/RentalAssetManager";
import RentalCalendar from "../components/provider/RentalCalendar";
import ServicePackageManager from "../components/provider/ServicePackageManager";
import ProviderPayoutManager from "../components/provider/ProviderPayoutManager";
import AdvancedVideoEditor from "../components/video/AdvancedVideoEditor";
import VideoEditorPro from "../components/creator/VideoEditorPro";
import DashboardMetrics from "../components/provider/DashboardMetrics";
import RentalNotifications from "../components/provider/RentalNotifications";
import StripeExpressDashboard from "../components/provider/StripeExpressDashboard";
import ActiveRentalsManager from "../components/provider/ActiveRentalsManager";
import ContractTemplateManager from "../components/provider/ContractTemplateManager";
import AdvancedAnalytics from "../components/provider/AdvancedAnalytics";
import BusinessReportGenerator from "../components/provider/BusinessReportGenerator";
import FinancialDataExport from "../components/provider/FinancialDataExport";
import ProviderCalendarManager from "../components/provider/ProviderCalendarManager";
import NotificationPreferences from "../components/provider/NotificationPreferences";
import RealtimeNotifications from "../components/provider/RealtimeNotifications";
import MultiAssetDashboard from "../components/provider/MultiAssetDashboard";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assets", label: "Assets", icon: Package },
  { id: "services", label: "Services", icon: Briefcase },
  { id: "requests", label: "Requests", icon: Calendar, badge: true },
  { id: "messages", label: "Messages", icon: MessageSquare, badge: true },
  { id: "earnings", label: "Earnings", icon: DollarSign },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "verification", label: "Verification", icon: Shield },
  { id: "contracts", label: "Contracts", icon: FileText },
  { id: "video-editor", label: "Video Editor", icon: Video },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

const rentalCategories = [
  "property_rental", "equipment_rental", "yacht_charter",
  "private_aviation", "bounce_house_rental", "party_rental", "photo_booth_rental"
];
const isRentalCategory = (c) => rentalCategories.includes(c);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const statusColors = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  verified: "bg-green-500/15 text-green-300 border-green-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  expired: "bg-gray-500/15 text-gray-300 border-gray-500/30"
};
const statusIcons = { pending: Clock, verified: CheckCircle, rejected: AlertCircle, expired: AlertCircle };
const verificationLevelColors = {
  none: "from-gray-600 to-gray-700",
  basic: "from-blue-600 to-blue-700",
  standard: "from-green-600 to-green-700",
  premium: "from-purple-600 to-purple-700",
  elite: "from-yellow-500 to-yellow-600"
};

export default function ProviderHub() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: "monday", is_available: true,
    start_time: "09:00", end_time: "17:00",
    break_start: "", break_end: "", slot_duration_minutes: 60
  });
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [stripeOnboarding, setStripeOnboarding] = useState(false);
  const [brand, setBrand] = useState({ provider_brand_name: "", provider_description: "", provider_logo_url: "" });
  const [profileForm, setProfileForm] = useState({
    provider_business_name: "", provider_phone: "", provider_business_address: "",
    provider_website: "", provider_years_experience: ""
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "consulting", price: 100, price_type: "fixed",
    image_url: "", description: "", escrow_required: false,
    portfolio_images: [], variations: [], add_ons: [],
    is_rental: false, rental_details: {}, blocked_dates: []
  });
  const [sortBy, setSortBy] = useState("created_date");
  const [filterCategory, setFilterCategory] = useState("all");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingPricing, setGeneratingPricing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [verificationForm, setVerificationForm] = useState({
    verification_type: "background_check", license_number: "",
    issuing_authority: "", issue_date: "", expiration_date: "", document_urls: []
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        if (!user.is_provider) await base44.auth.updateMe({ is_provider: true });
      } catch { setCurrentUser(null); }
      finally { setUserLoaded(true); }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setBrand({
        provider_brand_name: currentUser.provider_brand_name || "",
        provider_description: currentUser.provider_description || "",
        provider_logo_url: currentUser.provider_logo_url || ""
      });
      setProfileForm({
        provider_business_name: currentUser.provider_business_name || "",
        provider_phone: currentUser.provider_phone || "",
        provider_business_address: currentUser.provider_business_address || "",
        provider_website: currentUser.provider_website || "",
        provider_years_experience: currentUser.provider_years_experience || ""
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'success' && currentUser?.stripe_account_id) {
      checkStripeStatusMutation.mutate();
      window.history.replaceState({}, '', createPageUrl('ProviderHub'));
    }
  }, [currentUser]);

  const { data: myServices = [] } = useQuery({
    queryKey: ["my-services"],
    queryFn: () => base44.entities.MarketplaceItem.list(),
    initialData: []
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['provider-unread-messages', currentUser?.email],
    queryFn: async () => {
      const msgs = await base44.entities.DirectMessage.filter({ recipient_email: currentUser.email, read: false });
      return msgs.length;
    },
    enabled: !!currentUser, staleTime: 60000, refetchOnWindowFocus: false
  });

  const { data: unreadBookingRequests = 0 } = useQuery({
    queryKey: ['provider-unread-bookings', currentUser?.email],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter({ recipient_email: currentUser.email, type: 'booking_request', read: false });
      return notifs.length;
    },
    enabled: !!currentUser, staleTime: 60000, refetchOnWindowFocus: false
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
  const overallTrustScore = verifiedCount > 0 ? Math.min(50 + verifiedCount * 15, 100) : 0;
  const trustScore = currentUser?.provider_trust_score || overallTrustScore;
  const verificationLevel = currentUser?.provider_verification_level && currentUser.provider_verification_level !== "none"
    ? currentUser.provider_verification_level : null;

  const createStripeAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('createConnectedAccount', {
        email: currentUser.email,
        businessName: currentUser.provider_business_name || currentUser.full_name,
        country: 'US'
      });
      await base44.auth.updateMe({ stripe_account_id: res.data.accountId });
      return res.data.accountId;
    },
    onSuccess: async (accountId) => {
      const linkRes = await base44.functions.invoke('createAccountLink', {
        accountId,
        returnUrl: `${window.location.origin}${createPageUrl('ProviderHub')}?onboarding=success`,
        refreshUrl: `${window.location.origin}${createPageUrl('ProviderHub')}?onboarding=refresh`
      });
      window.location.href = linkRes.data.url;
    },
    onError: (err) => { toast.error('Failed to create Stripe account: ' + err.message); setStripeOnboarding(false); }
  });

  const checkStripeStatusMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.stripe_account_id) return null;
      const res = await base44.functions.invoke('getAccountStatus', { account_id: currentUser.stripe_account_id });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.charges_enabled) toast.success('Stripe account verified and ready!');
      else toast.info('Complete your Stripe onboarding to receive payments');
    }
  });

  const saveBrand = async () => {
    await base44.auth.updateMe(brand);
    const u = await base44.auth.me();
    setCurrentUser(u);
    toast.success("Brand profile saved!");
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await base44.auth.updateMe({
        ...profileForm,
        provider_years_experience: profileForm.provider_years_experience ? Number(profileForm.provider_years_experience) : undefined
      });
      const u = await base44.auth.me();
      setCurrentUser(u);
      toast.success("Profile saved!");
    } finally { setSavingProfile(false); }
  };

  const generateDescription = async () => {
    if (!form.title || !form.category) { toast.error('Enter a title and category first'); return; }
    setGeneratingDescription(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a compelling 2-3 sentence service description for:\nService: ${form.title}\nCategory: ${form.category}\nHighlight key benefits, sound professional and approachable, end with a call to action. Return only the description text.`,
        add_context_from_internet: false
      });
      setForm(f => ({ ...f, description: res }));
      toast.success('Description generated!');
    } catch { toast.error('Failed to generate description'); }
    finally { setGeneratingDescription(false); }
  };

  const suggestPricing = async () => {
    if (!form.title || !form.category) { toast.error('Enter a title and category first'); return; }
    setGeneratingPricing(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest an optimal price (USD) for:\nService: ${form.title}\nCategory: ${form.category}\nPricing type: ${form.price_type}\nRespond with ONLY a single number.`,
        add_context_from_internet: true
      });
      const price = parseFloat(res.trim());
      if (!isNaN(price)) { setForm(f => ({ ...f, price })); toast.success(`AI suggests: $${price}`); }
    } catch { toast.error('Failed to suggest pricing'); }
    finally { setGeneratingPricing(false); }
  };

  const handleUploadCoverImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
  };

  const handleUploadPortfolioImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, portfolio_images: [...(f.portfolio_images || []), file_url] }));
  };

  const handleUploadEditCoverImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditData(d => ({ ...d, image_url: file_url }));
  };

  const handleDocumentUpload = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setVerificationForm(f => ({ ...f, document_urls: [...(f.document_urls || []), file_url] }));
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (data.category === "logistics" && !currentUser?.business_verified) {
        toast.error("Only verified businesses can offer Logistics.");
        return Promise.reject("Not verified for logistics");
      }
      return base44.entities.MarketplaceItem.create({
        ...data,
        provider_email: currentUser.email,
        provider_name: currentUser.provider_business_name || currentUser.full_name,
        verified_provider: verifiedCount > 0,
        availability: "available", rating: 5.0, reviews_count: 0, response_time: "within 1 hour"
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      qc.invalidateQueries({ queryKey: ["marketplace-items"] });
      setForm({ title: "", category: "consulting", price: 100, price_type: "fixed", image_url: "", description: "", escrow_required: false, portfolio_images: [], variations: [], add_ons: [], is_rental: false, rental_details: {}, blocked_dates: [] });
      setShowNewServiceForm(false);
      toast.success("Service published to marketplace!");
    },
    onError: (err) => { if (err !== "Not verified for logistics") toast.error("Failed to publish: " + err.message); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketplaceItem.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-services"] }); setEditingId(null); setEditData(null); toast.success("Service updated!"); }
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data) => base44.entities.ProviderVerification.create({ ...data, provider_email: currentUser.email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-verifications"] });
      toast.success("Verification submitted! We'll review within 24-48 hours.");
      setVerificationForm({ verification_type: "background_check", license_number: "", issuing_authority: "", issue_date: "", expiration_date: "", document_urls: [] });
    }
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (data) => {
      const existing = availability.find(a => a.day_of_week === data.day_of_week);
      if (existing) return await base44.entities.ProviderAvailability.update(existing.id, data);
      return await base44.entities.ProviderAvailability.create({ ...data, provider_email: currentUser.email });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-availability"] }); toast.success("Availability saved!"); }
  });

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditData({ price: s.price || 0, price_type: s.price_type || "fixed", image_url: s.image_url || "", portfolio_images: s.portfolio_images || [], variations: s.variations || [], add_ons: s.add_ons || [], is_rental: s.is_rental || false, rental_details: s.rental_details || {}, blocked_dates: s.blocked_dates || [] });
  };

  if (!userLoaded) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-white font-medium">Loading Provider Hub...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <div className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Provider Hub</h1>
                <p className="text-gray-400 text-xs mt-0.5">{currentUser?.provider_business_name || currentUser?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setActiveTab("services")} size="sm" className="bg-purple-600 hover:bg-purple-700 gap-2">
                <Plus className="w-4 h-4" />Add Service
              </Button>
              <Link to={createPageUrl("ProviderProfile")}>
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 gap-2">
                  <User className="w-4 h-4" />Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Alert Banners */}
        {currentUser && !currentUser.provider_onboarding_completed && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Complete Your Provider Setup</p>
                <p className="text-gray-400 text-xs">Get started in 5 easy steps</p>
              </div>
            </div>
            <Button onClick={() => navigate(createPageUrl("ProviderOnboarding"))} size="sm" className="bg-purple-600 hover:bg-purple-700 flex-shrink-0">
              Start Setup
            </Button>
          </div>
        )}

        {!currentUser?.stripe_account_id && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Connect Stripe to Receive Payments</p>
                <p className="text-gray-400 text-xs">Required to start earning</p>
              </div>
            </div>
            <Button onClick={() => { setStripeOnboarding(true); createStripeAccountMutation.mutate(); }}
              disabled={stripeOnboarding || createStripeAccountMutation.isPending}
              size="sm" className="bg-green-600 hover:bg-green-700 flex-shrink-0">
              {stripeOnboarding || createStripeAccountMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Connecting...</> : <>Connect Stripe</>}
            </Button>
          </div>
        )}

        {/* Trust Score Card */}
        <div className={`rounded-xl bg-gradient-to-r ${verificationLevelColors[verificationLevel || "none"]} p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-white flex-shrink-0" />
              <div>
                <p className="text-white font-bold">
                  {verificationLevel ? `${verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)} Verified` : "Not Verified"}
                </p>
                <p className="text-white/70 text-xs">{verifiedCount} verification{verifiedCount !== 1 ? 's' : ''} complete</p>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-white/80 text-xs mb-1.5">
                <span>Trust Score</span><span className="font-bold">{trustScore}/100</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(trustScore, 100)}%` }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0 hidden sm:block">
              <p className="text-white text-2xl font-bold">{myServices.length}</p>
              <p className="text-white/70 text-xs">Active Services</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Manage Listings", icon: List, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", onClick: () => navigate(createPageUrl("ProviderListings")) },
            { label: "Add New Service", icon: Plus, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", onClick: () => { setActiveTab("services"); setShowNewServiceForm(true); } },
            { label: "Get Verified", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", onClick: () => setActiveTab("verification") },
            { label: "Update Profile", icon: User, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", onClick: () => setActiveTab("profile") },
          ].map((a) => (
            <button key={a.label} onClick={a.onClick}
              className={`flex items-center gap-3 p-4 rounded-xl border ${a.bg} hover:brightness-125 transition-all text-left active:scale-[0.97]`}>
              <div className={`w-9 h-9 rounded-lg ${a.bg} flex items-center justify-center flex-shrink-0`}>
                <a.icon className={`w-4 h-4 ${a.color}`} />
              </div>
              <span className="text-white font-semibold text-sm leading-snug">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="overflow-x-auto -mx-4 px-4 hide-scrollbar">
            <TabsList className="inline-flex w-auto bg-white/[0.04] border border-white/10 p-1 gap-0.5 rounded-xl">
              {TABS.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}
                  className="relative flex items-center gap-2 whitespace-nowrap px-3 py-2 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg text-sm transition-all">
                  <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'requests' && unreadBookingRequests > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadBookingRequests > 9 ? '9+' : unreadBookingRequests}
                    </span>
                  )}
                  {tab.id === 'messages' && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-5">
            <DashboardMetrics currentUser={currentUser} />
            <RentalNotifications currentUser={currentUser} />
            <StripeExpressDashboard currentUser={currentUser} />
            <div className="grid lg:grid-cols-2 gap-5">
              <AdvancedAnalytics currentUser={currentUser} />
              <BusinessReportGenerator currentUser={currentUser} />
            </div>
            <FinancialDataExport currentUser={currentUser} />
            <PerformanceDashboard currentUser={currentUser} />
          </TabsContent>

          {/* Assets */}
          <TabsContent value="assets">
            <MultiAssetDashboard currentUser={currentUser} />
          </TabsContent>

          {/* Services */}
          <TabsContent value="services" className="space-y-5">
            <ServicePackageManager myServices={myServices} currentUser={currentUser} />

            {/* Brand Profile */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />Brand Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Business Name</label>
                    <Input placeholder="Your business name" value={brand.provider_brand_name} onChange={(e) => setBrand(b => ({ ...b, provider_brand_name: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Logo URL</label>
                    <Input placeholder="https://..." value={brand.provider_logo_url} onChange={(e) => setBrand(b => ({ ...b, provider_logo_url: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">About Your Business</label>
                  <Input placeholder="Brief description of what you offer" value={brand.provider_description} onChange={(e) => setBrand(b => ({ ...b, provider_description: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                </div>
                <Button onClick={saveBrand} size="sm" className="bg-purple-600 hover:bg-purple-700 gap-2">
                  <Save className="w-3.5 h-3.5" />Save Brand
                </Button>
              </CardContent>
            </Card>

            {/* New Service Form Toggle */}
            <Card className="bg-white/5 border-white/10">
              <button onClick={() => setShowNewServiceForm(v => !v)} className="w-full p-5 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/15 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Add New Service / Product</p>
                    <p className="text-gray-400 text-xs">Publish a new listing to the marketplace</p>
                  </div>
                </div>
                {showNewServiceForm ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {showNewServiceForm && (
                <CardContent className="pt-0 space-y-5 border-t border-white/10">
                  <div className="space-y-3 pt-4">
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block">Service Title *</label>
                      <Input placeholder="e.g. Professional Haircut & Style" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1.5 block">Category *</label>
                        <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v, is_rental: isRentalCategory(v) }))}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-80">
                            {[["barber_beauty","Barber & Beauty"],["hair_extensions","Hair Extensions"],["hair_makeup","Hair & Makeup"],["massage_therapy","Massage Therapy"],["home_services","Home Services"],["cleaning","Cleaning"],["plumbing","Plumbing"],["electrical","Electrical"],["hvac","HVAC"],["landscaping","Landscaping"],["pool_maintenance","Pool Maintenance"],["pest_control","Pest Control"],["roofing","Roofing"],["painting","Painting"],["junk_removal","Junk Removal"],["locksmith","Locksmith"],["restaurant","Restaurant"],["food_truck","Food Truck"],["personal_chef","Personal Chef"],["catering","Catering"],["chauffeur","Chauffeur Service"],["moving_services","Moving Services"],["property_rental","Property Rental"],["real_estate","Real Estate"],["interior_design","Interior Design"],["legal_services","Legal Services"],["accounting","Accounting"],["consulting","Consulting"],["financial_planning","Financial Planning"],["tax_preparation","Tax Preparation"],["construction","Construction"],["automotive","Automotive"],["wedding_planning","Wedding Planning"],["event_planning","Event Planning"],["photography","Photography"],["video_production","Video Production"],["dj_entertainment","DJ & Entertainment"],["equipment_rental","Equipment Rental"],["graphic_design","Graphic Design"],["marketing","Marketing"],["web_development","Web Development"],["content_writing","Content Writing"],["tutoring","Tutoring"],["music_lessons","Music Lessons"],["fitness_training","Fitness Training"],["life_coaching","Life Coaching"],["childcare","Childcare"],["pet_services","Pet Services"],["tech_support","Tech Support"],["computer_repair","Computer Repair"],["virtual_assistant","Virtual Assistant"],["health_insurance","Health Insurance"],["car_insurance","Car Insurance"],["bail_bonding","Bail Bonds"],["yacht_charter","Yacht Charter"],["bounce_house_rental","Bounce House Rental"],["party_rental","Party Rental"]].map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1.5 block">Pricing Type</label>
                        <Select value={form.price_type} onValueChange={(v) => setForm(f => ({ ...f, price_type: v }))}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="hourly">Hourly Rate</SelectItem>
                            <SelectItem value="per_day">Per Day</SelectItem>
                            <SelectItem value="per_project">Per Project</SelectItem>
                            <SelectItem value="negotiable">Negotiable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-gray-400 text-xs">Price (USD)</label>
                        <Button type="button" size="sm" onClick={suggestPricing} disabled={generatingPricing || !form.title} className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700">
                          {generatingPricing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing...</> : <><TrendingUp className="w-3 h-3 mr-1" />AI Suggest</>}
                        </Button>
                      </div>
                      <Input type="number" placeholder="100" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))} className="bg-white/10 border-white/20 text-white" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-gray-400 text-xs">Description *</label>
                        <Button type="button" size="sm" onClick={generateDescription} disabled={generatingDescription || !form.title} className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700">
                          {generatingDescription ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3 mr-1" />AI Write</>}
                        </Button>
                      </div>
                      <Input placeholder="Describe your service..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                    </div>

                    {form.is_rental ? (
                      <>
                        <RentalAssetManager rentalDetails={form.rental_details} onChange={(d) => setForm(f => ({ ...f, rental_details: d }))} />
                        <RentalCalendar blockedDates={form.blocked_dates} onChange={(d) => setForm(f => ({ ...f, blocked_dates: d }))} />
                      </>
                    ) : (
                      <>
                        <ServiceVariationsManager variations={form.variations} onChange={(v) => setForm(f => ({ ...f, variations: v }))} />
                        <ServiceAddOnsManager addOns={form.add_ons} onChange={(a) => setForm(f => ({ ...f, add_ons: a }))} />
                      </>
                    )}

                    <div>
                      <label className="text-white text-sm font-medium block mb-2">Cover Image *</label>
                      {form.image_url && (
                        <div className="relative inline-block mb-2">
                          <img src={form.image_url} alt="cover" className="w-28 h-28 object-cover rounded-xl border border-white/20" />
                          <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('cover-upload').click()} className="border-white/20 text-white hover:bg-white/10">
                          <Upload className="w-3.5 h-3.5 mr-1" />Upload Image
                        </Button>
                        <input id="cover-upload" type="file" accept="image/*" onChange={(e) => handleUploadCoverImage(e.target.files?.[0])} className="hidden" />
                        <span className="text-gray-500 text-xs">or</span>
                        <Input placeholder="Paste image URL" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) { setForm(f => ({ ...f, image_url: e.currentTarget.value })); e.currentTarget.value = ""; } }} className="bg-white/10 border-white/20 text-white flex-1 min-w-32 h-9" />
                      </div>
                    </div>

                    {form.portfolio_images?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.portfolio_images.map((url, idx) => (
                          <div key={idx} className="relative">
                            <img src={url} alt={`p-${idx}`} className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                            <button onClick={() => setForm(f => ({ ...f, portfolio_images: f.portfolio_images.filter((_, i) => i !== idx) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('portfolio-upload').click()} className="border-white/20 text-white hover:bg-white/10">
                      <Upload className="w-3.5 h-3.5 mr-1" />Add Portfolio Image
                    </Button>
                    <input id="portfolio-upload" type="file" accept="image/*" onChange={(e) => handleUploadPortfolioImage(e.target.files?.[0])} className="hidden" />

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Switch checked={form.escrow_required} onCheckedChange={(v) => setForm(f => ({ ...f, escrow_required: v }))} />
                      <div>
                        <p className="text-white text-sm font-medium">Require Escrow Protection</p>
                        <p className="text-gray-400 text-xs">Payments held until service is completed</p>
                      </div>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold"
                      onClick={() => {
                        if (!form.title || !form.description || !form.image_url) { toast.error('Please fill in title, description, and cover image'); return; }
                        createMutation.mutate(form);
                      }}
                      disabled={createMutation.isPending || !form.title || !form.description || !form.image_url}>
                      {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing...</> : <>Publish to Marketplace</>}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Active Services List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Active Services ({myServices.length})</h2>
                <div className="flex gap-2">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white h-9 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {[...new Set(myServices.map(s => s.category))].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_date">Newest First</SelectItem>
                      <SelectItem value="price">Price: Low to High</SelectItem>
                      <SelectItem value="-price">Price: High to Low</SelectItem>
                      <SelectItem value="title">Name A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {myServices.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed border-white/20">
                  <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">No services yet</p>
                  <p className="text-gray-400 text-sm">Add your first service to start receiving bookings</p>
                  <Button onClick={() => setShowNewServiceForm(true)} size="sm" className="mt-4 bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-1" />Add Service
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myServices
                    .filter(s => filterCategory === 'all' || s.category === filterCategory)
                    .sort((a, b) => {
                      if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
                      if (sortBy === '-price') return (b.price || 0) - (a.price || 0);
                      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
                      return new Date(b.created_date) - new Date(a.created_date);
                    })
                    .map(s => (
                      <Card key={s.id} className="bg-white/5 border-white/10 overflow-hidden">
                        {s.image_url && <img src={s.image_url} alt={s.title} className="h-36 w-full object-cover" />}
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white font-semibold leading-snug">{s.title}</p>
                              {s.is_rental && <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] flex-shrink-0">Rental</Badge>}
                            </div>
                            <p className="text-gray-400 text-xs capitalize mt-0.5">{s.category?.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-bold text-lg">${s.price?.toFixed(2)}</p>
                            <div className="flex gap-1 text-xs text-gray-400">
                              {s.variations?.length > 0 && <span className="bg-white/10 px-2 py-0.5 rounded">{s.variations.length} var</span>}
                              {s.add_ons?.length > 0 && <span className="bg-white/10 px-2 py-0.5 rounded">{s.add_ons.length} add-ons</span>}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => startEdit(s)} className="w-full border-white/20 text-white hover:bg-white/10">
                            Manage {s.is_rental ? 'Rental' : 'Service'}
                          </Button>

                          {editingId === s.id && editData && (
                            <div className="space-y-3 border-t border-white/10 pt-3">
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="number" value={editData.price} onChange={(e) => setEditData(d => ({ ...d, price: Number(e.target.value) }))} placeholder="Price" className="bg-white/10 border-white/20 text-white h-9 text-sm" />
                                <Select value={editData.price_type} onValueChange={(v) => setEditData(d => ({ ...d, price_type: v }))}>
                                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                    <SelectItem value="per_day">Per Day</SelectItem>
                                    <SelectItem value="per_project">Per Project</SelectItem>
                                    <SelectItem value="negotiable">Negotiable</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {editData.image_url && <img src={editData.image_url} alt="cover" className="w-full h-28 object-cover rounded-lg" />}
                              <Button size="sm" variant="outline" onClick={() => document.getElementById(`edit-cover-${s.id}`).click()} className="w-full border-white/20 text-white hover:bg-white/10">
                                <Upload className="w-3.5 h-3.5 mr-1" />Change Cover
                              </Button>
                              <input id={`edit-cover-${s.id}`} type="file" accept="image/*" onChange={(e) => handleUploadEditCoverImage(e.target.files?.[0])} className="hidden" />

                              {editData.is_rental ? (
                                <>
                                  <RentalAssetManager rentalDetails={editData.rental_details} onChange={(d) => setEditData(ed => ({ ...ed, rental_details: d }))} />
                                  <RentalCalendar blockedDates={editData.blocked_dates} onChange={(d) => setEditData(ed => ({ ...ed, blocked_dates: d }))} />
                                </>
                              ) : (
                                <>
                                  <ServiceVariationsManager variations={editData.variations} onChange={(v) => setEditData(d => ({ ...d, variations: v }))} />
                                  <ServiceAddOnsManager addOns={editData.add_ons} onChange={(a) => setEditData(d => ({ ...d, add_ons: a }))} />
                                </>
                              )}
                              <AvailabilityOverridesManager serviceId={s.id} providerEmail={currentUser?.email} />
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: s.id, data: editData })} disabled={updateMutation.isPending}>
                                  {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData(null); }} className="flex-1 border-white/20 text-white">Cancel</Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Requests */}
          <TabsContent value="requests" className="space-y-5">
            <BookingRequestsSection currentUser={currentUser} />
            <ActiveRentalsManager currentUser={currentUser} />
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <ProviderChatSection currentUser={currentUser} />
          </TabsContent>

          {/* Earnings */}
          <TabsContent value="earnings" className="space-y-5">
            <div className="flex justify-end">
              <Button onClick={() => setShowPayoutModal(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2">
                <DollarSign className="w-4 h-4" />Request Payout
              </Button>
            </div>
            <EarningsSection currentUser={currentUser} />
          </TabsContent>

          {/* Availability */}
          <TabsContent value="availability">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />Set Your Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.map(day => {
                  const avail = availability.find(a => a.day_of_week === day);
                  const isAvail = avail?.is_available ?? true;
                  return (
                    <div key={day} className={`rounded-xl p-4 border transition-all ${isAvail ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white font-semibold capitalize">{day}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">{isAvail ? 'Available' : 'Closed'}</span>
                          <Switch checked={isAvail} onCheckedChange={async (checked) => {
                            await saveAvailabilityMutation.mutateAsync({
                              day_of_week: day, is_available: checked,
                              start_time: avail?.start_time || "09:00",
                              end_time: avail?.end_time || "17:00",
                              slot_duration_minutes: avail?.slot_duration_minutes || 60
                            });
                          }} />
                        </div>
                      </div>
                      {isAvail && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Start</label>
                            <Input type="time" value={avail?.start_time || "09:00"}
                              onChange={(e) => setAvailabilityForm({ day_of_week: day, is_available: true, start_time: e.target.value, end_time: avail?.end_time || "17:00", slot_duration_minutes: avail?.slot_duration_minutes || 60 })}
                              onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)}
                              className="bg-white/10 border-white/20 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">End</label>
                            <Input type="time" value={avail?.end_time || "17:00"}
                              onChange={(e) => setAvailabilityForm({ day_of_week: day, is_available: true, start_time: avail?.start_time || "09:00", end_time: e.target.value, slot_duration_minutes: avail?.slot_duration_minutes || 60 })}
                              onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)}
                              className="bg-white/10 border-white/20 text-white h-9 text-sm" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Slot Length</label>
                            <Select value={String(avail?.slot_duration_minutes || 60)} onValueChange={(v) => saveAvailabilityMutation.mutate({ day_of_week: day, is_available: true, start_time: avail?.start_time || "09:00", end_time: avail?.end_time || "17:00", slot_duration_minutes: Number(v) })}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="90">1.5 hrs</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification */}
          <TabsContent value="verification" className="space-y-5">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
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

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white text-base">Submit Verification Request</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Verification Type</label>
                  <Select value={verificationForm.verification_type} onValueChange={(v) => setVerificationForm(f => ({ ...f, verification_type: v }))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="background_check">Background Check</SelectItem>
                      <SelectItem value="license_validation">License Validation</SelectItem>
                      <SelectItem value="insurance_license">Insurance License</SelectItem>
                      <SelectItem value="bail_bondsman_license">Bail Bondsman License</SelectItem>
                      <SelectItem value="driver_license">Driver License</SelectItem>
                      <SelectItem value="business_registration">Business Registration</SelectItem>
                      <SelectItem value="professional_certification">Professional Certification</SelectItem>
                      <SelectItem value="health_permit">Health Permit</SelectItem>
                      <SelectItem value="contractor_license">Contractor License</SelectItem>
                      <SelectItem value="food_handler_permit">Food Handler Permit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">License / Certificate #</label>
                    <Input placeholder="e.g. ABC-123456" value={verificationForm.license_number} onChange={(e) => setVerificationForm(f => ({ ...f, license_number: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Issuing Authority</label>
                    <Input placeholder="e.g. State Board" value={verificationForm.issuing_authority} onChange={(e) => setVerificationForm(f => ({ ...f, issuing_authority: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Issue Date</label>
                    <Input type="date" value={verificationForm.issue_date} onChange={(e) => setVerificationForm(f => ({ ...f, issue_date: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Expiration Date</label>
                    <Input type="date" value={verificationForm.expiration_date} onChange={(e) => setVerificationForm(f => ({ ...f, expiration_date: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Supporting Documents</label>
                  {verificationForm.document_urls?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {verificationForm.document_urls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt={`doc-${idx}`} className="w-20 h-20 object-cover rounded-lg border border-white/20" />
                          <button onClick={() => setVerificationForm(f => ({ ...f, document_urls: f.document_urls.filter((_, i) => i !== idx) }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('verification-upload').click()} className="border-white/20 text-white hover:bg-white/10">
                    <Upload className="w-3.5 h-3.5 mr-1" />Upload Document
                  </Button>
                  <input id="verification-upload" type="file" accept="image/*,application/pdf" onChange={(e) => handleDocumentUpload(e.target.files?.[0])} className="hidden" />
                </div>
                <Button onClick={() => submitVerificationMutation.mutate(verificationForm)} disabled={!verificationForm.license_number || submitVerificationMutation.isPending} className="w-full bg-green-600 hover:bg-green-700 gap-2">
                  <FileText className="w-4 h-4" />
                  {submitVerificationMutation.isPending ? "Submitting..." : "Submit Verification Request"}
                </Button>
              </CardContent>
            </Card>

            {verifications.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-bold">My Verifications ({verifications.length})</h3>
                {verifications.map((v) => {
                  const StatusIcon = statusIcons[v.status] || CheckCircle;
                  return (
                    <Card key={v.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 ${v.status === 'verified' ? 'bg-green-500/20' : 'bg-blue-500/20'} rounded-full flex items-center justify-center flex-shrink-0`}>
                              <StatusIcon className={`w-5 h-5 ${v.status === 'verified' ? 'text-green-400' : 'text-blue-400'}`} />
                            </div>
                            <div>
                              <p className="text-white font-semibold capitalize">{v.verification_type.replace(/_/g, ' ')}</p>
                              {v.license_number && <p className="text-gray-400 text-xs">License: {v.license_number}</p>}
                              {v.issuing_authority && <p className="text-gray-400 text-xs">Issued by: {v.issuing_authority}</p>}
                              {v.expiration_date && (
                                <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" />Expires: {new Date(v.expiration_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${statusColors[v.status]} border text-xs flex-shrink-0`}>{v.status.toUpperCase()}</Badge>
                        </div>
                        {v.status === 'rejected' && v.rejection_reason && (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-xs"><strong>Reason:</strong> {v.rejection_reason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {verifications.length === 0 && (
              <div className="text-center py-16 rounded-xl border border-dashed border-white/20">
                <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">No verifications yet</p>
                <p className="text-gray-400 text-sm">Submit your first verification to build customer trust</p>
              </div>
            )}
          </TabsContent>

          {/* Contracts */}
          <TabsContent value="contracts">
            <ContractTemplateManager currentUser={currentUser} />
          </TabsContent>

          {/* Video Editor */}
          <TabsContent value="video-editor" className="space-y-5">
            <AdvancedVideoEditor currentUser={currentUser} />
            <VideoEditorPro currentUser={currentUser} />
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />Provider Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Business Name</label>
                    <Input placeholder="Your Business Name" value={profileForm.provider_business_name}
                      onChange={(e) => setProfileForm(f => ({ ...f, provider_business_name: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Phone Number</label>
                    <Input placeholder="+1 (555) 123-4567" value={profileForm.provider_phone}
                      onChange={(e) => setProfileForm(f => ({ ...f, provider_phone: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs mb-1.5 block">Business Address</label>
                    <Input placeholder="123 Main St, City, State ZIP" value={profileForm.provider_business_address}
                      onChange={(e) => setProfileForm(f => ({ ...f, provider_business_address: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Website</label>
                    <Input placeholder="https://yourbusiness.com" value={profileForm.provider_website}
                      onChange={(e) => setProfileForm(f => ({ ...f, provider_website: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Years of Experience</label>
                    <Input type="number" placeholder="5" value={profileForm.provider_years_experience}
                      onChange={(e) => setProfileForm(f => ({ ...f, provider_years_experience: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="bg-purple-600 hover:bg-purple-700 gap-2">
                  {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Profile</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-5">
            <NotificationPreferences currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>

      <ProviderPayoutManager isOpen={showPayoutModal} onClose={() => setShowPayoutModal(false)} currentUser={currentUser} />
      <RealtimeNotifications currentUser={currentUser} />

      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}