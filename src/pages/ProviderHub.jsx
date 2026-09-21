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
  Award, FileText, Calendar, Plus, User, List, ArrowRight,
  DollarSign, CreditCard, Loader2, Sparkles, Clock
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BookingRequestsSection from "../components/provider/BookingRequestsSection";
import EarningsSection from "../components/provider/EarningsSection";
import PerformanceDashboard from "../components/provider/PerformanceDashboard";
import ProviderChatSection from "../components/provider/ProviderChatSection";
import ServicePackageManager from "../components/provider/ServicePackageManager";
import ProviderPayoutManager from "../components/provider/ProviderPayoutManager";
import AdvancedVideoEditor from "../components/video/AdvancedVideoEditor";
import VideoEditorPro from "../components/creator/VideoEditorPro";
import DashboardMetrics from "../components/provider/DashboardMetrics";
import RentalNotifications from "../components/provider/RentalNotifications";
import StripeExpressDashboard from "../components/provider/StripeExpressDashboard";
import ActiveRentalsManager from "../components/provider/ActiveRentalsManager";
import ContractTemplateManager from "../components/provider/ContractTemplateManager";
import ContractManager from "../components/contracts/ContractManager";
import AdvancedAnalytics from "../components/provider/AdvancedAnalytics";
import BusinessReportGenerator from "../components/provider/BusinessReportGenerator";
import FinancialDataExport from "../components/provider/FinancialDataExport";
import RealtimeNotifications from "../components/provider/RealtimeNotifications";
import MultiAssetDashboard from "../components/provider/MultiAssetDashboard";
import PortfolioSection from "../components/profile/PortfolioSection";

export default function ProviderHub() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || "dashboard");
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
    queryKey: ["my-services", currentUser?.email],
    queryFn: () => {
      if (!currentUser) return [];
      return base44.entities.MarketplaceItem.filter({ provider_email: currentUser.email });
    },
    enabled: !!currentUser,
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

  // Lets other pages/components (e.g. MultiAssetDashboard's "View Earnings"
  // button) deep-link straight into a specific tab via ?tab=earnings, etc.
  useEffect(() => {
    const tab = new URLSearchParams(routerLocation.search).get('tab');
    if (tab) setActiveTab(tab);
  }, [routerLocation.search]);

  const saveBrand = async () => {
    await base44.auth.updateMe(brand);
    const updatedUser = await base44.auth.me();
    setCurrentUser(updatedUser);
    toast.success("Brand profile saved!");
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
            { label: "View Requests", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10", onClick: () => setActiveTab("requests") },
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
              {/* Grouped so related capabilities sit next to each other:
                  overview -> your offerings -> customer activity -> money ->
                  trust & identity -> creative tools. Every value here is a
                  real, rendered TabsContent below -- the old "Settings" tab
                  had none (a dead nav item that showed a blank panel) and
                  has been removed rather than left empty. */}
              <TabsTrigger value="dashboard" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="services" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Listings & Packages</TabsTrigger>
              <TabsTrigger value="assets" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Performance ({myServices.length})</TabsTrigger>
              <TabsTrigger value="availability" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Availability</TabsTrigger>
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
              <TabsTrigger value="earnings" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Earnings & Reports</TabsTrigger>
              <TabsTrigger value="contracts" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Contracts</TabsTrigger>
              <TabsTrigger value="verification" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Verification</TabsTrigger>
              <TabsTrigger value="portfolio" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Portfolio</TabsTrigger>
              <TabsTrigger value="profile" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Profile</TabsTrigger>
              <TabsTrigger value="video-editor" className="whitespace-nowrap px-4 text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Video Editor</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {/* At-a-glance only -- the heavier reporting tools (analytics,
                report generator, data export) live under Earnings & Reports
                so this tab stays scannable instead of stacking 7 dashboards. */}
            <DashboardMetrics currentUser={currentUser} />
            <RentalNotifications currentUser={currentUser} />
            <StripeExpressDashboard currentUser={currentUser} />
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
            <AdvancedAnalytics currentUser={currentUser} />
            <BusinessReportGenerator currentUser={currentUser} />
            <FinancialDataExport currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            {/* Creating/editing an individual listing (with rental details,
                variations, add-ons, AI-assisted description/pricing, etc.)
                now happens in one place -- Manage Listings -- instead of
                two different forms with two different category lists and
                one of them silently orphaning listings from a data bug.
                This tab is for the things that operate ACROSS listings:
                bundling them into packages, and jumping to the full editor. */}
            <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-white text-lg font-bold mb-1">Manage Your Listings</h3>
                  <p className="text-gray-300 text-sm">
                    {myServices.length > 0
                      ? `${myServices.length} listing${myServices.length !== 1 ? 's' : ''} live -- create, edit, price, and add rental details, variations, or add-ons.`
                      : "Create your first service, rental, or product listing."}
                  </p>
                </div>
                <Button onClick={() => navigate(createPageUrl("ProviderListings"))} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex-shrink-0">
                  <List className="w-4 h-4 mr-2" />Manage Listings<ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <ServicePackageManager myServices={myServices} currentUser={currentUser} />
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
            <ContractManager currentUser={currentUser} />
            <ContractTemplateManager currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white">Brand Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Business Name" value={brand.provider_brand_name} onChange={(e) => setBrand({...brand, provider_brand_name: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                <Input placeholder="Logo URL" value={brand.provider_logo_url} onChange={(e) => setBrand({...brand, provider_logo_url: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                <Input placeholder="About Your Business" value={brand.provider_description} onChange={(e) => setBrand({...brand, provider_description: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                <Button onClick={saveBrand} className="bg-purple-600 hover:bg-purple-700 w-full">Save Brand Profile</Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-white">Contact & Business Details</CardTitle></CardHeader>
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

          <TabsContent value="portfolio" className="space-y-6">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-6 flex items-center gap-4">
                <Award className="w-8 h-8 text-blue-400 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Showcase Your Work</h3>
                  <p className="text-gray-300 text-sm">Build trust and attract more customers by featuring your best photos and videos.</p>
                </div>
              </CardContent>
            </Card>
            <PortfolioSection userEmail={currentUser?.email} isOwnProfile={true} currentUser={currentUser} />
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