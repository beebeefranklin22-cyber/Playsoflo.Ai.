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

  const handleDistribute = async () => {
    if (!selectedTrack || selectedPlatforms.length === 0) {
      toast.error('Please select a track and at least one platform');
      return;
    }

    setDistributingTracks({ ...distributingTracks, [selectedTrack.id]: true });
    
    try {
      // In real app, this would integrate with distribution APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await base44.entities.MusicTrack.update(selectedTrack.id, {
        distribution_platforms: [...(selectedTrack.distribution_platforms || []), ...selectedPlatforms],
        distribution_status: 'distributed',
        distributed_date: new Date().toISOString()
      });

      toast.success(`Track distributed to ${selectedPlatforms.length} platforms!`);
      setShowDistributeModal(false);
      setSelectedTrack(null);
      setSelectedPlatforms([]);
    } catch (error) {
      toast.error('Distribution failed. Please try again.');
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
        <h3 className="text-lg font-bold text-white mb-4">Choose a Distribution Service</h3>
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
            const isDistributed = track.distribution_platforms?.length > 0;
            
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
                      
                      {isDistributed ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-green-500/20 text-green-400">
                            Distributed
                          </Badge>
                          {track.distribution_platforms?.map((platform) => (
                            <span key={platform} className="text-xs">
                              {platforms.find(p => p.id === platform)?.icon}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTrack(track);
                            setShowDistributeModal(true);
                          }}
                          disabled={!selectedDistributor}
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
              <p className="text-gray-400 mb-6">
                Distributing: <span className="text-white font-bold">{selectedTrack?.title}</span>
              </p>

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
                  disabled={selectedPlatforms.length === 0 || distributingTracks[selectedTrack?.id]}
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