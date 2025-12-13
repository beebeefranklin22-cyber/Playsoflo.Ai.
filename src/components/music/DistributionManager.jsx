import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, Music, Globe, TrendingUp, Sparkles, ExternalLink, Upload, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const platforms = [
  { 
    id: "spotify", 
    name: "Spotify", 
    icon: "🎵", 
    color: "bg-green-500", 
    description: "World's largest streaming platform",
    reach: "500M+ users"
  },
  { 
    id: "apple_music", 
    name: "Apple Music", 
    icon: "🍎", 
    color: "bg-red-500",
    description: "Premium streaming service",
    reach: "100M+ users"
  },
  { 
    id: "youtube_music", 
    name: "YouTube Music", 
    icon: "▶️", 
    color: "bg-red-600",
    description: "Video & music streaming",
    reach: "2B+ users"
  },
  { 
    id: "amazon_music", 
    name: "Amazon Music", 
    icon: "📦", 
    color: "bg-blue-500",
    description: "Integrated with Amazon ecosystem",
    reach: "80M+ users"
  },
  { 
    id: "tidal", 
    name: "Tidal", 
    icon: "🌊", 
    color: "bg-cyan-500",
    description: "High-fidelity streaming",
    reach: "5M+ users"
  },
  { 
    id: "soundcloud", 
    name: "SoundCloud", 
    icon: "☁️", 
    color: "bg-orange-500",
    description: "Independent artist platform",
    reach: "76M+ users"
  },
  { 
    id: "deezer", 
    name: "Deezer", 
    icon: "🎧", 
    color: "bg-purple-500",
    description: "Global streaming service",
    reach: "16M+ users"
  },
  { 
    id: "pandora", 
    name: "Pandora", 
    icon: "📻", 
    color: "bg-blue-600",
    description: "Personalized radio",
    reach: "50M+ users"
  }
];

const distributors = [
  {
    id: "distrokid",
    name: "DistroKid",
    logo: "🚀",
    price: "$22.99/year",
    features: ["Unlimited uploads", "Keep 100% royalties", "Instant distribution", "Spotify Pre-save"],
    pros: ["Fast & easy", "Affordable", "Artist-friendly"],
    cons: ["Annual fee required", "Extra features cost more"]
  },
  {
    id: "tunecore",
    name: "TuneCore",
    logo: "🎼",
    price: "$29.99/year per album",
    features: ["Keep 100% royalties", "Detailed analytics", "YouTube monetization", "Publishing admin"],
    pros: ["Established reputation", "Good analytics", "Extra revenue streams"],
    cons: ["More expensive", "Per-release pricing"]
  },
  {
    id: "cdbaby",
    name: "CD Baby",
    logo: "💿",
    price: "$9.95 per single, $29 per album",
    features: ["One-time fee", "Keep 91% of streaming royalties", "Physical distribution", "Sync licensing"],
    pros: ["No annual fees", "Physical CDs available", "Sync opportunities"],
    cons: ["Takes 9% of royalties", "Higher upfront cost"]
  }
];

export default function DistributionManager({ tracks, currentUser }) {
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [distributingTracks, setDistributingTracks] = useState({});
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [releaseDate, setReleaseDate] = useState('');
  const [distributions, setDistributions] = useState([]);

  React.useEffect(() => {
    if (currentUser) {
      base44.entities.MusicDistribution.filter({ artist_email: currentUser.email })
        .then(setDistributions)
        .catch(console.error);
    }
  }, [currentUser]);

  const handleDistribute = async () => {
    if (!selectedTrack || selectedPlatforms.length === 0) {
      toast.error('Please select a track and at least one platform');
      return;
    }

    if (!selectedDistributor) {
      toast.error('Please select a distribution service first');
      return;
    }

    const distributorPricing = {
      distrokid: { single: 22.99, album: 22.99 },
      tunecore: { single: 9.99, album: 29.99 },
      cdbaby: { single: 9.95, album: 29.00 }
    };

    const PLAYSO_FLO_FEE = 2.22;
    const distributorFee = distributorPricing[selectedDistributor]?.single || 9.99;
    const totalFee = distributorFee + PLAYSO_FLO_FEE;

    if (!currentUser || currentUser.usd_balance < totalFee) {
      toast.error(`Insufficient balance. Need $${totalFee.toFixed(2)} ($${distributorFee} + $${PLAYSO_FLO_FEE} service fee)`);
      return;
    }

    setDistributingTracks({ ...distributingTracks, [selectedTrack.id]: true });
    
    try {
      const response = await base44.functions.invoke('processMusicDistribution', {
        track_id: selectedTrack.id,
        distribution_type: 'single',
        release_date: releaseDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        platforms: selectedPlatforms,
        distributor: selectedDistributor
      });

      const data = response.data;
      
      toast.success(`${data.message} • ISRC: ${data.isrc_code}`);
      
      // Refresh distributions list
      const updatedDistributions = await base44.entities.MusicDistribution.filter({ 
        artist_email: currentUser.email 
      });
      setDistributions(updatedDistributions);

      setShowDistributeModal(false);
      setSelectedTrack(null);
      setSelectedPlatforms([]);
      setReleaseDate('');
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Distribution failed. Please try again.');
    } finally {
      setDistributingTracks({ ...distributingTracks, [selectedTrack.id]: false });
    }
  };

  const togglePlatform = (platformId) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Music Distribution</h2>
        <p className="text-gray-400">Distribute your music to major streaming platforms worldwide</p>
      </div>

      {/* Choose Distributor */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Choose a Distribution Service (Required)</h3>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-yellow-300 text-sm">
            💰 PlaySoFlo adds a $2.22 service fee on top of the distributor's pricing
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {distributors.map((dist) => (
            <Card 
              key={dist.id}
              className={`cursor-pointer transition ${
                selectedDistributor === dist.id 
                  ? 'bg-purple-500/20 border-purple-500' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              onClick={() => setSelectedDistributor(dist.id)}
            >
              <CardContent className="p-6">
                <div className="text-4xl mb-3">{dist.logo}</div>
                <h4 className="text-white font-bold text-xl mb-1">{dist.name}</h4>
                <p className="text-green-400 font-bold mb-4">{dist.price}</p>
                
                <div className="space-y-2 mb-4">
                  {dist.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-green-400 text-xs font-bold mb-1">PROS:</p>
                    {dist.pros.map((pro, idx) => (
                      <p key={idx} className="text-gray-400 text-xs">• {pro}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-red-400 text-xs font-bold mb-1">CONS:</p>
                    {dist.cons.map((con, idx) => (
                      <p key={idx} className="text-gray-400 text-xs">• {con}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Your Tracks */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Your Tracks</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {tracks.map((track) => {
            const distribution = distributions.find(d => d.track_id === track.id);
            
            return (
              <Card key={track.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img 
                      src={track.cover_art_url || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200"}
                      alt={track.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    
                    <div className="flex-1">
                      <h4 className="text-white font-bold mb-1">{track.title}</h4>
                      <p className="text-gray-400 text-sm mb-2">{track.genre?.replace('_', ' ')}</p>
                      
                      {distribution ? (
                        <div className="space-y-2">
                          <Badge className={`${
                            distribution.status === 'live' ? 'bg-green-500/20 text-green-400' :
                            distribution.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                            distribution.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {distribution.status === 'live' ? '🎉 Live' : 
                             distribution.status === 'submitted' ? '📤 Submitted' :
                             distribution.status === 'processing' ? '⏳ Processing' :
                             distribution.status}
                          </Badge>
                          {distribution.isrc_code && (
                            <p className="text-gray-400 text-xs">ISRC: {distribution.isrc_code}</p>
                          )}
                          {distribution.status === 'live' && distribution.platform_links && (
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(distribution.platform_links).map(([platform, link]) => (
                                <a
                                  key={platform}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xl hover:scale-110 transition"
                                  title={platform}
                                >
                                  {platforms.find(p => p.id === platform)?.icon}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!selectedDistributor) {
                              toast.error('Please select a distribution service first');
                              return;
                            }
                            setSelectedTrack(track);
                            setShowDistributeModal(true);
                          }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Distribute
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Distributions */}
      {distributions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Distribution Status</h3>
          <div className="space-y-3">
            {distributions.map((dist) => {
              const track = tracks.find(t => t.id === dist.track_id);
              return (
                <Card key={dist.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-bold mb-1">{track?.title || 'Unknown Track'}</h4>
                        <div className="flex items-center gap-3 flex-wrap text-sm">
                          <Badge className={`${
                            dist.status === 'live' ? 'bg-green-500/20 text-green-400' :
                            dist.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                            dist.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {dist.status}
                          </Badge>
                          <span className="text-gray-400">
                            {dist.platforms?.length || 0} platforms
                          </span>
                          {dist.isrc_code && (
                            <span className="text-gray-400">ISRC: {dist.isrc_code}</span>
                          )}
                          {dist.release_date && (
                            <span className="text-gray-400">
                              Release: {new Date(dist.release_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {dist.status === 'live' && dist.platform_links && (
                          <div className="flex gap-2 mt-2">
                            {Object.entries(dist.platform_links).map(([platform, link]) => (
                              <a
                                key={platform}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm text-white flex items-center gap-2"
                              >
                                {platforms.find(p => p.id === platform)?.icon}
                                {platforms.find(p => p.id === platform)?.name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform Selection Modal */}
      <AnimatePresence>
        {showDistributeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowDistributeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-bold text-white mb-2">Select Platforms</h2>
              <p className="text-gray-400 mb-4">
                Distributing: <span className="text-white font-bold">{selectedTrack?.title}</span>
              </p>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">Distribution Fee</span>
                  <span className="text-green-400 font-bold text-xl">$2.22</span>
                </div>
                <Input
                  type="date"
                  value={releaseDate ? new Date(releaseDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setReleaseDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  placeholder="Release Date (optional)"
                  className="bg-white/10 border-white/20 text-white"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-gray-400 text-xs mt-2">
                  Your balance: ${currentUser?.usd_balance?.toFixed(2) || '0.00'}
                  {!releaseDate && ' • Default: 14 days from now'}
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-8">
                {platforms.map((platform) => (
                  <Card
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`cursor-pointer transition ${
                      selectedPlatforms.includes(platform.id)
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl mb-2">{platform.icon}</div>
                      <h4 className="text-white font-bold text-sm mb-1">{platform.name}</h4>
                      <p className="text-gray-400 text-xs mb-2">{platform.reach}</p>
                      {selectedPlatforms.includes(platform.id) && (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedDistributor && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                  <h4 className="text-white font-semibold mb-2">Payment Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>{distributors.find(d => d.id === selectedDistributor)?.name} Fee:</span>
                      <span className="text-white font-semibold">
                        ${(selectedDistributor === 'distrokid' ? 22.99 : 
                           selectedDistributor === 'tunecore' ? 9.99 : 9.95).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>PlaySoFlo Service Fee:</span>
                      <span className="text-white font-semibold">$2.22</span>
                    </div>
                    <div className="border-t border-white/20 pt-1 mt-1"></div>
                    <div className="flex justify-between text-white font-bold">
                      <span>Total:</span>
                      <span className="text-green-400">
                        ${((selectedDistributor === 'distrokid' ? 22.99 : 
                            selectedDistributor === 'tunecore' ? 9.99 : 9.95) + 2.22).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mt-2">
                      Your balance: ${currentUser?.usd_balance?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDistributeModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDistribute}
                  disabled={selectedPlatforms.length === 0 || distributingTracks[selectedTrack?.id] || !selectedDistributor}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {distributingTracks[selectedTrack?.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Distributing...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Distribute to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}