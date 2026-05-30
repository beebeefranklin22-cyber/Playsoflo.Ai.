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
  DollarSign, Star, Users, CreditCard, Loader2, Sparkles, Clock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BookingRequestsSection from "../components/provider/BookingRequestsSection";
import EarningsSection from "../components/provider/EarningsSection";
import PerformanceDashboard from "../components/provider/PerformanceDashboard";
import ProviderChatSection from "../components/provider/ProviderChatSection";
import PortfolioSection from "../components/profile/PortfolioSection";
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

export default function ProviderHub() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [availabilityForm, setAvailabilityForm] = useState({
    day_of_week: "monday",
    is_available: true,
    start_time: "09:00",
    end_time: "17:00",
    break_start: "",
    break_end: "",
    slot_duration_minutes: 60
  });

  const { data: myServices = [] } = useQuery({
    queryKey: ["my-services"],
    queryFn: () => base44.entities.MarketplaceItem.list(),
    initialData: []
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ["provider-bookings"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 60000,
    initialData: []
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['provider-unread-messages', currentUser?.email],
    queryFn: async () => {
      const messages = await base44.entities.DirectMessage.filter({
        recipient_email: currentUser.email,
        read: false
      });
      return messages.length;
    },
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 60000
  });

  const { data: unreadBookingRequests = 0 } = useQuery({
    queryKey: ['provider-unread-bookings', currentUser?.email],
    queryFn: async () => {
      const notifications = await base44.entities.Notification.filter({
        recipient_email: currentUser.email,
        type: 'booking_request',
        read: false
      });
      return notifications.length;
    },
    enabled: !!currentUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 60000
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["my-availability"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ProviderAvailability.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        if (!user.is_provider) {
          await base44.auth.updateMe({ is_provider: true });
        }
      } catch (error) {
        console.log("Error loading user:", error);
        setCurrentUser(null);
      } finally {
        setUserLoaded(true);
      }
    };
    loadUser();
  }, []);

  const { data: verifications = [] } = useQuery({
    queryKey: ["my-verifications"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ProviderVerification.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const [verificationForm, setVerificationForm] = useState({
    verification_type: "background_check",
    license_number: "",
    issuing_authority: "",
    issue_date: "",
    expiration_date: "",
    document_urls: []
  });

  const submitVerificationMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ProviderVerification.create({
        ...data,
        provider_email: currentUser.email
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-verifications"] });
      toast.success("Verification request submitted! We'll review it within 24-48 hours.");
      setVerificationForm({
        verification_type: "background_check",
        license_number: "",
        issuing_authority: "",
        issue_date: "",
        expiration_date: "",
        document_urls: []
      });
    }
  });

  const handleDocumentUpload = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setVerificationForm((prev) => ({
      ...prev,
      document_urls: [...(prev.document_urls || []), file_url]
    }));
  };

  const verifiedCount = verifications.filter(v => v.status === "verified").length;
  const overallTrustScore = verifiedCount > 0
    ? Math.min(50 + (verifiedCount * 15), 100)
    : 0;

  const verificationLevelColors = {
    none: "from-gray-500 to-gray-600",
    basic: "from-blue-500 to-blue-600",
    standard: "from-green-500 to-green-600",
    premium: "from-purple-500 to-purple-600",
    elite: "from-yellow-500 to-yellow-600"
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    verified: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800"
  };

  const statusIcons = {
    pending: Clock,
    verified: CheckCircle,
    rejected: AlertCircle,
    expired: AlertCircle
  };

  const [brand, setBrand] = useState({ provider_brand_name: "", provider_description: "", provider_logo_url: "" });
  const [stripeOnboarding, setStripeOnboarding] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setBrand({
        provider_brand_name: currentUser.provider_brand_name || "",
        provider_description: currentUser.provider_description || "",
        provider_logo_url: currentUser.provider_logo_url || ""
      });
    }
  }, [currentUser]);

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

  const checkStripeStatusMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.stripe_account_id) return null;
      const response = await base44.functions.invoke('getAccountStatus', {
        account_id: currentUser.stripe_account_id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.charges_enabled) {
        toast.success('Stripe account verified and ready!');
      } else {
        toast.info('Complete your Stripe onboarding to receive payments');
      }
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'success' && currentUser?.stripe_account_id) {
      checkStripeStatusMutation.mutate();
      window.history.replaceState({}, '', createPageUrl('ProviderHub'));
    }
  }, [currentUser]);

  const saveBrand = async () => {
    await base44.auth.updateMe(brand);
    const updatedUser = await base44.auth.me();
    setCurrentUser(updatedUser);
    toast.success("Brand profile saved!");
  };

  const [form, setForm] = useState({
    title: "",
    category: "consulting",
    price: 100,
    price_type: "fixed",
    image_url: "",
    description: "",
    escrow_required: false,
    portfolio_images: [],
    variations: [],
    add_ons: [],
    is_rental: false,
    rental_details: {},
    blocked_dates: []
  });
  
  const [sortBy, setSortBy] = useState("created_date");
  const [filterCategory, setFilterCategory] = useState("all");

  const rentalCategories = [
    "property_rental", "equipment_rental", "yacht_charter", 
    "private_aviation", "bounce_house_rental", "party_rental",
    "photo_booth_rental"
  ];

  const isRentalCategory = (category) => rentalCategories.includes(category);

  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingPricing, setGeneratingPricing] = useState(false);

  const generateDescription = async () => {
    if (!form.title || !form.category) {
      toast.error('Please enter a title and category first');
      return;
    }
    setGeneratingDescription(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert service provider copywriter. Create a compelling, professional service description for the following:\n\nService Title: ${form.title}\nCategory: ${form.category}\n\nThe description should:\n- Be 2-3 sentences long\n- Highlight the key benefits to customers\n- Sound professional yet approachable\n- Include relevant details about what's included\n- End with a call to action\n\nGenerate only the description text, nothing else.`,
        add_context_from_internet: false
      });
      setForm({ ...form, description: response });
      toast.success('Description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const suggestPricing = async () => {
    if (!form.title || !form.category) {
      toast.error('Please enter a title and category first');
      return;
    }
    setGeneratingPricing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a pricing expert for service marketplaces. Based on market trends and industry standards, suggest an optimal price for:\n\nService: ${form.title}\nCategory: ${form.category}\nCurrent Price Type: ${form.price_type}\n\nRespond with ONLY a single number (the suggested price in USD). No explanation, just the number.`,
        add_context_from_internet: true
      });
      const suggestedPrice = parseFloat(response.trim());
      if (!isNaN(suggestedPrice)) {
        setForm({ ...form, price: suggestedPrice });
        toast.success(`Suggested price: $${suggestedPrice}`);
      }
    } catch (error) {
      toast.error('Failed to generate pricing suggestion');
    } finally {
      setGeneratingPricing(false);
    }
  };

  const handleUploadCoverImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, image_url: file_url }));
  };

  const handleUploadPortfolioImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, portfolio_images: [...(prev.portfolio_images || []), file_url] }));
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (data.category === "logistics" && !currentUser?.business_verified) {
        toast.error("Only verified businesses can offer Logistics. Please verify your business in your profile.");
        return Promise.reject("Not verified for logistics");
      }
      const serviceData = {
        ...data,
        provider_email: currentUser.email,
        provider_name: currentUser.provider_business_name || currentUser.full_name,
        verified_provider: verifiedCount > 0,
        availability: "available",
        rating: 5.0,
        reviews_count: 0,
        response_time: "within 1 hour"
      };
      return base44.entities.MarketplaceItem.create(serviceData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      qc.invalidateQueries({ queryKey: ["marketplace-items"] });
      setForm({ 
        title: "", category: "consulting", price: 100, price_type: "fixed", 
        image_url: "", description: "", escrow_required: false, 
        portfolio_images: [], variations: [], add_ons: [],
        is_rental: false, rental_details: {}, blocked_dates: []
      });
      toast.success("Service published and live in marketplace!");
    },
    onError: (error) => {
      if (error !== "Not verified for logistics") {
        toast.error("Failed to publish service: " + error.message);
      }
    }
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [generatingPackage, setGeneratingPackage] = useState(false);
  const [generatedPackages, setGeneratedPackages] = useState([]);
  const [showPackages, setShowPackages] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketplaceItem.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      setEditingId(null);
      setEditData(null);
      toast.success("Service updated!");
    }
  });

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditData({
      price: service.price || 0,
      price_type: service.price_type || "fixed",
      image_url: service.image_url || "",
      portfolio_images: service.portfolio_images || [],
      variations: service.variations || [],
      add_ons: service.add_ons || [],
      is_rental: service.is_rental || false,
      rental_details: service.rental_details || {},
      blocked_dates: service.blocked_dates || []
    });
  };

  const handleUploadEditCoverImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditData((prev) => ({ ...prev, image_url: file_url }));
  };

  const handleUploadEditPortfolioImage = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditData((prev) => ({ ...prev, portfolio_images: [...(prev.portfolio_images || []), file_url] }));
  };

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (data) => {
      const existing = availability.find(a => a.day_of_week === data.day_of_week);
      if (existing) {
        return await base44.entities.ProviderAvailability.update(existing.id, data);
      }
      return await base44.entities.ProviderAvailability.create({
        ...data,
        provider_email: currentUser.email
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-availability"] });
      toast.success("Availability saved!");
    }
  });

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  if (!userLoaded) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-white text-lg">Loading Provider Hub...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Provider Hub</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your services, bookings, and earnings</p>
          </div>
          <Link to={createPageUrl("ProviderProfile")}>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 w-full sm:w-auto">
              <Shield className="w-4 h-4 mr-2" />
              View Public Profile
            </Button>
          </Link>
        </div>

        {currentUser && !currentUser.provider_onboarding_completed && (
          <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold mb-1">Complete Your Provider Setup</h3>
                    <p className="text-gray-300 text-sm">Get started in just 5 easy steps - set up your profile, availability, and first service!</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl("ProviderOnboarding"))}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Onboarding
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!currentUser?.stripe_account_id && (
          <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-500/30 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold mb-1">Connect Stripe to Receive Payments</h3>
                    <p className="text-gray-300 text-sm">Set up your payout account to start earning</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setStripeOnboarding(true);
                    createStripeAccountMutation.mutate();
                  }}
                  disabled={stripeOnboarding || createStripeAccountMutation.isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {stripeOnboarding || createStripeAccountMutation.isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2" />Connect Stripe</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Manage Listings", icon: List, color: "text-purple-400", bg: "bg-purple-500/10", onClick: () => navigate(createPageUrl("ProviderListings")) },
            { label: "Add New Service", icon: Plus, color: "text-blue-400", bg: "bg-blue-500/10", onClick: () => setActiveTab("services") },
            { label: "Get Verified", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", onClick: () => setActiveTab("verification") },
            { label: "Update Profile", icon: User, color: "text-orange-400", bg: "bg-orange-500/10", onClick: () => setActiveTab("profile") },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="group flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all text-left active:scale-[0.98]"
            >
              <div className={`w-11 h-11 rounded-xl ${action.bg} flex items-center justify-center`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-white font-semibold text-sm">{action.label}</span>
            </button>
          ))}
        </div>

        {(() => {
          const level = currentUser?.provider_verification_level && currentUser.provider_verification_level !== "none"
            ? currentUser.provider_verification_level : null;
          const trustScore = currentUser?.provider_trust_score || overallTrustScore;
          return (
            <Card className={`bg-gradient-to-r ${verificationLevelColors[level || "none"]} border-0 mb-8 overflow-hidden`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white text-xl font-bold mb-0.5 truncate">
                        {level ? `${level.charAt(0).toUpperCase() + level.slice(1)} Verified Provider` : "Get Verified"}
                      </h3>
                      <p className="text-white/80 text-sm">{verifiedCount} verification{verifiedCount !== 1 ? 's' : ''} completed</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-white text-3xl font-bold leading-none">{verifiedCount}/{verifications.length}</div>
                    <p className="text-white/80 text-xs mt-1">Verifications</p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-white/90 text-xs mb-1.5">
                    <span>Trust Score</span>
                    <span className="font-semibold">{trustScore}/100</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(trustScore, 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-2 px-2 hide-scrollbar">
            <TabsList className="inline-flex w-auto min-w-full bg-white/[0.04] backdrop-blur-xl border border-white/10 p-1.5 gap-1 rounded-xl">
              <TabsTrigger value="dashboard" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Dashboard</TabsTrigger>
              <TabsTrigger value="assets" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">My Assets ({myServices.length})</TabsTrigger>
              <TabsTrigger value="video-editor" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Video Editor</TabsTrigger>
              <TabsTrigger value="requests" className="relative whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                Requests
                {unreadBookingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {unreadBookingRequests > 9 ? '9+' : unreadBookingRequests}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages" className="relative whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                Messages
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="earnings" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Earnings</TabsTrigger>
              <TabsTrigger value="portfolio" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Portfolio</TabsTrigger>
              <TabsTrigger value="services" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Services</TabsTrigger>
              <TabsTrigger value="availability" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Availability</TabsTrigger>
              <TabsTrigger value="verification" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Verification</TabsTrigger>
              <TabsTrigger value="contracts" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Contracts</TabsTrigger>
              <TabsTrigger value="profile" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Profile</TabsTrigger>
              <TabsTrigger value="settings" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardMetrics currentUser={currentUser} />
            <RentalNotifications currentUser={currentUser} />
            <StripeExpressDashboard currentUser={currentUser} />
            <AdvancedAnalytics currentUser={currentUser} />
            <BusinessReportGenerator currentUser={currentUser} />
            <FinancialDataExport currentUser={currentUser} />
            <PerformanceDashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="assets" className="space-y-6">
            <MultiAssetDashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="video-editor" className="space-y-6">
            <AdvancedVideoEditor currentUser={currentUser} />
            <VideoEditorPro currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <BookingRequestsSection currentUser={currentUser} />
            <ActiveRentalsManager currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <ProviderChatSection currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowPayoutModal(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <DollarSign className="w-4 h-4 mr-2" />Request Payout
              </Button>
            </div>
            <EarningsSection currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Award className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Showcase Your Work</h3>
                    <p className="text-blue-200 text-sm">Build trust and attract more customers by showcasing your best work.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <PortfolioSection userEmail={currentUser?.email} isOwnProfile={true} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ServicePackageManager myServices={myServices} currentUser={currentUser} />

            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Brand Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Business Name" value={brand.provider_brand_name} onChange={(e) => setBrand({...brand, provider_brand_name: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                <Input placeholder="Logo URL" value={brand.provider_logo_url} onChange={(e) => setBrand({...brand, provider_logo_url: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                <Input placeholder="About Your Business" value={brand.provider_description} onChange={(e) => setBrand({...brand, provider_description: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                <Button onClick={saveBrand} className="bg-purple-600 hover:bg-purple-700 w-full">Save Brand Profile</Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Add New Service/Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Service/Product Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="bg-white/10 border-white/20 text-white" />

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Service Category *</label>
                    <Select value={form.category} onValueChange={(v) => { const isRental = isRentalCategory(v); setForm({...form, category: v, is_rental: isRental}); }}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent className="max-h-96">
                        <SelectItem value="barber_beauty">Barber & Beauty</SelectItem>
                        <SelectItem value="hair_extensions">Hair Extensions</SelectItem>
                        <SelectItem value="hair_makeup">Hair & Makeup</SelectItem>
                        <SelectItem value="massage_therapy">Massage Therapy</SelectItem>
                        <SelectItem value="home_services">Home Services</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="pool_maintenance">Pool Maintenance</SelectItem>
                        <SelectItem value="pest_control">Pest Control</SelectItem>
                        <SelectItem value="roofing">Roofing</SelectItem>
                        <SelectItem value="painting">Painting</SelectItem>
                        <SelectItem value="junk_removal">Junk Removal</SelectItem>
                        <SelectItem value="locksmith">Locksmith</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="food_truck">Food Truck</SelectItem>
                        <SelectItem value="personal_chef">Personal Chef</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="chauffeur">Chauffeur Service</SelectItem>
                        <SelectItem value="moving_services">Moving Services</SelectItem>
                        <SelectItem value="property_rental">Property Rental</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="interior_design">Interior Design</SelectItem>
                        <SelectItem value="legal_services">Legal Services</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="financial_planning">Financial Planning</SelectItem>
                        <SelectItem value="tax_preparation">Tax Preparation</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="wedding_planning">Wedding Planning</SelectItem>
                        <SelectItem value="event_planning">Event Planning</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="video_production">Video Production</SelectItem>
                        <SelectItem value="dj_entertainment">DJ & Entertainment</SelectItem>
                        <SelectItem value="equipment_rental">Equipment Rental</SelectItem>
                        <SelectItem value="graphic_design">Graphic Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="web_development">Web Development</SelectItem>
                        <SelectItem value="content_writing">Content Writing</SelectItem>
                        <SelectItem value="tutoring">Tutoring</SelectItem>
                        <SelectItem value="music_lessons">Music Lessons</SelectItem>
                        <SelectItem value="fitness_training">Fitness Training</SelectItem>
                        <SelectItem value="life_coaching">Life Coaching</SelectItem>
                        <SelectItem value="childcare">Childcare</SelectItem>
                        <SelectItem value="pet_services">Pet Services</SelectItem>
                        <SelectItem value="tech_support">Tech Support</SelectItem>
                        <SelectItem value="computer_repair">Computer Repair</SelectItem>
                        <SelectItem value="virtual_assistant">Virtual Assistant</SelectItem>
                        <SelectItem value="health_insurance">Health Insurance</SelectItem>
                        <SelectItem value="car_insurance">Car Insurance</SelectItem>
                        <SelectItem value="bail_bonding">Bail Bonds</SelectItem>
                        <SelectItem value="yacht_charter">Yacht Charter</SelectItem>
                        <SelectItem value="bounce_house_rental">Bounce House Rental</SelectItem>
                        <SelectItem value="party_rental">Party Rental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={form.price_type} onValueChange={(v) => setForm({...form, price_type: v})}>
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 text-sm">Price (USD)</label>
                    <Button type="button" size="sm" onClick={suggestPricing} disabled={generatingPricing || !form.title} className="bg-green-600 hover:bg-green-700">
                      {generatingPricing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing...</> : <><TrendingUp className="w-3 h-3 mr-1" />AI Suggest</>}
                    </Button>
                  </div>
                  <Input type="number" placeholder="Price (USD)" value={form.price} onChange={(e) => setForm({...form, price: Number(e.target.value)})} className="bg-white/10 border-white/20 text-white" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 text-sm">Description</label>
                    <Button type="button" size="sm" onClick={generateDescription} disabled={generatingDescription || !form.title} className="bg-purple-600 hover:bg-purple-700">
                      {generatingDescription ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Star className="w-3 h-3 mr-1" />AI Generate</>}
                    </Button>
                  </div>
                  <Input placeholder="Service description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                </div>

                {form.is_rental ? (
                  <>
                    <RentalAssetManager rentalDetails={form.rental_details} onChange={(d) => setForm({...form, rental_details: d})} />
                    <RentalCalendar blockedDates={form.blocked_dates} onChange={(d) => setForm({...form, blocked_dates: d})} />
                  </>
                ) : (
                  <>
                    <ServiceVariationsManager variations={form.variations} onChange={(v) => setForm({...form, variations: v})} />
                    <ServiceAddOnsManager addOns={form.add_ons} onChange={(a) => setForm({...form, add_ons: a})} />
                  </>
                )}

                <div className="space-y-3">
                  <label className="text-white font-medium block">Cover Image</label>
                  {form.image_url && (
                    <div className="relative inline-block">
                      <img src={form.image_url} alt="cover" className="w-32 h-32 object-cover rounded-lg border border-white/20" />
                      <button onClick={() => setForm({...form, image_url: ""})} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('cover-upload').click()}>
                      <Upload className="w-4 h-4 mr-2" />Upload Image
                    </Button>
                    <input id="cover-upload" type="file" accept="image/*" onChange={(e) => handleUploadCoverImage(e.target.files?.[0])} className="hidden" />
                    <span className="text-gray-400 text-sm">or</span>
                    <Input placeholder="Paste image URL" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) { setForm({...form, image_url: e.currentTarget.value}); e.currentTarget.value = ""; } }} className="bg-white/10 border-white/20 text-white flex-1" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-white font-medium block">Portfolio Images (Optional)</label>
                  <div className="flex flex-wrap gap-3">
                    {form.portfolio_images?.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`portfolio-${idx}`} className="w-24 h-24 object-cover rounded-lg border border-white/20" />
                        <button onClick={() => setForm((prev) => ({ ...prev, portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={() => document.getElementById('portfolio-upload').click()}>
                    <Upload className="w-4 h-4 mr-2" />Add Image
                  </Button>
                  <input id="portfolio-upload" type="file" accept="image/*" onChange={(e) => handleUploadPortfolioImage(e.target.files?.[0])} className="hidden" />
                </div>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <Switch checked={form.escrow_required} onCheckedChange={(v) => setForm({ ...form, escrow_required: v })} />
                  <div className="text-sm">
                    <div className="text-white font-medium">Require Escrow Protection</div>
                    <div className="text-gray-400">Payments held securely until service completion</div>
                  </div>
                </div>

                <Button
                  className="bg-green-600 hover:bg-green-700 w-full"
                  onClick={() => {
                    if (!form.title || !form.description || !form.image_url) {
                      toast.error('Please fill in title, description, and upload a cover image');
                      return;
                    }
                    createMutation.mutate(form);
                  }}
                  disabled={createMutation.isLoading || !form.title || !form.description || !form.image_url}
                >
                  {createMutation.isLoading ? 'Publishing...' : 'Publish Service to Marketplace'}
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-white font-bold">Your Active Services</h2>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {[...new Set(myServices.map(s => s.category))].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white"><SelectValue placeholder="Sort By" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_date">Newest First</SelectItem>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="-price">Price: High to Low</SelectItem>
                    <SelectItem value="title">Name: A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myServices
                .filter(s => filterCategory === 'all' || s.category === filterCategory)
                .sort((a, b) => {
                  if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
                  if (sortBy === '-price') return (b.price || 0) - (a.price || 0);
                  if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
                  return new Date(b.created_date) - new Date(a.created_date);
                })
                .map(s => (
                <Card key={s.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    {s.image_url && <img src={s.image_url} alt={s.title} className="h-40 w-full object-cover rounded-lg mb-3" />}
                    <div className="text-white font-semibold text-lg mb-1">{s.title}</div>
                    <div className="text-gray-400 text-sm capitalize mb-2">{s.category?.replace("_"," ")}</div>
                    <div className="text-white text-xl font-bold mb-1">${s.price?.toFixed(2)}</div>
                    {s.is_rental && <Badge className="bg-purple-500/20 text-purple-300 text-xs mb-2">Rental Asset</Badge>}
                    {!s.is_rental && s.variations?.length > 0 && <p className="text-purple-400 text-xs mb-1">{s.variations.length} variations</p>}
                    {!s.is_rental && s.add_ons?.length > 0 && <p className="text-blue-400 text-xs mb-2">{s.add_ons.length} add-ons available</p>}
                    <Button size="sm" variant="outline" onClick={() => startEdit(s)} className="w-full">
                      Manage {s.is_rental ? 'Rental' : 'Service'}
                    </Button>

                    {editingId === s.id && editData && (
                      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                        <Input type="number" value={editData.price} onChange={(e) => setEditData({...editData, price: Number(e.target.value)})} placeholder="Price" className="bg-white/10 border-white/20 text-white" />
                        <Select value={editData.price_type} onValueChange={(v) => setEditData({...editData, price_type: v})}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue placeholder="Price Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="per_day">Per Day</SelectItem>
                            <SelectItem value="per_project">Per Project</SelectItem>
                            <SelectItem value="negotiable">Negotiable</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="space-y-2">
                          <label className="text-white text-sm">Cover Image</label>
                          {editData.image_url && <img src={editData.image_url} alt="cover" className="w-full h-32 object-cover rounded-lg" />}
                          <Button size="sm" variant="outline" onClick={() => document.getElementById(`edit-cover-${s.id}`).click()} className="w-full">
                            <Upload className="w-4 h-4 mr-2" />Change Cover
                          </Button>
                          <input id={`edit-cover-${s.id}`} type="file" accept="image/*" onChange={(e) => handleUploadEditCoverImage(e.target.files?.[0])} className="hidden" />
                        </div>

                        {editData.is_rental ? (
                          <>
                            <RentalAssetManager rentalDetails={editData.rental_details} onChange={(d) => setEditData({...editData, rental_details: d})} />
                            <RentalCalendar blockedDates={editData.blocked_dates} onChange={(d) => setEditData({...editData, blocked_dates: d})} />
                          </>
                        ) : (
                          <>
                            <ServiceVariationsManager variations={editData.variations} onChange={(v) => setEditData({...editData, variations: v})} />
                            <ServiceAddOnsManager addOns={editData.add_ons} onChange={(a) => setEditData({...editData, add_ons: a})} />
                          </>
                        )}

                        <AvailabilityOverridesManager serviceId={s.id} providerEmail={currentUser?.email} />

                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => updateMutation.mutate({ id: s.id, data: editData })} disabled={updateMutation.isLoading}>
                            Save Changes
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData(null); }} className="flex-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Shield className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Why Get Verified?</h3>
                    <ul className="text-gray-300 space-y-1 text-sm">
                      <li>• Build trust with customers instantly</li>
                      <li>• Rank higher in search results</li>
                      <li>• Access premium features and pricing</li>
                      <li>• Get a verified badge on your listings</li>
                      <li>• Increase booking rates by up to 300%</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white">Request Verification</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Verification Type</label>
                  <Select value={verificationForm.verification_type} onValueChange={(v) => setVerificationForm({...verificationForm, verification_type: v})}>
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">License/Certificate Number</label>
                    <Input placeholder="e.g., ABC-123456" value={verificationForm.license_number} onChange={(e) => setVerificationForm({...verificationForm, license_number: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Issuing Authority</label>
                    <Input placeholder="e.g., State Board" value={verificationForm.issuing_authority} onChange={(e) => setVerificationForm({...verificationForm, issuing_authority: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Issue Date</label>
                    <Input type="date" value={verificationForm.issue_date} onChange={(e) => setVerificationForm({...verificationForm, issue_date: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Expiration Date</label>
                    <Input type="date" value={verificationForm.expiration_date} onChange={(e) => setVerificationForm({...verificationForm, expiration_date: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Upload Documents</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {verificationForm.document_urls?.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`doc-${idx}`} className="w-24 h-24 object-cover rounded-lg border border-white/20" />
                        <button onClick={() => setVerificationForm((prev) => ({ ...prev, document_urls: prev.document_urls.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={() => document.getElementById('verification-upload').click()}>
                    <Upload className="w-4 h-4 mr-2" />Upload Document
                  </Button>
                  <input id="verification-upload" type="file" accept="image/*,application/pdf" onChange={(e) => handleDocumentUpload(e.target.files?.[0])} className="hidden" />
                </div>

                <Button onClick={() => submitVerificationMutation.mutate(verificationForm)} disabled={!verificationForm.license_number || submitVerificationMutation.isLoading} className="w-full bg-green-600 hover:bg-green-700">
                  <FileText className="w-4 h-4 mr-2" />Submit Verification Request
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">My Verifications</h2>
              {verifications.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-12 text-center">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No verifications yet</h3>
                    <p className="text-gray-400">Submit your first verification to build trust</p>
                  </CardContent>
                </Card>
              ) : (
                verifications.map((verification) => {
                  const StatusIcon = statusIcons[verification.status] || CheckCircle;
                  return (
                    <Card key={verification.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 ${verification.status === 'verified' ? 'bg-green-500/20' : 'bg-blue-500/20'} rounded-full flex items-center justify-center`}>
                              <StatusIcon className={`w-6 h-6 ${verification.status === 'verified' ? 'text-green-400' : 'text-blue-400'}`} />
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg capitalize mb-1">{verification.verification_type.replace(/_/g, ' ')}</h3>
                              {verification.license_number && <p className="text-gray-400 text-sm mb-1">License: {verification.license_number}</p>}
                              {verification.issuing_authority && <p className="text-gray-400 text-sm">Issued by: {verification.issuing_authority}</p>}
                            </div>
                          </div>
                          <Badge className={statusColors[verification.status]}>{verification.status.toUpperCase()}</Badge>
                        </div>
                        {verification.expiration_date && (
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                            <Calendar className="w-4 h-4" />Expires: {new Date(verification.expiration_date).toLocaleDateString()}
                          </div>
                        )}
                        {verification.status === 'rejected' && verification.rejection_reason && (
                          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm"><strong>Rejection Reason:</strong> {verification.rejection_reason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <ContractTemplateManager currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white">Provider Profile Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Business Name</label>
                    <Input placeholder="Your Business Name" value={currentUser?.provider_business_name || ""} onChange={async (e) => { const updated = await base44.auth.updateMe({ provider_business_name: e.target.value }); setCurrentUser(prev => ({...prev, ...updated})); }} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Phone Number</label>
                    <Input placeholder="+1 (555) 123-4567" value={currentUser?.provider_phone || ""} onChange={async (e) => { const updated = await base44.auth.updateMe({ provider_phone: e.target.value }); setCurrentUser(prev => ({...prev, ...updated})); }} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-gray-400 text-sm mb-2 block">Business Address</label>
                    <Input placeholder="123 Main St, City, State ZIP" value={currentUser?.provider_business_address || ""} onChange={async (e) => { const updated = await base44.auth.updateMe({ provider_business_address: e.target.value }); setCurrentUser(prev => ({...prev, ...updated})); }} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Website</label>
                    <Input placeholder="https://yourbusiness.com" value={currentUser?.provider_website || ""} onChange={async (e) => { const updated = await base44.auth.updateMe({ provider_website: e.target.value }); setCurrentUser(prev => ({...prev, ...updated})); }} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Years of Experience</label>
                    <Input type="number" placeholder="10" value={currentUser?.provider_years_experience || ""} onChange={async (e) => { const updated = await base44.auth.updateMe({ provider_years_experience: Number(e.target.value) }); setCurrentUser(prev => ({...prev, ...updated})); }} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white">Set Your Availability</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {daysOfWeek.map(day => {
                  const existingAvail = availability.find(a => a.day_of_week === day);
                  const isAvailable = existingAvail?.is_available ?? true;
                  return (
                    <div key={day} className="bg-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold capitalize">{day}</h3>
                        <Switch checked={isAvailable} onCheckedChange={async (checked) => {
                          await saveAvailabilityMutation.mutateAsync({
                            day_of_week: day, is_available: checked,
                            start_time: existingAvail?.start_time || "09:00",
                            end_time: existingAvail?.end_time || "17:00",
                            slot_duration_minutes: existingAvail?.slot_duration_minutes || 60
                          });
                        }} />
                      </div>
                      {isAvailable && (
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Start Time</label>
                            <Input type="time" value={existingAvail?.start_time || "09:00"} onChange={(e) => { setAvailabilityForm({ day_of_week: day, is_available: true, start_time: e.target.value, end_time: existingAvail?.end_time || "17:00", slot_duration_minutes: existingAvail?.slot_duration_minutes || 60 }); }} onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)} className="bg-white/10 border-white/20 text-white" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">End Time</label>
                            <Input type="time" value={existingAvail?.end_time || "17:00"} onChange={(e) => { setAvailabilityForm({ day_of_week: day, is_available: true, start_time: existingAvail?.start_time || "09:00", end_time: e.target.value, slot_duration_minutes: existingAvail?.slot_duration_minutes || 60 }); }} onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)} className="bg-white/10 border-white/20 text-white" />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Slot Duration (min)</label>
                            <Select value={String(existingAvail?.slot_duration_minutes || 60)} onValueChange={(value) => { saveAvailabilityMutation.mutate({ day_of_week: day, is_available: true, start_time: existingAvail?.start_time || "09:00", end_time: existingAvail?.end_time || "17:00", slot_duration_minutes: Number(value) }); }}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="90">1.5 hours</SelectItem>
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
        </Tabs>

        <ProviderPayoutManager isOpen={showPayoutModal} onClose={() => setShowPayoutModal(false)} currentUser={currentUser} />
      </div>

      <RealtimeNotifications currentUser={currentUser} />
    </div>
  );
}