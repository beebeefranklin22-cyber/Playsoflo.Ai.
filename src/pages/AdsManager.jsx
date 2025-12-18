import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Target, DollarSign, Eye, MousePointer, BarChart3,
  Plus, Upload, Play, Pause, Trash2, CheckCircle, AlertCircle,
  Sparkles, Users, MapPin, Calendar, Loader2, X, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function AdsManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    campaign_name: "",
    objective: "brand_awareness",
    ad_format: "image",
    placements: ["feed", "stories"],
    media_urls: [],
    headline: "",
    description: "",
    call_to_action: "learn_more",
    destination_url: "",
    targeting: {
      age_min: 18,
      age_max: 65,
      genders: ["all"],
      locations: ["United States"],
      interests: [],
      languages: ["English"],
      device_types: ["mobile", "desktop"]
    },
    budget_type: "daily",
    budget_amount: 10,
    bid_strategy: "lowest_cost",
    schedule: {
      start_date: new Date().toISOString(),
      run_continuously: true
    }
  });

  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});

    const paymentStatus = searchParams.get('payment');
    const campaignId = searchParams.get('campaign_id');
    
    if (paymentStatus === 'success' && campaignId) {
      base44.asServiceRole.entities.AdCampaign.update(campaignId, { status: 'active' })
        .then(() => {
          toast.success('🎉 Campaign activated and running!');
          queryClient.invalidateQueries(['ad-campaigns']);
          window.history.replaceState({}, '', '/AdsManager');
        });
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment cancelled');
      window.history.replaceState({}, '', '/AdsManager');
    }
  }, [searchParams]);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['ad-campaigns', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.AdCampaign.filter({ advertiser_email: currentUser.email });
    },
    enabled: !!currentUser
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCampaignForm(prev => ({
        ...prev,
        media_urls: [...prev.media_urls, file_url]
      }));
      toast.success('Media uploaded!');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.campaign_name || !campaignForm.headline || campaignForm.media_urls.length === 0) {
      toast.error('Please fill in all required fields and upload media');
      return;
    }

    setCreatingCampaign(true);
    try {
      const { data } = await base44.functions.invoke('createAdCampaign', campaignForm);
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      toast.error('Failed to create campaign: ' + (error.message || 'Unknown error'));
      setCreatingCampaign(false);
    }
  };

  const pauseCampaignMutation = useMutation({
    mutationFn: async (campaignId) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      return await base44.entities.AdCampaign.update(campaignId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ad-campaigns']);
      toast.success('Campaign updated');
    }
  });

  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Target className="w-10 h-10 text-purple-400" />
              Ads Manager
            </h1>
            <p className="text-gray-400">Create and manage your advertising campaigns</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">${totalSpend.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Total Spend</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Eye className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{totalImpressions.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Impressions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <MousePointer className="w-8 h-8 text-pink-400" />
              </div>
              <p className="text-3xl font-bold text-white">{totalClicks.toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Clicks</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{avgCTR}%</p>
              <p className="text-gray-400 text-sm">Avg CTR</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Campaigns</h2>
          
          {campaigns.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No campaigns yet</h3>
                <p className="text-gray-400 mb-6">Create your first ad campaign to reach more customers</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {campaign.media_urls?.[0] && (
                      <img
                        src={campaign.media_urls[0]}
                        alt={campaign.headline}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-white">{campaign.campaign_name}</h3>
                        <Badge className={
                          campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                          campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }>
                          {campaign.status}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">{campaign.headline}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Impressions</p>
                          <p className="text-white font-bold">{(campaign.impressions || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Clicks</p>
                          <p className="text-white font-bold">{campaign.clicks || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">CTR</p>
                          <p className="text-green-400 font-bold">{(campaign.ctr || 0).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Spend</p>
                          <p className="text-white font-bold">${(campaign.spend || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Budget</p>
                          <p className="text-purple-400 font-bold">
                            ${campaign.budget_amount} {campaign.budget_type === 'daily' ? '/day' : 'total'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {campaign.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseCampaignMutation.mutate(campaign.id)}
                            className="bg-white/5 border-white/20 hover:bg-white/10"
                          >
                            {campaign.status === 'active' ? (
                              <>
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/5 border-white/20 hover:bg-white/10"
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          View Analytics
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Campaign Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => !creatingCampaign && setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                    Create Ad Campaign
                  </h2>
                  <button onClick={() => setShowCreateModal(false)} disabled={creatingCampaign}>
                    <X className="w-6 h-6 text-gray-400 hover:text-white" />
                  </button>
                </div>

                <Tabs defaultValue="basic" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3 bg-white/10">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="targeting">Targeting</TabsTrigger>
                    <TabsTrigger value="budget">Budget & Schedule</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <Input
                      placeholder="Campaign Name"
                      value={campaignForm.campaign_name}
                      onChange={(e) => setCampaignForm({...campaignForm, campaign_name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Ad Placements</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campaignForm.placements?.includes('feed')}
                            onChange={(e) => {
                              setCampaignForm({
                                ...campaignForm,
                                placements: e.target.checked 
                                  ? [...(campaignForm.placements || []), 'feed'].filter((v, i, a) => a.indexOf(v) === i)
                                  : (campaignForm.placements || []).filter(p => p !== 'feed')
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-white">News Feed</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campaignForm.placements?.includes('stories')}
                            onChange={(e) => {
                              setCampaignForm({
                                ...campaignForm,
                                placements: e.target.checked 
                                  ? [...(campaignForm.placements || []), 'stories'].filter((v, i, a) => a.indexOf(v) === i)
                                  : (campaignForm.placements || []).filter(p => p !== 'stories')
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-white">Stories</span>
                        </label>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">Select where your ad will appear</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Select value={campaignForm.objective} onValueChange={(v) => setCampaignForm({...campaignForm, objective: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                          <SelectItem value="traffic">Traffic</SelectItem>
                          <SelectItem value="engagement">Engagement</SelectItem>
                          <SelectItem value="conversions">Conversions</SelectItem>
                          <SelectItem value="lead_generation">Lead Generation</SelectItem>
                          <SelectItem value="messages">Messages</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={campaignForm.ad_format} onValueChange={(v) => setCampaignForm({...campaignForm, ad_format: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Single Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="carousel">Carousel</SelectItem>
                          <SelectItem value="story">Story Ad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      placeholder="Headline (required)"
                      value={campaignForm.headline}
                      onChange={(e) => setCampaignForm({...campaignForm, headline: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />

                    <Textarea
                      placeholder="Description"
                      value={campaignForm.description}
                      onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                      rows={3}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <Select value={campaignForm.call_to_action} onValueChange={(v) => setCampaignForm({...campaignForm, call_to_action: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="learn_more">Learn More</SelectItem>
                          <SelectItem value="shop_now">Shop Now</SelectItem>
                          <SelectItem value="sign_up">Sign Up</SelectItem>
                          <SelectItem value="download">Download</SelectItem>
                          <SelectItem value="book_now">Book Now</SelectItem>
                          <SelectItem value="contact_us">Contact Us</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Destination URL"
                        value={campaignForm.destination_url}
                        onChange={(e) => setCampaignForm({...campaignForm, destination_url: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Upload Ad Media</label>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        {campaignForm.media_urls.map((url, idx) => (
                          <div key={idx} className="relative">
                            <img src={url} className="w-full h-32 object-cover rounded-lg" />
                            <button
                              onClick={() => setCampaignForm({
                                ...campaignForm,
                                media_urls: campaignForm.media_urls.filter((_, i) => i !== idx)
                              })}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <input
                        id="media-upload"
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('media-upload').click()}
                        className="w-full bg-purple-600 hover:bg-purple-700 border-0"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Media
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="targeting" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Min Age</label>
                        <Input
                          type="number"
                          value={campaignForm.targeting.age_min}
                          onChange={(e) => setCampaignForm({
                            ...campaignForm,
                            targeting: {...campaignForm.targeting, age_min: Number(e.target.value)}
                          })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Max Age</label>
                        <Input
                          type="number"
                          value={campaignForm.targeting.age_max}
                          onChange={(e) => setCampaignForm({
                            ...campaignForm,
                            targeting: {...campaignForm.targeting, age_max: Number(e.target.value)}
                          })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Interests</label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Add interest..."
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && interestInput.trim()) {
                              setCampaignForm({
                                ...campaignForm,
                                targeting: {
                                  ...campaignForm.targeting,
                                  interests: [...(campaignForm.targeting.interests || []), interestInput.trim()]
                                }
                              });
                              setInterestInput("");
                            }
                          }}
                          className="bg-white/10 border-white/20 text-white flex-1"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {campaignForm.targeting.interests?.map((interest, idx) => (
                          <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                            {interest}
                            <button
                              onClick={() => setCampaignForm({
                                ...campaignForm,
                                targeting: {
                                  ...campaignForm.targeting,
                                  interests: campaignForm.targeting.interests.filter((_, i) => i !== idx)
                                }
                              })}
                              className="ml-2"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-semibold">AI Audience Optimization</span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Our AI will automatically optimize your targeting based on performance data
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="budget" className="space-y-4">
                    <Select value={campaignForm.budget_type} onValueChange={(v) => setCampaignForm({...campaignForm, budget_type: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily Budget</SelectItem>
                        <SelectItem value="lifetime">Lifetime Budget</SelectItem>
                      </SelectContent>
                    </Select>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        {campaignForm.budget_type === 'daily' ? 'Daily' : 'Lifetime'} Budget (USD)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="5"
                        value={campaignForm.budget_amount}
                        onChange={(e) => setCampaignForm({...campaignForm, budget_amount: Number(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-gray-500 text-xs mt-1">Minimum: $5/day</p>
                    </div>

                    <Select value={campaignForm.bid_strategy} onValueChange={(v) => setCampaignForm({...campaignForm, bid_strategy: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lowest_cost">Lowest Cost (Recommended)</SelectItem>
                        <SelectItem value="cost_cap">Cost Cap</SelectItem>
                        <SelectItem value="bid_cap">Bid Cap</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <span className="text-white font-semibold">Pricing vs Instagram</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>Instagram CPM:</span>
                          <span>$5-10</span>
                        </div>
                        <div className="flex justify-between text-green-400 font-bold">
                          <span>PlaySoFlo CPM:</span>
                          <span>$3.50-7 (30% cheaper!)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <p className="text-white font-semibold mb-2">💰 Initial Charge</p>
                      <p className="text-gray-300 text-sm">
                        {campaignForm.budget_type === 'daily' 
                          ? `We'll charge $${(campaignForm.budget_amount * 7).toFixed(2)} (7 days upfront) and auto-reload as needed`
                          : `We'll charge the full budget of $${campaignForm.budget_amount.toFixed(2)}`
                        }
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creatingCampaign}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={creatingCampaign || !campaignForm.campaign_name || !campaignForm.headline || campaignForm.media_urls.length === 0}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {creatingCampaign ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create & Pay
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}