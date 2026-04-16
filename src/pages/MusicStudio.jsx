import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Music, Upload, Play, DollarSign, TrendingUp, Users, Download,
  ChevronLeft, Sparkles, Briefcase, FileText, BarChart3, Award,
  CheckCircle, Plus, Share2, Mic2, Disc3, FileSignature, AlertCircle, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdvancedAnalytics from "../components/music/AdvancedAnalytics";
import FanPoolManager from "../components/music/FanPoolManager";
import DistributionManager from "../components/music/DistributionManager";
import AIMasteringStudio from "../components/music/AIMasteringStudio";
import RoyaltySplitManager from "../components/music/RoyaltySplitManager";
import SyncLicensingManager from "../components/music/SyncLicensingManager";
import VideoEditorPro from "../components/creator/VideoEditorPro";

export default function MusicStudio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("tracks");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealForm, setDealForm] = useState({
    deal_type: "record_label",
    artist_name: "",
    instagram_handle: "",
    youtube_channel: "",
    monthly_listeners: 0,
    career_goals: "",
    additional_info: ""
  });
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedTrackForSplit, setSelectedTrackForSplit] = useState(null);

  const [trackForm, setTrackForm] = useState({
    title: "",
    genre: "hip_hop",
    pricing_model: "free",
    price_usd: 0,
    price_soflo: 0,
    audio_file_url: "",
    cover_art_url: "",
    explicit: false,
    allow_downloads: false
  });

  const [poolForm, setPoolForm] = useState({
    pool_type: "concert_show",
    title: "",
    description: "",
    goal_amount: 0,
    deadline: "",
    event_date: "",
    location: "",
    tier_rewards: []
  });

  const [contractForm, setContractForm] = useState({
    contract_type: "collaboration_agreement",
    parties: [],
    description: ""
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: myTracks = [] } = useQuery({
    queryKey: ['my-music-tracks', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MusicTrack.filter({ artist_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myPools = [] } = useQuery({
    queryKey: ['my-fan-pools', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.FanPool.filter({ artist_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myContracts = [] } = useQuery({
    queryKey: ['my-contracts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MusicContract.filter({});
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myDealApplications = [] } = useQuery({
    queryKey: ['my-deal-applications', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MusicDealApplication.filter({ artist_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const uploadTrackMutation = useMutation({
    mutationFn: async (trackData) => {
      if (!currentUser) throw new Error('User not authenticated');
      return await base44.entities.MusicTrack.create({
        ...trackData,
        artist_email: currentUser.email,
        artist: currentUser.full_name || currentUser.email,
        status: "published"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-music-tracks']);
      setShowUploadModal(false);
      alert('🎵 Track published successfully!');
      setTrackForm({
        title: "",
        genre: "hip_hop",
        pricing_model: "free",
        price_usd: 0,
        price_soflo: 0,
        audio_file_url: "",
        cover_art_url: "",
        explicit: false,
        allow_downloads: false
      });
    }
  });

  const createPoolMutation = useMutation({
    mutationFn: async (poolData) => {
      if (!currentUser) throw new Error('User not authenticated');
      return await base44.entities.FanPool.create({
        ...poolData,
        artist_email: currentUser.email,
        artist_name: currentUser.full_name || currentUser.email,
        raised_amount: 0,
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-fan-pools']);
      setShowPoolModal(false);
      alert('✅ Fan pool created! Fans can now contribute.');
      setPoolForm({
        pool_type: "concert_show",
        title: "",
        description: "",
        goal_amount: 0,
        deadline: "",
        event_date: "",
        location: "",
        tier_rewards: []
      });
    }
  });

  const applyForDealMutation = useMutation({
    mutationFn: async (dealData) => {
      if (!currentUser) throw new Error('User not authenticated');
      const application = await base44.entities.MusicDealApplication.create({
        ...dealData,
        artist_email: currentUser.email,
        artist_name: currentUser.full_name || currentUser.email,
        status: "pending_review"
      });

      // Notify all admins
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          type: "system_alert",
          title: "🎵 New Music Deal Application",
          message: `${currentUser.full_name} applied for a ${dealData.deal_type.replace('_', ' ')} deal. ${dealData.monthly_listeners} monthly listeners.`,
          reference_type: "user",
          reference_id: application.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
      }

      return application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-deal-applications']);
      setShowDealModal(false);
      alert('✅ Deal application submitted! Admins will review it shortly.');
      setDealForm({
        deal_type: "record_label",
        artist_name: "",
        instagram_handle: "",
        youtube_channel: "",
        monthly_listeners: 0,
        career_goals: "",
        additional_info: ""
      });
    }
  });

  const generateContractMutation = useMutation({
    mutationFn: async (contractData) => {
      if (!currentUser) throw new Error('User not authenticated');
      // AI generates smart contract
      const prompt = `You are an expert music industry attorney. Generate a professional ${contractData.contract_type.replace('_', ' ')} contract.

PARTIES:
${contractData.parties.map(p => `- ${p.role}: ${p.name} (${p.email})`).join('\n')}

CONTRACT PURPOSE:
${contractData.description}

Generate a comprehensive legal contract including:
1. Parties and definitions
2. Term and territory
3. Financial terms and royalty splits
4. Rights and obligations
5. Intellectual property
6. Termination clauses
7. Dispute resolution
8. Signatures section

Make it legally sound, fair, and industry-standard.`;

      const aiContract = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            contract_text: { type: "string" },
            ai_generated_terms: {
              type: "object",
              properties: {
                payment_terms: { type: "string" },
                royalty_split: { type: "object" },
                duration: { type: "string" },
                territory: { type: "string" }
              }
            },
            key_points: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const contract = await base44.entities.MusicContract.create({
        contract_type: contractData.contract_type,
        parties: contractData.parties,
        contract_text: aiContract.contract_text,
        ai_generated_terms: aiContract.ai_generated_terms,
        status: "pending_admin_review"
      });

      // Notify all admins
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          type: "system_alert",
          title: "🤖 New AI Contract Needs Review",
          message: `${currentUser.full_name} generated a ${contractData.contract_type.replace('_', ' ')} contract.`,
          reference_type: "user",
          reference_id: contract.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
      }

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-contracts']);
      setShowContractModal(false);
      alert('✅ AI contract generated! Awaiting admin review.');
    }
  });

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (type === 'audio') {
      setTrackForm(prev => ({ ...prev, audio_file_url: file_url }));
    } else if (type === 'cover') {
      setTrackForm(prev => ({ ...prev, cover_art_url: file_url }));
    }
  };

  const totalStreams = myTracks?.reduce((sum, track) => sum + (track.stream_count || 0), 0) || 0;
  const totalRevenue = myTracks?.reduce((sum, track) => sum + (track.revenue_generated || 0), 0) || 0;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <div className="text-center">
          <Music className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-lg">Loading Artist Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(createPageUrl("Vibe"))}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Mic2 className="w-10 h-10 text-purple-400" />
              Artist Studio
            </h1>
            <p className="text-gray-300">Upload, Monetize & Grow</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Play className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{(totalStreams || 0).toLocaleString()}</p>
              <p className="text-gray-400 text-sm">Total Streams</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">${(totalRevenue || 0).toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Revenue</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Music className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{myTracks?.length || 0}</p>
              <p className="text-gray-400 text-sm">Tracks</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 hover:border-yellow-500/40 transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-white">{myPools?.length || 0}</p>
              <p className="text-gray-400 text-sm">Fan Pools</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => setShowUploadModal(true)} 
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-8 text-lg font-bold shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            <Upload className="w-6 h-6 mr-3" />
            Upload Music
          </Button>
          <Button 
            onClick={() => setShowPoolModal(true)} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-8 text-lg font-bold shadow-lg hover:shadow-blue-500/50 transition-all"
          >
            <Users className="w-6 h-6 mr-3" />
            Create Fan Pool
          </Button>
          <Button 
            onClick={() => setShowContractModal(true)} 
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-8 text-lg font-bold shadow-lg hover:shadow-green-500/50 transition-all"
          >
            <FileSignature className="w-6 h-6 mr-3" />
            AI Contract
          </Button>
          <Button 
            onClick={() => setShowDealModal(true)} 
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 py-8 text-lg font-bold shadow-lg hover:shadow-yellow-500/50 transition-all"
          >
            <Briefcase className="w-6 h-6 mr-3" />
            Apply for Deals
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile: Horizontal Scroll Tabs */}
          <div className="mb-6">
            <TabsList className="flex md:grid md:grid-cols-4 lg:grid-cols-8 gap-2 overflow-x-auto pb-2 md:pb-0 bg-transparent md:bg-white/10 md:border md:border-white/20 md:p-3">
              <TabsTrigger 
                value="analytics" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-500"
              >
                📊 Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="tracks" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-500"
              >
                🎵 Tracks
              </TabsTrigger>
              <TabsTrigger 
                value="pools" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-500"
              >
                👥 Fan Pools
              </TabsTrigger>
              <TabsTrigger 
                value="mastering" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:border-pink-500"
              >
                🎚️ Mastering
              </TabsTrigger>
              <TabsTrigger 
                value="distribution" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-500"
              >
                🚀 Distribution
              </TabsTrigger>
              <TabsTrigger 
                value="sync" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-500"
              >
                🎬 Sync
              </TabsTrigger>
              <TabsTrigger 
                value="contracts" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-500"
              >
                📄 Contracts
              </TabsTrigger>
              <TabsTrigger 
                value="deals" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:border-yellow-500"
              >
                💼 Deals
              </TabsTrigger>
              <TabsTrigger 
                value="video" 
                className="flex-shrink-0 text-sm md:text-base font-bold px-4 md:px-6 py-3 md:py-4 whitespace-nowrap bg-white/10 border border-white/20 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:border-red-500"
              >
                🎬 Video
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="mt-6">
            <AdvancedAnalytics tracks={myTracks} fanPools={myPools} />
          </TabsContent>

          <TabsContent value="mastering" className="mt-6">
            <AIMasteringStudio currentUser={currentUser} tracks={myTracks} />
          </TabsContent>

          <TabsContent value="distribution" className="mt-6">
            <DistributionManager tracks={myTracks} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="sync" className="mt-6">
            <SyncLicensingManager tracks={myTracks} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="tracks" className="mt-6">
            {!myTracks || myTracks.length === 0 ? (
              <div className="text-center py-20">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No tracks yet</h3>
                <p className="text-gray-400 mb-6">Upload your first track to start sharing your music</p>
                <Button onClick={() => setShowUploadModal(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Track
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myTracks.map((track) => (
                  <Card key={track.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                    <CardContent className="p-4">
                      {track.cover_art_url && (
                        <img 
                          src={track.cover_art_url} 
                          alt={track.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="text-white font-bold mb-2 text-lg">{track.title || 'Untitled Track'}</h3>
                      <p className="text-gray-400 text-sm mb-3 capitalize">{track.genre || 'Unknown'}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div className="text-center bg-white/5 rounded-lg p-2">
                          <p className="text-white font-bold text-lg">{track.stream_count || 0}</p>
                          <p className="text-gray-400">Streams</p>
                        </div>
                        <div className="text-center bg-white/5 rounded-lg p-2">
                          <p className="text-white font-bold text-lg">{track.download_count || 0}</p>
                          <p className="text-gray-400">Downloads</p>
                        </div>
                        <div className="text-center bg-white/5 rounded-lg p-2">
                          <p className="text-green-400 font-bold text-lg">${(track.revenue_generated || 0).toFixed(0)}</p>
                          <p className="text-gray-400">Revenue</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setSelectedTrackForSplit(track)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Splits
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                </div>

                {selectedTrackForSplit && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
                      onClick={() => setSelectedTrackForSplit(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                      >
                        <RoyaltySplitManager 
                          track={selectedTrackForSplit} 
                          currentUser={currentUser}
                        />
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pools" className="mt-6">
            <FanPoolManager fanPools={myPools} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myContracts && myContracts.length > 0 ? (
                myContracts.map((contract) => (
                  <Card key={contract.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-bold text-xl mb-1 capitalize">
                            {(contract.contract_type || 'contract').replace('_', ' ')}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {contract.parties?.length || 0} parties involved
                          </p>
                        </div>
                        <Badge className={
                          contract.status === 'all_signed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          contract.status === 'pending_admin_review' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          contract.status === 'under_negotiation' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }>
                          {(contract.status || 'pending').replace('_', ' ')}
                        </Badge>
                      </div>

                      {contract.status === 'pending_admin_review' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                          <p className="text-yellow-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            AI contract awaiting admin review
                          </p>
                        </div>
                      )}

                      {contract.negotiation_history && contract.negotiation_history.length > 0 && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-2">Recent Activity:</p>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-white text-sm line-clamp-3">
                              {contract.negotiation_history[contract.negotiation_history.length - 1].proposed_changes}
                            </p>
                          </div>
                        </div>
                      )}

                      {contract.parties && contract.parties.length > 0 && (
                        <div className="mt-4">
                          <p className="text-gray-400 text-xs mb-2">Parties:</p>
                          <div className="flex flex-wrap gap-2">
                            {contract.parties.map((party, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {party.name || party.email || 'Party ' + (idx + 1)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-20">
                  <FileSignature className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No contracts yet</h3>
                  <p className="text-gray-400 mb-6">Generate AI-powered smart contracts for deals</p>
                  <Button onClick={() => setShowContractModal(true)} className="bg-green-600 hover:bg-green-700">
                    <FileSignature className="w-4 h-4 mr-2" />
                    Generate Contract
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <VideoEditorPro currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="deals" className="mt-6">
            {!myDealApplications || myDealApplications.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No deal applications yet</h3>
                <p className="text-gray-400 mb-6">Apply for record labels, distribution, or sponsorships</p>
                <Button onClick={() => setShowDealModal(true)} className="bg-yellow-600 hover:bg-yellow-700">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Apply for Deals
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myDealApplications.map((deal) => (
                <Card key={deal.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-xl mb-1">{deal.artist_name || currentUser?.full_name || 'Artist'}</h3>
                        <p className="text-gray-400 capitalize text-sm">{(deal.deal_type || 'deal').replace('_', ' ')}</p>
                      </div>
                      <Badge className={
                        deal.status === 'offer_made' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        deal.status === 'accepted' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }>
                        {(deal.status || 'pending').replace('_', ' ')}
                      </Badge>
                    </div>
                    {deal.monthly_listeners && (
                      <div className="bg-white/5 rounded-lg p-3 mb-3">
                        <p className="text-gray-400 text-xs mb-1">Monthly Listeners</p>
                        <p className="text-white font-bold text-lg">{deal.monthly_listeners.toLocaleString()}</p>
                      </div>
                    )}
                    {deal.career_goals && (
                      <div className="mt-3">
                        <p className="text-gray-400 text-xs mb-1">Career Goals</p>
                        <p className="text-white text-sm line-clamp-2">{deal.career_goals}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Track Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowUploadModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6">Upload Track</h2>
                <div className="space-y-4">
                  <Input
                    value={trackForm.title}
                    onChange={(e) => setTrackForm({...trackForm, title: e.target.value})}
                    placeholder="Track title"
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Genre</label>
                    <select
                      value={trackForm.genre}
                      onChange={(e) => setTrackForm({...trackForm, genre: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value="hip_hop">Hip Hop</option>
                      <option value="rap">Rap</option>
                      <option value="r_n_b">R&B</option>
                      <option value="pop">Pop</option>
                      <option value="rock">Rock</option>
                      <option value="electronic">Electronic</option>
                      <option value="latin">Latin</option>
                      <option value="country">Country</option>
                      <option value="jazz">Jazz</option>
                      <option value="reggae">Reggae</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Monetization Model</label>
                    <select
                      value={trackForm.pricing_model}
                      onChange={(e) => setTrackForm({...trackForm, pricing_model: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                      <option value="hybrid">Hybrid (Free streams + Paid downloads)</option>
                    </select>
                  </div>

                  {trackForm.pricing_model !== 'free' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={trackForm.price_usd}
                        onChange={(e) => setTrackForm({...trackForm, price_usd: Number(e.target.value)})}
                        placeholder="Price USD"
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <Input
                        type="number"
                        value={trackForm.price_soflo}
                        onChange={(e) => setTrackForm({...trackForm, price_soflo: Number(e.target.value)})}
                        placeholder="Price SFC"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Audio File</label>
                    {trackForm.audio_file_url ? (
                      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-green-400">Audio uploaded</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setTrackForm({...trackForm, audio_file_url: ""})}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-purple-500/50 transition">
                        <input
                          id="audio-upload"
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'audio');
                          }}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('audio-upload')?.click();
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 border-0"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Audio File
                        </Button>
                        <p className="text-gray-400 text-xs mt-2">MP3, WAV, M4A, AAC, OGG</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Cover Art (Optional)</label>
                    {trackForm.cover_art_url ? (
                      <div className="relative inline-block">
                        <img src={trackForm.cover_art_url} alt="Cover" className="w-32 h-32 rounded-lg object-cover" />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setTrackForm({...trackForm, cover_art_url: ""})}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-blue-500/50 transition">
                        <input
                          id="cover-upload"
                          type="file"
                          accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'cover');
                          }}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('cover-upload')?.click();
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 border-0"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Cover Art
                        </Button>
                        <p className="text-gray-400 text-xs mt-2">JPG, PNG, GIF, WEBP</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowUploadModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => uploadTrackMutation.mutate(trackForm)}
                      disabled={!currentUser || !trackForm.title || !trackForm.audio_file_url}
                      className="flex-1 bg-purple-600"
                    >
                      Publish
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Fan Pool Modal */}
        <AnimatePresence>
          {showPoolModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowPoolModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6">Create Fan Pool</h2>
                <div className="space-y-4">
                  <Input
                    value={poolForm.title}
                    onChange={(e) => setPoolForm({...poolForm, title: e.target.value})}
                    placeholder="e.g., Live Concert in Miami"
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <textarea
                    value={poolForm.description}
                    onChange={(e) => setPoolForm({...poolForm, description: e.target.value})}
                    rows={4}
                    placeholder="Describe what fans are funding..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500"
                  />

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Pool Type</label>
                    <select
                      value={poolForm.pool_type}
                      onChange={(e) => setPoolForm({...poolForm, pool_type: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="concert_show">Concert/Show</option>
                      <option value="music_video">Music Video</option>
                      <option value="album_release">Album Release</option>
                      <option value="tour">Tour</option>
                      <option value="merchandise">Merchandise</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      type="number"
                      value={poolForm.goal_amount}
                      onChange={(e) => setPoolForm({...poolForm, goal_amount: Number(e.target.value)})}
                      placeholder="Goal amount (USD)"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      type="date"
                      value={poolForm.deadline}
                      onChange={(e) => setPoolForm({...poolForm, deadline: e.target.value})}
                      placeholder="Campaign deadline"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={poolForm.event_date}
                      onChange={(e) => setPoolForm({...poolForm, event_date: e.target.value})}
                      placeholder="Event date"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      value={poolForm.location}
                      onChange={(e) => setPoolForm({...poolForm, location: e.target.value})}
                      placeholder="Event location"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  {/* Tier Setup */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3">Reward Tiers</h3>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const newTier = {
                          tier_name: "VIP",
                          minimum_contribution: 100,
                          access_type: "vip",
                          rewards: ["VIP Pass", "Meet & Greet"],
                          limited_slots: 50
                        };
                        setPoolForm({...poolForm, tier_rewards: [...(poolForm.tier_rewards || []), newTier]});
                      }}
                      className="bg-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowPoolModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createPoolMutation.mutate(poolForm)}
                      disabled={!currentUser || !poolForm.title || !poolForm.goal_amount}
                      className="flex-1 bg-blue-600"
                    >
                      Create Pool
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deal Application Modal */}
        <AnimatePresence>
          {showDealModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowDealModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <Briefcase className="w-8 h-8 text-yellow-400" />
                  Apply for Music Deals
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Deal Type</label>
                    <select
                      value={dealForm.deal_type}
                      onChange={(e) => setDealForm({...dealForm, deal_type: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-yellow-500 transition"
                    >
                      <option value="record_label">Record Label Deal</option>
                      <option value="distribution">Distribution Deal</option>
                      <option value="management">Management Contract</option>
                      <option value="publishing">Publishing Deal</option>
                      <option value="sponsorship">Brand Sponsorship</option>
                    </select>
                  </div>

                  <Input
                    value={dealForm.artist_name}
                    onChange={(e) => setDealForm({...dealForm, artist_name: e.target.value})}
                    placeholder="Artist/Band Name"
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={dealForm.instagram_handle}
                      onChange={(e) => setDealForm({...dealForm, instagram_handle: e.target.value})}
                      placeholder="Instagram handle"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Input
                      value={dealForm.youtube_channel}
                      onChange={(e) => setDealForm({...dealForm, youtube_channel: e.target.value})}
                      placeholder="YouTube channel"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <Input
                    type="number"
                    value={dealForm.monthly_listeners}
                    onChange={(e) => setDealForm({...dealForm, monthly_listeners: Number(e.target.value)})}
                    placeholder="Monthly listeners (Spotify/Apple Music)"
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <textarea
                    value={dealForm.career_goals}
                    onChange={(e) => setDealForm({...dealForm, career_goals: e.target.value})}
                    rows={3}
                    placeholder="What are your career goals?"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500"
                  />

                  <textarea
                    value={dealForm.additional_info}
                    onChange={(e) => setDealForm({...dealForm, additional_info: e.target.value})}
                    rows={4}
                    placeholder="Additional information (notable achievements, previous releases, etc.)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500"
                  />

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">
                      <strong>Tip:</strong> Provide complete info about your music career, social media presence, and goals. Admins will review your application and may contact you with opportunities.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowDealModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => applyForDealMutation.mutate(dealForm)}
                      disabled={!currentUser || !dealForm.artist_name || !dealForm.monthly_listeners || applyForDealMutation.isLoading}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                    >
                      {applyForDealMutation.isLoading ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Contract Generator Modal */}
        <AnimatePresence>
          {showContractModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowContractModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                  Generate AI Smart Contract
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Contract Type</label>
                    <select
                      value={contractForm.contract_type}
                      onChange={(e) => setContractForm({...contractForm, contract_type: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500 transition"
                    >
                      <option value="collaboration_agreement">Collaboration Agreement</option>
                      <option value="performance_contract">Performance Contract</option>
                      <option value="production_agreement">Production Agreement</option>
                      <option value="licensing_agreement">Licensing Agreement</option>
                    </select>
                  </div>

                  <textarea
                    value={contractForm.description}
                    onChange={(e) => setContractForm({...contractForm, description: e.target.value})}
                    rows={4}
                    placeholder="Describe the deal terms you want..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500"
                  />

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">
                      <strong>How it works:</strong> AI generates a professional contract → Admin reviews & can revise → 
                      All parties can negotiate terms → Everyone signs digitally
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowContractModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!currentUser) return;
                        const parties = [
                          { email: currentUser.email, role: "Artist", name: currentUser.full_name }
                        ];
                        generateContractMutation.mutate({
                          ...contractForm,
                          parties
                        });
                      }}
                      disabled={!currentUser || !contractForm.description || generateContractMutation.isLoading}
                      className="flex-1 bg-green-600"
                    >
                      {generateContractMutation.isLoading ? 'Generating...' : 'Generate Contract'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}