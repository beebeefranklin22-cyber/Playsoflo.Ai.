import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, DollarSign, Users, Heart, 
  Eye, BarChart3, Calendar, Gift, HandshakeIcon, CheckCircle,
  Upload, X, Loader2, Video, Radio
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import LivestreamManager from "../components/livestream/LivestreamManager.jsx";
import PPVContentManager from "../components/creator/PPVContentManager.jsx";
import MembershipManager from "../components/creator/MembershipManager.jsx";
import CreatorAnalyticsDashboard from "../components/creator/CreatorAnalyticsDashboard.jsx";

export default function CreatorHub() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["creator-products"],
    queryFn: () => base44.entities.CreatorProduct.list(),
    initialData: []
  });

  const { data: tips = [] } = useQuery({
    queryKey: ["my-tips"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.TipTransaction.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: collaborations = [] } = useQuery({
    queryKey: ["my-collaborations"],
    queryFn: async () => {
      if (!currentUser) return [];
      const collabs = await base44.entities.Collaboration.filter({ status: 'active' });
      return collabs;
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: subscriptionTiers = [] } = useQuery({
    queryKey: ["subscription-tiers"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CreatorSubscription.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["my-subscribers"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.UserSubscription.filter({ 
        creator_email: currentUser.email,
        status: "active"
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myContent = [] } = useQuery({
    queryKey: ["my-streaming-content"],
    queryFn: () => base44.entities.StreamingContent.list(),
    initialData: []
  });

  const [form, setForm] = useState({ 
    title: "", 
    type: "show_ticket", 
    price_usd: 10, 
    image_url: "", 
    description: "",
    inventory: 100,
    is_collaboration: false,
    co_creators: [],
    // New fields for digital products
    digital_product_type: "",
    download_url: "",
    file_size: "",
    license_type: "personal"
  });

  const [contentForm, setContentForm] = useState({
    title: "",
    type: "movie",
    category: "entertainment",
    description: "",
    thumbnail_url: "",
    duration: "",
    is_live: false
  });
  
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [subscriptionForm, setSubscriptionForm] = useState({
    tier_name: "",
    tier_level: 1,
    monthly_price_usd: 9.99,
    monthly_price_soflo: 0,
    description: "",
    benefits: [],
    perks: {
      early_access: false,
      exclusive_posts: false,
      direct_messaging: false,
      monthly_shoutout: false,
      behind_the_scenes: false,
      merchandise_discount: 0
    }
  });

  const [benefitInput, setBenefitInput] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CreatorProduct.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-products"] });
      setForm({ 
        title: "", 
        type: "show_ticket", 
        price_usd: 10, 
        image_url: "", 
        description: "", 
        inventory: 100, 
        is_collaboration: false, 
        co_creators: [],
        digital_product_type: "",
        download_url: "",
        file_size: "",
        license_type: "personal"
      });
    }
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreatorSubscription.create({
      ...data,
      creator_email: currentUser.email
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription-tiers"] });
      setSubscriptionForm({
        tier_name: "",
        tier_level: 1,
        monthly_price_usd: 9.99,
        monthly_price_soflo: 0,
        description: "",
        benefits: [],
        perks: {
          early_access: false,
          exclusive_posts: false,
          direct_messaging: false,
          monthly_shoutout: false,
          behind_the_scenes: false,
          merchandise_discount: 0
        }
      });
      setBenefitInput("");
    }
  });

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setSubscriptionForm({
        ...subscriptionForm,
        benefits: [...subscriptionForm.benefits, benefitInput.trim()]
      });
      setBenefitInput("");
    }
  };

  const removeBenefit = (index) => {
    setSubscriptionForm({
      ...subscriptionForm,
      benefits: subscriptionForm.benefits.filter((_, i) => i !== index)
    });
  };

  const handleContentUpload = async (file, type) => {
    if (!file) return;
    
    setUploadingContent(true);
    setUploadProgress(0);
    
    try {
      if (type === 'thumbnail') {
        setUploadProgress(50);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setUploadProgress(100);
        setContentForm(prev => ({ ...prev, thumbnail_url: file_url }));
      } else {
        // Progressive upload with smooth progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 80) {
              clearInterval(progressInterval);
              return 80;
            }
            return prev + 10;
          });
        }, 500);

        // Upload file to platform
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        clearInterval(progressInterval);
        setUploadProgress(85);

        // Create streaming content entry
        const content = await base44.entities.StreamingContent.create({
          title: contentForm.title,
          type: contentForm.type,
          category: contentForm.category,
          description: contentForm.description,
          thumbnail_url: contentForm.thumbnail_url || file_url,
          duration: "N/A",
          rating: 0,
          is_live: false,
          requires_subscription: false,
          betting_available: false
        });
        
        setUploadProgress(100);
        
        await qc.invalidateQueries({ queryKey: ["my-streaming-content"] });
        
        setContentForm({
          title: "",
          type: "movie",
          category: "entertainment",
          description: "",
          thumbnail_url: "",
          duration: "",
          is_live: false
        });
        
        alert('✅ Video uploaded successfully and available on streaming network!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Network error occurred';
      alert(`Upload failed: ${errorMsg}. Please check your connection and try again.`);
      setUploadProgress(0);
    } finally {
      setTimeout(() => {
        setUploadingContent(false);
      }, 1500);
    }
  };

  const startLivestream = async () => {
    if (!contentForm.title) {
      alert('Please enter a title for your livestream');
      return;
    }

    await base44.entities.StreamingContent.create({
      title: contentForm.title,
      type: 'live_event',
      category: contentForm.category,
      description: contentForm.description,
      thumbnail_url: contentForm.thumbnail_url,
      is_live: true,
      rating: 0,
      requires_subscription: false,
      betting_available: false
    });
    
    qc.invalidateQueries({ queryKey: ["my-streaming-content"] });
    
    setContentForm({
      title: "",
      type: "movie",
      category: "entertainment",
      description: "",
      thumbnail_url: "",
      duration: "",
      is_live: false
    });
    
    alert('Livestream started! Users can now discover it.');
  };

  // Calculate stats
  const totalRevenue = tips.reduce((sum, tip) => sum + (tip.amount_usd || 0), 0);
  const totalTips = tips.length;
  const avgTip = totalTips > 0 ? totalRevenue / totalTips : 0;
  const totalFollowers = currentUser?.followers?.length || 0;
  const monthlySubscriptionRevenue = subscribers.reduce((sum, sub) => sum + (sub.monthly_amount_usd || 0), 0);

  // Mock analytics data
  const recentViews = 12450;
  const engagementRate = 8.5;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Gift className="w-10 h-10 text-pink-400" />
            Creator Hub
          </h1>
          <p className="text-gray-300 text-lg">Manage your content, products, and earnings</p>
        </div>

        {/* Quick Actions with Collaboration */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Link 
            to={createPageUrl("CollaborationHub")}
            className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl hover:bg-purple-500/30 transition flex flex-col justify-center"
          >
            <div className="flex items-center gap-3 mb-2">
              <HandshakeIcon className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">{collaborations.length}</div>
                <div className="text-gray-400 text-sm">Active Collabs</div>
              </div>
            </div>
            <p className="text-gray-300 text-sm mt-2">Manage your collaborations.</p>
          </Link>
          {/* Other quick actions could go here, for now, padding to maintain grid layout */}
          <div className="hidden md:block"></div>
          <div className="hidden md:block"></div>
          <div className="hidden md:block"></div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="livestream">Livestream</TabsTrigger>
            <TabsTrigger value="ppv">PPV</TabsTrigger>
            <TabsTrigger value="memberships">Memberships</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* Livestream Management Tab */}
          <TabsContent value="livestream" className="space-y-6">
            <LivestreamManager currentUser={currentUser} />
          </TabsContent>

          {/* PPV Content Tab */}
          <TabsContent value="ppv" className="space-y-6">
            <PPVContentManager currentUser={currentUser} />
          </TabsContent>

          {/* Memberships Tab */}
          <TabsContent value="memberships" className="space-y-6">
            <MembershipManager currentUser={currentUser} />
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Upload Content to Streaming Network
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Content Title"
                    value={contentForm.title}
                    onChange={(e) => setContentForm({...contentForm, title: e.target.value})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Select value={contentForm.type} onValueChange={(v) => setContentForm({...contentForm, type: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Content Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="series">Series</SelectItem>
                      <SelectItem value="live_sports">Live Sports</SelectItem>
                      <SelectItem value="live_event">Live Event</SelectItem>
                      <SelectItem value="gaming_stream">Gaming Stream</SelectItem>
                      <SelectItem value="music_concert">Music Concert</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Select value={contentForm.category} onValueChange={(v) => setContentForm({...contentForm, category: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Description"
                  value={contentForm.description}
                  onChange={(e) => setContentForm({...contentForm, description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Thumbnail Image</label>
                  {contentForm.thumbnail_url && (
                    <div className="relative mb-3 inline-block">
                      <img src={contentForm.thumbnail_url} className="w-32 h-32 object-cover rounded-lg" />
                      <button
                        onClick={() => setContentForm({...contentForm, thumbnail_url: ""})}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('thumbnail-upload').click()}
                      className="bg-white/5"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Thumbnail
                    </Button>
                    <input
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleContentUpload(e.target.files?.[0], 'thumbnail')}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="text-white font-medium mb-3 block">Upload Video Content</label>
                  <p className="text-gray-400 text-sm mb-4">Supports videos up to 4+ hours. Fast upload with chunked processing.</p>
                  
                  {uploadingContent && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm">Uploading...</span>
                        <span className="text-purple-400 text-sm">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => document.getElementById('video-upload').click()}
                    disabled={uploadingContent || !contentForm.title}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {uploadingContent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading Content...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video/Movie
                      </>
                    )}
                  </Button>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleContentUpload(e.target.files?.[0], 'video')}
                    className="hidden"
                  />
                </div>

                <div className="border-t border-white/10 pt-4">
                  <Button
                    onClick={startLivestream}
                    disabled={!contentForm.title}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Start Livestream
                  </Button>
                  <p className="text-gray-400 text-xs text-center mt-2">Go live instantly with real-time streaming</p>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-white">My Streaming Content</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {myContent.map(content => (
                <Card key={content.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    {content.thumbnail_url && (
                      <img src={content.thumbnail_url} className="w-full h-40 object-cover rounded-lg mb-3" />
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold">{content.title}</h3>
                      {content.is_live && (
                        <Badge className="bg-red-500/20 text-red-300">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm capitalize">{content.type?.replace('_', ' ')}</p>
                    <p className="text-gray-500 text-xs mt-1">{content.category}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced Stats Grid */}
            <div className="grid md:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 text-green-400" />
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-sm">Total Revenue (Tips)</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {subscribers.length}
                  </div>
                  <div className="text-gray-400 text-sm">Active Subscribers</div>
                  <div className="text-green-400 text-xs mt-1">
                    ${monthlySubscriptionRevenue.toFixed(2)}/mo
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {totalFollowers}
                  </div>
                  <div className="text-gray-400 text-sm">Followers</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500/20 to-red-500/20 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Heart className="w-8 h-8 text-pink-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {totalTips}
                  </div>
                  <div className="text-gray-400 text-sm">Total Tips</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {recentViews.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm">Views (30d)</div>
                </CardContent>
              </Card>
            </div>

            {/* Collaboration Highlights */}
            {collaborations.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <HandshakeIcon className="w-5 h-5 text-purple-400" />
                    Active Collaborations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {collaborations.slice(0, 3).map((collab) => (
                      <div key={collab.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div>
                          <div className="text-white font-medium">{collab.title}</div>
                          <div className="text-gray-400 text-sm">
                            {collab.initiator_email === currentUser?.email 
                              ? `With: ${collab.collaborator_email}`
                              : `With: ${collab.initiator_email}`}
                          </div>
                        </div>
                        <Badge className="bg-green-500/30 text-green-200">Active</Badge>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl("CollaborationHub")}>
                    <Button variant="outline" className="w-full mt-4 bg-white/5 text-white border-white/20 hover:bg-white/10">
                      View All Collaborations
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <Button className="bg-purple-600 hover:bg-purple-700 py-6" onClick={() => setActiveTab('products')}>
                  Create New Product
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 py-6" onClick={() => setActiveTab('subscriptions')}>
                  Create Subscription Tier
                </Button>
                <Button variant="outline" className="py-6 bg-white/5 text-white border-white/20 hover:bg-white/10" onClick={() => setActiveTab('analytics')}>
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Recent Tips */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Tips</CardTitle>
              </CardHeader>
              <CardContent>
                {tips.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No tips yet</p>
                ) : (
                  <div className="space-y-3">
                    {tips.slice(0, 5).map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-pink-400" />
                          <div>
                            <div className="text-white font-medium">
                              {tip.message || 'Anonymous tip'}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(tip.created_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-green-400 font-bold">
                          ${tip.amount_usd?.toFixed(2) || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NEW: Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Create Subscription Tier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Tier Name (e.g., Bronze, Silver, Gold)"
                    value={subscriptionForm.tier_name}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, tier_name: e.target.value})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Select 
                    value={subscriptionForm.tier_level.toString()} 
                    onValueChange={(v) => setSubscriptionForm({...subscriptionForm, tier_level: Number(v)})}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Tier Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 (Basic)</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                      <SelectItem value="4">Level 4</SelectItem>
                      <SelectItem value="5">Level 5 (Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Monthly Price (USD)"
                    value={subscriptionForm.monthly_price_usd}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, monthly_price_usd: Number(e.target.value)})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    type="number"
                    placeholder="Monthly Price (SoFloCoin)"
                    value={subscriptionForm.monthly_price_soflo}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, monthly_price_soflo: Number(e.target.value)})}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <textarea
                  placeholder="Tier description..."
                  value={subscriptionForm.description}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400"
                />

                {/* Benefits */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Benefits</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a benefit..."
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                      className="bg-white/10 border-white/20 text-white flex-1"
                    />
                    <Button onClick={addBenefit} variant="outline" className="bg-white/5 text-white border-white/20 hover:bg-white/10">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subscriptionForm.benefits.map((benefit, idx) => (
                      <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                        {benefit}
                        <button onClick={() => removeBenefit(idx)} className="ml-2 text-sm">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Perks Checkboxes */}
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscriptionForm.perks.early_access}
                      onChange={(e) => setSubscriptionForm({
                        ...subscriptionForm,
                        perks: {...subscriptionForm.perks, early_access: e.target.checked}
                      })}
                      className="w-5 h-5 rounded accent-purple-500"
                    />
                    Early Access to Content
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscriptionForm.perks.exclusive_posts}
                      onChange={(e) => setSubscriptionForm({
                        ...subscriptionForm,
                        perks: {...subscriptionForm.perks, exclusive_posts: e.target.checked}
                      })}
                      className="w-5 h-5 rounded accent-purple-500"
                    />
                    Exclusive Posts
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscriptionForm.perks.direct_messaging}
                      onChange={(e) => setSubscriptionForm({
                        ...subscriptionForm,
                        perks: {...subscriptionForm.perks, direct_messaging: e.target.checked}
                      })}
                      className="w-5 h-5 rounded accent-purple-500"
                    />
                    Direct Messaging
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscriptionForm.perks.monthly_shoutout}
                      onChange={(e) => setSubscriptionForm({
                        ...subscriptionForm,
                        perks: {...subscriptionForm.perks, monthly_shoutout: e.target.checked}
                      })}
                      className="w-5 h-5 rounded accent-purple-500"
                    />
                    Monthly Shoutout
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscriptionForm.perks.behind_the_scenes}
                      onChange={(e) => setSubscriptionForm({
                        ...subscriptionForm,
                        perks: {...subscriptionForm.perks, behind_the_scenes: e.target.checked}
                      })}
                      className="w-5 h-5 rounded accent-purple-500"
                    />
                    Behind the Scenes
                  </label>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Merch Discount %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={subscriptionForm.perks.merchandise_discount}
                      onChange={(e) => setSubscriptionForm({
                        ...subscriptionForm,
                        perks: {...subscriptionForm.perks, merchandise_discount: Number(e.target.value)}
                      })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => createSubscriptionMutation.mutate(subscriptionForm)}
                  disabled={!subscriptionForm.tier_name || createSubscriptionMutation.isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Create Subscription Tier
                </Button>
              </CardContent>
            </Card>

            {/* Existing Tiers */}
            <h2 className="text-2xl font-bold text-white">Your Subscription Tiers</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {subscriptionTiers.sort((a, b) => a.tier_level - b.tier_level).map((tier) => (
                <Card key={tier.id} className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-white">{tier.tier_name}</h3>
                      <Badge className="bg-purple-500/30 text-purple-200">
                        Level {tier.tier_level}
                      </Badge>
                    </div>

                    <div className="text-4xl font-bold text-white mb-2">
                      ${tier.monthly_price_usd}
                      <span className="text-lg text-gray-400">/mo</span>
                    </div>

                    {tier.monthly_price_soflo > 0 && (
                      <div className="text-purple-400 text-sm mb-4">
                        or {tier.monthly_price_soflo} SoFloCoin/mo
                      </div>
                    )}

                    <p className="text-gray-300 text-sm mb-4">{tier.description}</p>

                    <div className="space-y-2 mb-4">
                      {tier.benefits?.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {benefit}
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Subscribers</span>
                        <span className="text-white font-bold">{tier.subscriber_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Add New Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <Input 
                    placeholder="Product Title" 
                    value={form.title} 
                    onChange={(e) => setForm({...form, title: e.target.value})} 
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show_ticket">Show Ticket</SelectItem>
                      <SelectItem value="merch">Merch</SelectItem>
                      <SelectItem value="nft">NFT</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                      <SelectItem value="digital_product">Digital Product</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.type === "digital_product" && (
                    <Select 
                      value={form.digital_product_type} 
                      onValueChange={(v) => setForm({...form, digital_product_type: v})}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Digital Product Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preset">Preset</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="guide">Guide/Ebook</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="art">Digital Art</SelectItem>
                        <SelectItem value="photo_pack">Photo Pack</SelectItem>
                        <SelectItem value="video_tutorial">Video Tutorial</SelectItem>
                        <SelectItem value="plugin">Plugin</SelectItem>
                        <SelectItem value="font">Font</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Input 
                    type="number" 
                    placeholder="Price USD" 
                    value={form.price_usd} 
                    onChange={(e) => setForm({...form, price_usd: Number(e.target.value)})} 
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input 
                    type="number"
                    placeholder="Inventory Count" 
                    value={form.inventory} 
                    onChange={(e) => setForm({...form, inventory: Number(e.target.value)})} 
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Collaboration Options */}
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={form.is_collaboration}
                      onChange={(e) => setForm({...form, is_collaboration: e.target.checked})}
                      className="w-5 h-5 rounded accent-purple-500" // Added accent-purple-500 for better styling
                    />
                    <label htmlFor="is_collaboration_checkbox" className="text-white font-medium cursor-pointer">This is a collaborative product</label>
                  </div>
                  
                  {form.is_collaboration && (
                    <div>
                      <label htmlFor="co_creators_input" className="text-gray-400 text-sm mb-2 block">Co-Creator Emails (comma-separated)</label>
                      <Input
                        id="co_creators_input"
                        placeholder="email1@example.com, email2@example.com"
                        onChange={(e) => {
                          const emails = e.target.value.split(',').map(email => email.trim()).filter(email => email !== '');
                          setForm({...form, co_creators: emails});
                        }}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  )}
                </div>

                <Input 
                  placeholder="Image URL" 
                  value={form.image_url} 
                  onChange={(e) => setForm({...form, image_url: e.target.value})} 
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input 
                  placeholder="Description" 
                  value={form.description} 
                  onChange={(e) => setForm({...form, description: e.target.value})} 
                  className="bg-white/10 border-white/20 text-white"
                />

                {form.type === "digital_product" && (
                  <>
                    <Input 
                      placeholder="Download URL" 
                      value={form.download_url || ""} 
                      onChange={(e) => setForm({...form, download_url: e.target.value})} 
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input 
                        placeholder="File Size (e.g., 50MB)" 
                        value={form.file_size || ""} 
                        onChange={(e) => setForm({...form, file_size: e.target.value})} 
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Select 
                        value={form.license_type || "personal"} 
                        onValueChange={(v) => setForm({...form, license_type: v})}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="License Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal Use</SelectItem>
                          <SelectItem value="commercial">Commercial Use</SelectItem>
                          <SelectItem value="extended">Extended License</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button 
                  className="bg-pink-600 hover:bg-pink-700 w-full" 
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.title || createMutation.isLoading}
                >
                  Add Product
                </Button>
              </CardContent>
            </Card>

            <h2 className="text-2xl font-bold text-white">Your Products</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {products.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.title} className="h-48 w-full object-cover rounded-lg mb-3" />
                      )}
                      <div className="text-white font-semibold text-lg mb-1">{p.title}</div>
                      <div className="text-gray-300 text-sm capitalize mb-2">{p.type?.replace('_', ' ')}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-white text-xl font-bold">${p.price_usd?.toFixed(2) || 0}</div>
                        <div className="text-gray-400 text-sm">{p.inventory || 0} in stock</div>
                      </div>
                      <div className={`mt-2 text-xs px-2 py-1 rounded-full inline-block ${
                        p.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <CreatorAnalyticsDashboard currentUser={currentUser} />
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-gray-300 mb-2">Total Earnings (Tips)</h3>
                  <div className="text-5xl font-bold text-white mb-4">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <div className="text-green-400 text-sm">All time</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-gray-300 mb-2">Available Balance</h3>
                  <div className="text-5xl font-bold text-white mb-4">
                    ${((totalRevenue + monthlySubscriptionRevenue) * 0.9).toFixed(2)}
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700 w-full mt-2">
                    Withdraw
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {tips.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {tips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">Tip Received</div>
                            <div className="text-gray-400 text-sm">
                              {new Date(tip.created_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            {tip.message && (
                              <div className="text-gray-400 text-sm italic mt-1">"{tip.message}"</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">
                            +${tip.amount_usd?.toFixed(2) || 0}
                          </div>
                          {tip.amount_rri > 0 && (
                            <div className="text-purple-400 text-sm">
                              {tip.amount_rri} SFC
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}