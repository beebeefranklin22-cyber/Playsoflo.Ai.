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
  DollarSign, Star, BarChart3, Users, CreditCard, Loader2, Inbox, Sparkles, Clock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BookingRequestsSection from "../components/provider/BookingRequestsSection";
import EarningsSection from "../components/provider/EarningsSection";
import PerformanceDashboard from "../components/provider/PerformanceDashboard";
import ProviderChatSection from "../components/provider/ProviderChatSection";
import PortfolioSection from "../components/profile/PortfolioSection";

const categories = [
  "logistics","bail_bonding","car_insurance","home_insurance","health_insurance","life_insurance",
  "construction","automotive","legal_services","event_planning","concierge","personal_chef",
  "barber_beauty","wellness","acupuncture","chiropractic","orthodontics","rehab","shelter_services",
  "injury_care","senior_care","restaurant","food_truck","groceries","hair_extensions",
  "physical_therapy","mental_health_counseling","nutrition_counseling","substance_abuse_counseling",
  "hospice_care","home_healthcare","medical_equipment_rental","physical_rehabilitation",
  "occupational_therapy","speech_therapy","mobility_assistance"
];

export default function ProviderHub() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
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
    refetchInterval: 10000, // Refetch every 10 seconds
    initialData: []
  });

  // Count unread messages for badge
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
    refetchInterval: 5000 // Check every 5 seconds
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
        // Mark user as provider if not already
        if (!user.is_provider) {
          await base44.auth.updateMe({ is_provider: true });
        }
      } catch (error) {
        console.log("Error loading user:", error);
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
      alert("Verification request submitted! We'll review it within 24-48 hours.");
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

  // Calculate overall trust score
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
      const { accountId } = await base44.functions.invoke('createConnectedAccount', {
        email: currentUser.email,
        country: 'US'
      });
      await base44.auth.updateMe({ stripe_account_id: accountId });
      return accountId;
    },
    onSuccess: async (accountId) => {
      const { url } = await base44.functions.invoke('createAccountLink', {
        accountId,
        returnUrl: `${window.location.origin}${createPageUrl('ProviderHub')}?onboarding=success`,
        refreshUrl: `${window.location.origin}${createPageUrl('ProviderHub')}?onboarding=refresh`
      });
      window.location.href = url;
    },
    onError: (error) => {
      toast.error('Failed to create Stripe account: ' + error.message);
      setStripeOnboarding(false);
    }
  });

  const checkStripeStatusMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.stripe_account_id) return null;
      const data = await base44.functions.invoke('getAccountStatus', {
        accountId: currentUser.stripe_account_id
      });
      return data;
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
    const updatedUser = await base44.auth.me(); // Fetch updated user
    setCurrentUser(updatedUser); // Update local state
    alert("Brand profile saved");
  };

  const [form, setForm] = useState({
    title: "",
    category: "logistics",
    price: 100,
    price_type: "fixed",
    image_url: "",
    description: "",
    escrow_required: false,
    portfolio_images: []
  });

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
        prompt: `You are an expert service provider copywriter. Create a compelling, professional service description for the following:

Service Title: ${form.title}
Category: ${form.category}

The description should:
- Be 2-3 sentences long
- Highlight the key benefits to customers
- Sound professional yet approachable
- Include relevant details about what's included
- End with a call to action

Generate only the description text, nothing else.`,
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
        prompt: `You are a pricing expert for service marketplaces. Based on market trends and industry standards, suggest an optimal price for:

Service: ${form.title}
Category: ${form.category}
Current Price Type: ${form.price_type}

Provide a competitive price that balances profitability and market demand. Consider:
- Industry standard rates
- Skill level required
- Time/effort involved
- Local market conditions

Respond with ONLY a single number (the suggested price in USD). No explanation, just the number.`,
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
        alert("Only verified businesses can offer Logistics. Please verify your business in your profile.");
        return Promise.reject("Not verified for logistics"); // Reject the promise
      }
      return base44.entities.MarketplaceItem.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      setForm({ title: "", category: "logistics", price: 100, price_type: "fixed", image_url: "", description: "", escrow_required: false, portfolio_images: [] });
    },
    onError: (error) => {
        if (error !== "Not verified for logistics") { // Don't re-alert for this specific error
            alert("Failed to publish service: " + error.message);
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
    }
  });

  const startEdit = (service) => {
    setEditingId(service.id);
    setEditData({
      price: service.price || 0,
      price_type: service.price_type || "fixed",
      image_url: service.image_url || "",
      portfolio_images: service.portfolio_images || []
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
      alert("Availability saved successfully!");
    }
  });

  // Calculate dashboard metrics
  const upcomingBookings = myBookings.filter(b => 
    new Date(b.booking_date) >= new Date() && 
    (b.status === 'pending' || b.status === 'confirmed')
  ).length;

  const totalEarnings = myBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const completedBookings = myBookings.filter(b => b.status === 'completed');
  const avgRating = completedBookings.length > 0
    ? completedBookings.reduce((sum, b) => sum + (b.rating || 0), 0) / completedBookings.filter(b => b.rating).length
    : 0;

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Provider Hub</h1>
          <Link to={createPageUrl("ProviderProfile")} className="flex items-center gap-2">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Shield className="w-4 h-4 mr-2" />
              View My Public Profile
            </Button>
          </Link>
        </div>

        {/* Stripe Connect Onboarding Banner */}
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
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Connect Stripe
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button
            onClick={() => navigate(createPageUrl("ProviderListings"))}
            className="bg-gradient-to-r from-purple-600 to-pink-600 py-8 text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          >
            <List className="w-6 h-6 mr-2" />
            Manage Listings
          </Button>
          <Button
            onClick={() => setActiveTab("services")}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 py-8 text-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200"
          >
            <Plus className="w-6 h-6 mr-2" />
            Add New Service
          </Button>
          <Button
            onClick={() => setActiveTab("verification")}
            className="bg-gradient-to-r from-green-600 to-teal-600 py-8 text-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200"
          >
            <Shield className="w-6 h-6 mr-2" />
            Get Verified
          </Button>
          <Button
            onClick={() => setActiveTab("profile")}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 py-8 text-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-200"
          >
            <User className="w-6 h-6 mr-2" />
            Update Profile
          </Button>
        </div>

        {/* Verification Status Banner */}
        <Card className={`bg-gradient-to-r ${verificationLevelColors[currentUser?.provider_verification_level || "none"]} border-0 mb-6`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-white text-2xl font-bold mb-1">
                    {currentUser?.provider_verification_level === "none"
                      ? "Get Verified"
                      : `${currentUser?.provider_verification_level?.toUpperCase()} Verified Provider`}
                  </h3>
                  <p className="text-white/90">
                    Trust Score: {currentUser?.provider_trust_score || overallTrustScore}/100
                  </p>
                  <p className="text-white/80 text-sm">
                    {verifiedCount} verification{verifiedCount !== 1 ? 's' : ''} completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white text-4xl font-bold mb-2">
                  {verifiedCount}/{verifications.length}
                </div>
                <p className="text-white/90 text-sm">Verifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <PerformanceDashboard currentUser={currentUser} />
          </TabsContent>

          {/* Booking Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <BookingRequestsSection currentUser={currentUser} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <ProviderChatSection currentUser={currentUser} />
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <EarningsSection currentUser={currentUser} />
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 mb-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Award className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Showcase Your Work</h3>
                    <p className="text-blue-200 text-sm">
                      Build trust and attract more customers by showcasing your best work. Upload images, videos, or detailed case studies of your completed projects.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PortfolioSection 
              userEmail={currentUser?.email} 
              isOwnProfile={true} 
              currentUser={currentUser} 
            />
          </TabsContent>

          {/* Old Dashboard Content for reference */}
          <TabsContent value="dashboard-old" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-blue-400" />
                    <Badge className="bg-blue-500/30 text-blue-300 border-0">Total</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{myBookings.length}</div>
                  <div className="text-blue-300 text-sm">Total Bookings</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-8 h-8 text-purple-400" />
                    <Badge className="bg-purple-500/30 text-purple-300 border-0">Upcoming</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{upcomingBookings}</div>
                  <div className="text-purple-300 text-sm">Upcoming Appointments</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-green-400" />
                    <Badge className="bg-green-500/30 text-green-300 border-0">Earnings</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">${totalEarnings.toFixed(0)}</div>
                  <div className="text-green-300 text-sm">Total Earnings</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="w-8 h-8 text-yellow-400" />
                    <Badge className="bg-yellow-500/30 text-yellow-300 border-0">Rating</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-yellow-300 text-sm">Average Rating</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Bookings */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Recent Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No bookings yet. Start promoting your services!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myBookings.slice(0, 5).map(booking => (
                      <div key={booking.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{booking.service_title}</h4>
                          <p className="text-gray-400 text-sm">
                            {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                          </p>
                          <p className="text-gray-500 text-xs">{booking.customer_email}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            booking.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            booking.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }>
                            {booking.status}
                          </Badge>
                          <div className="text-white font-bold mt-2">${booking.total_price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Booking Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {myBookings.filter(b => b.status === 'completed').length}
                    </div>
                    <div className="text-gray-400 text-sm">Completed</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {myBookings.filter(b => b.status === 'cancelled').length}
                    </div>
                    <div className="text-gray-400 text-sm">Cancelled</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {myBookings.length > 0 ? 
                        ((myBookings.filter(b => b.status === 'completed').length / myBookings.length) * 100).toFixed(0) 
                        : 0}%
                    </div>
                    <div className="text-gray-400 text-sm">Completion Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            {/* Ronron AI Smart Package Generator */}
            <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Ronron AI - Smart Package Creator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-purple-300 text-sm">
                  Let AI analyze your services and create optimized bundles based on holidays, seasons, events, and demand trends
                </p>

                <div className="grid md:grid-cols-3 gap-3">
                  {['Holiday Bundles', 'Seasonal Packages', 'Event Specials'].map((type) => (
                    <Button
                      key={type}
                      onClick={async () => {
                        setGeneratingPackage(true);
                        try {
                          const response = await base44.integrations.Core.InvokeLLM({
                            prompt: `You are an expert package pricing strategist for service providers. 

          Current Date: ${new Date().toLocaleDateString()}

          Provider's Services:
          ${myServices.map(s => `- ${s.title}: $${s.price} (${s.category})`).join('\n')}

          Task: Create 3 smart service bundles for "${type}" considering:
          - Current season and upcoming holidays
          - Service compatibility and natural pairings
          - Market demand trends
          - Optimal pricing strategies (10-30% discount on combined value)
          - Customer appeal and value proposition

          For each bundle, provide:
          1. Creative package name that appeals to customers
          2. 2-4 services to include (use exact service titles from the list above)
          3. Individual service values and total value
          4. Suggested bundle price (with strategic discount)
          5. Compelling description (2-3 sentences)
          6. Best time period to promote this bundle
          7. Target customer segment

          Return as JSON array with this exact structure:
          {
          "packages": [
          {
          "name": "Package name",
          "services": ["exact service title 1", "exact service title 2"],
          "service_prices": [100, 200],
          "total_value": 300,
          "bundle_price": 240,
          "discount_percent": 20,
          "description": "Why customers love this",
          "promotion_period": "December 2024 - January 2025",
          "target_audience": "Who this is for"
          }
          ]
          }`,
                            add_context_from_internet: true,
                            response_json_schema: {
                              type: "object",
                              properties: {
                                packages: {
                                  type: "array",
                                  items: {
                                    type: "object",
                                    properties: {
                                      name: { type: "string" },
                                      services: { type: "array", items: { type: "string" } },
                                      service_prices: { type: "array", items: { type: "number" } },
                                      total_value: { type: "number" },
                                      bundle_price: { type: "number" },
                                      discount_percent: { type: "number" },
                                      description: { type: "string" },
                                      promotion_period: { type: "string" },
                                      target_audience: { type: "string" }
                                    }
                                  }
                                }
                              }
                            }
                          });

                          setGeneratedPackages(response.packages || []);
                          setShowPackages(true);
                          toast.success('Smart packages generated!');
                        } catch (error) {
                          toast.error('Failed to generate packages');
                        } finally {
                          setGeneratingPackage(false);
                        }
                      }}
                      disabled={generatingPackage || myServices.length < 2}
                      className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30"
                    >
                      {generatingPackage ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4 mr-2" />
                      )}
                      {type}
                    </Button>
                  ))}
                </div>

                {myServices.length < 2 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-300 text-sm">
                      Add at least 2 services to generate smart packages
                    </p>
                  </div>
                )}

                {showPackages && generatedPackages.length > 0 && (
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    {generatedPackages.map((pkg, idx) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-white font-bold">{pkg.name}</h4>
                          <Badge className="bg-green-500/20 text-green-300">
                            -{pkg.discount_percent}%
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          {pkg.services.map((service, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{service}</span>
                              <span className="text-gray-400">${pkg.service_prices[i]}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-white/10 pt-3 mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-400 text-sm">Total Value</span>
                            <span className="text-gray-400 line-through">${pkg.total_value}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold">Bundle Price</span>
                            <span className="text-green-400 font-bold text-xl">${pkg.bundle_price}</span>
                          </div>
                        </div>

                        <p className="text-gray-400 text-xs mb-3">{pkg.description}</p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            <span className="text-purple-300">{pkg.promotion_period}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Users className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-300">{pkg.target_audience}</span>
                          </div>
                        </div>

                        <Button 
                          onClick={() => {
                            // Save package logic here
                            toast.success('Package saved! Implement save logic to create this as a service bundle.');
                          }}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          Create Package
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Brand Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Business Name"
                  value={brand.provider_brand_name}
                  onChange={(e) => setBrand({...brand, provider_brand_name: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="Logo URL"
                  value={brand.provider_logo_url}
                  onChange={(e) => setBrand({...brand, provider_logo_url: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="About Your Business"
                  value={brand.provider_description}
                  onChange={(e) => setBrand({...brand, provider_description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button onClick={saveBrand} className="bg-purple-600 hover:bg-purple-700 w-full">
                  Save Brand Profile
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Add New Service/Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Service/Product Title"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c.replace("_"," ").toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={form.price_type} onValueChange={(v) => setForm({...form, price_type: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Pricing Type" />
                    </SelectTrigger>
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
                    <Button
                      type="button"
                      size="sm"
                      onClick={suggestPricing}
                      disabled={generatingPricing || !form.title}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {generatingPricing ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          AI Suggest
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    type="number"
                    placeholder="Price (USD)"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: Number(e.target.value)})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 text-sm">Description</label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={generateDescription}
                      disabled={generatingDescription || !form.title}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingDescription ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3 mr-1" />
                          AI Generate
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    placeholder="Service description"
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-white font-medium block">Cover Image</label>
                  {form.image_url && (
                    <div className="relative inline-block">
                      <img src={form.image_url} alt="cover" className="w-32 h-32 object-cover rounded-lg border border-white/20" />
                      <button
                        onClick={() => setForm({...form, image_url: ""})}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="relative"
                      onClick={() => document.getElementById('cover-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadCoverImage(e.target.files?.[0])}
                      className="hidden"
                    />
                    <span className="text-gray-400 text-sm">or</span>
                    <Input
                      placeholder="Paste image URL"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          setForm({...form, image_url: e.currentTarget.value});
                          e.currentTarget.value = "";
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-white font-medium block">Portfolio Images (Optional)</label>
                  <div className="flex flex-wrap gap-3">
                    {form.portfolio_images?.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`portfolio-${idx}`} className="w-24 h-24 object-cover rounded-lg border border-white/20" />
                        <button
                          onClick={() => setForm((prev) => ({ ...prev, portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx) }))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('portfolio-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add Image
                    </Button>
                    <input
                      id="portfolio-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadPortfolioImage(e.target.files?.[0])}
                      className="hidden"
                    />
                  </div>
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
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isLoading}
                >
                  Publish Service
                </Button>
              </CardContent>
            </Card>

            <h2 className="text-2xl text-white font-bold mb-4">Your Active Services</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myServices.map(s => (
                <Card key={s.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <img src={s.image_url} alt={s.title} className="h-40 w-full object-cover rounded-lg mb-3" />
                    <div className="text-white font-semibold text-lg mb-1">{s.title}</div>
                    <div className="text-gray-400 text-sm capitalize mb-2">{s.category?.replace("_"," ")}</div>
                    <div className="text-white text-xl font-bold mb-3">${s.price?.toFixed(2)}</div>
                    <Button size="sm" variant="outline" onClick={() => startEdit(s)} className="w-full">
                      Manage Service
                    </Button>

                    {editingId === s.id && editData && (
                      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                        <Input
                          type="number"
                          value={editData.price}
                          onChange={(e) => setEditData({...editData, price: Number(e.target.value)})}
                          placeholder="Price"
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Select value={editData.price_type} onValueChange={(v) => setEditData({...editData, price_type: v})}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Price Type" />
                          </SelectTrigger>
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
                          {editData.image_url && (
                            <img src={editData.image_url} alt="cover" className="w-full h-32 object-cover rounded-lg" />
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById(`edit-cover-${s.id}`).click()}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Change Cover
                          </Button>
                          <input
                            id={`edit-cover-${s.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadEditCoverImage(e.target.files?.[0])}
                            className="hidden"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-white text-sm">Portfolio Images</label>
                          <div className="flex flex-wrap gap-2">
                            {editData.portfolio_images?.map((url, idx) => (
                              <div key={idx} className="relative">
                                <img src={url} alt={`p-${idx}`} className="w-16 h-16 object-cover rounded-lg" />
                                <button
                                  onClick={() => setEditData((prev) => ({ ...prev, portfolio_images: prev.portfolio_images.filter((_, i) => i !== idx) }))}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById(`edit-portfolio-${s.id}`).click()}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Add Images
                          </Button>
                          <input
                            id={`edit-portfolio-${s.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadEditPortfolioImage(e.target.files?.[0])}
                            className="hidden"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 flex-1"
                            onClick={() => updateMutation.mutate({ id: s.id, data: editData })}
                            disabled={updateMutation.isLoading}
                          >
                            Save Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingId(null); setEditData(null); }}
                            className="flex-1"
                          >
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

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-6">
            {/* Why Get Verified */}
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

            {/* Request New Verification */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Request Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Verification Type</label>
                  <Select
                    value={verificationForm.verification_type}
                    onValueChange={(v) => setVerificationForm({...verificationForm, verification_type: v})}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
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
                    <Input
                      placeholder="e.g., ABC-123456"
                      value={verificationForm.license_number}
                      onChange={(e) => setVerificationForm({...verificationForm, license_number: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Issuing Authority</label>
                    <Input
                      placeholder="e.g., State Board"
                      value={verificationForm.issuing_authority}
                      onChange={(e) => setVerificationForm({...verificationForm, issuing_authority: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Issue Date</label>
                    <Input
                      type="date"
                      value={verificationForm.issue_date}
                      onChange={(e) => setVerificationForm({...verificationForm, issue_date: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Expiration Date</label>
                    <Input
                      type="date"
                      value={verificationForm.expiration_date}
                      onChange={(e) => setVerificationForm({...verificationForm, expiration_date: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Upload Documents</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {verificationForm.document_urls?.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`doc-${idx}`} className="w-24 h-24 object-cover rounded-lg border border-white/20" />
                        <button
                          onClick={() => setVerificationForm((prev) => ({
                            ...prev,
                            document_urls: prev.document_urls.filter((_, i) => i !== idx)
                          }))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('verification-upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <input
                    id="verification-upload"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleDocumentUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>

                <Button
                  onClick={() => submitVerificationMutation.mutate(verificationForm)}
                  disabled={!verificationForm.license_number || submitVerificationMutation.isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Submit Verification Request
                </Button>
              </CardContent>
            </Card>

            {/* My Verifications */}
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
                  const StatusIcon = statusIcons[verification.status];
                  return (
                    <Card key={verification.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 ${
                              verification.status === 'verified' ? 'bg-green-500/20' : 'bg-blue-500/20'
                            } rounded-full flex items-center justify-center`}>
                              <StatusIcon className={`w-6 h-6 ${
                                verification.status === 'verified' ? 'text-green-400' : 'text-blue-400'
                              }`} />
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg capitalize mb-1">
                                {verification.verification_type.replace(/_/g, ' ')}
                              </h3>
                              {verification.license_number && (
                                <p className="text-gray-400 text-sm mb-1">
                                  License: {verification.license_number}
                                </p>
                              )}
                              {verification.issuing_authority && (
                                <p className="text-gray-400 text-sm">
                                  Issued by: {verification.issuing_authority}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={statusColors[verification.status]}>
                            {verification.status.toUpperCase()}
                          </Badge>
                        </div>

                        {verification.expiration_date && (
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                            <Calendar className="w-4 h-4" />
                            Expires: {new Date(verification.expiration_date).toLocaleDateString()}
                          </div>
                        )}

                        {verification.trust_score !== undefined && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-400 text-sm">Trust Impact</span>
                              <span className="text-green-400 font-bold">+{verification.trust_score} points</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${verification.trust_score}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {verification.status === 'rejected' && verification.rejection_reason && (
                          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">
                              <strong>Rejection Reason:</strong> {verification.rejection_reason}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Provider Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Business Name</label>
                    <Input
                      placeholder="Your Business Name"
                      value={currentUser?.provider_business_name || ""}
                      onChange={async (e) => {
                        const updated = await base44.auth.updateMe({ provider_business_name: e.target.value });
                        setCurrentUser(prev => ({...prev, ...updated}));
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Phone Number</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={currentUser?.provider_phone || ""}
                      onChange={async (e) => {
                        const updated = await base44.auth.updateMe({ provider_phone: e.target.value });
                        setCurrentUser(prev => ({...prev, ...updated}));
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-gray-400 text-sm mb-2 block">Business Address</label>
                    <Input
                      placeholder="123 Main St, City, State ZIP"
                      value={currentUser?.provider_business_address || ""}
                      onChange={async (e) => {
                        const updated = await base44.auth.updateMe({ provider_business_address: e.target.value });
                        setCurrentUser(prev => ({...prev, ...updated}));
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Website</label>
                    <Input
                      placeholder="https://yourbusiness.com"
                      value={currentUser?.provider_website || ""}
                      onChange={async (e) => {
                        const updated = await base44.auth.updateMe({ provider_website: e.target.value });
                        setCurrentUser(prev => ({...prev, ...updated}));
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Years of Experience</label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={currentUser?.provider_years_experience || ""}
                      onChange={async (e) => {
                        const updated = await base44.auth.updateMe({ provider_years_experience: Number(e.target.value) });
                        setCurrentUser(prev => ({...prev, ...updated}));
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Set Your Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {daysOfWeek.map(day => {
                  const existingAvail = availability.find(a => a.day_of_week === day);
                  const isAvailable = existingAvail?.is_available ?? true;
                  
                  return (
                    <div key={day} className="bg-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold capitalize">{day}</h3>
                        <Switch 
                          checked={isAvailable}
                          onCheckedChange={async (checked) => {
                            await saveAvailabilityMutation.mutateAsync({
                              day_of_week: day,
                              is_available: checked,
                              start_time: existingAvail?.start_time || "09:00",
                              end_time: existingAvail?.end_time || "17:00",
                              slot_duration_minutes: existingAvail?.slot_duration_minutes || 60
                            });
                          }}
                        />
                      </div>
                      
                      {isAvailable && (
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Start Time</label>
                            <Input
                              type="time"
                              value={existingAvail?.start_time || "09:00"}
                              onChange={(e) => {
                                const newAvail = {
                                  day_of_week: day,
                                  is_available: true,
                                  start_time: e.target.value,
                                  end_time: existingAvail?.end_time || "17:00",
                                  break_start: existingAvail?.break_start,
                                  break_end: existingAvail?.break_end,
                                  slot_duration_minutes: existingAvail?.slot_duration_minutes || 60
                                };
                                setAvailabilityForm(newAvail);
                              }}
                              onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">End Time</label>
                            <Input
                              type="time"
                              value={existingAvail?.end_time || "17:00"}
                              onChange={(e) => {
                                const newAvail = {
                                  day_of_week: day,
                                  is_available: true,
                                  start_time: existingAvail?.start_time || "09:00",
                                  end_time: e.target.value,
                                  break_start: existingAvail?.break_start,
                                  break_end: existingAvail?.break_end,
                                  slot_duration_minutes: existingAvail?.slot_duration_minutes || 60
                                };
                                setAvailabilityForm(newAvail);
                              }}
                              onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="text-gray-400 text-xs mb-1 block">Slot Duration (min)</label>
                            <Select 
                              value={String(existingAvail?.slot_duration_minutes || 60)}
                              onValueChange={(value) => {
                                saveAvailabilityMutation.mutate({
                                  day_of_week: day,
                                  is_available: true,
                                  start_time: existingAvail?.start_time || "09:00",
                                  end_time: existingAvail?.end_time || "17:00",
                                  break_start: existingAvail?.break_start,
                                  break_end: existingAvail?.break_end,
                                  slot_duration_minutes: Number(value)
                                });
                              }}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="90">1.5 hours</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="md:col-span-3">
                            <label className="text-gray-400 text-xs mb-1 block">Break Time (Optional)</label>
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                type="time"
                                placeholder="Break start"
                                value={existingAvail?.break_start || ""}
                                onChange={(e) => {
                                  const newAvail = {
                                    day_of_week: day,
                                    is_available: true,
                                    start_time: existingAvail?.start_time || "09:00",
                                    end_time: existingAvail?.end_time || "17:00",
                                    break_start: e.target.value,
                                    break_end: existingAvail?.break_end,
                                    slot_duration_minutes: existingAvail?.slot_duration_minutes || 60
                                  };
                                  setAvailabilityForm(newAvail);
                                }}
                                onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)}
                                className="bg-white/10 border-white/20 text-white"
                              />
                              <Input
                                type="time"
                                placeholder="Break end"
                                value={existingAvail?.break_end || ""}
                                onChange={(e) => {
                                  const newAvail = {
                                    day_of_week: day,
                                    is_available: true,
                                    start_time: existingAvail?.start_time || "09:00",
                                    end_time: existingAvail?.end_time || "17:00",
                                    break_start: existingAvail?.break_start,
                                    break_end: e.target.value,
                                    slot_duration_minutes: existingAvail?.slot_duration_minutes || 60
                                  };
                                  setAvailabilityForm(newAvail);
                                }}
                                onBlur={() => saveAvailabilityMutation.mutate(availabilityForm)}
                                className="bg-white/10 border-white/20 text-white"
                              />
                            </div>
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
      </div>
    </div>
  );
}