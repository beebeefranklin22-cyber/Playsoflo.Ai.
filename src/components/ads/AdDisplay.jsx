import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AdDisplay({ currentUser, position = "feed" }) {
  const [shownAds, setShownAds] = useState(new Set());
  const [userLocation, setUserLocation] = useState(null);

  // Get user's location for geo-targeting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => console.log("Location access denied")
      );
    }
  }, []);

  const { data: adData } = useQuery({
    queryKey: ['targeted-ad', currentUser?.email, position, Array.from(shownAds)],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('serveTargetedAd', {
        position,
        exclude_ids: Array.from(shownAds)
      });
      return data;
    },
    enabled: !!currentUser,
    refetchInterval: 120000,
    staleTime: 60000
  });

  const ad = adData?.ad;
  const eligibleAds = ad ? [ad] : [];

  const trackImpression = async (campaignId) => {
    if (shownAds.has(campaignId)) return;
    
    setShownAds(prev => new Set([...prev, campaignId]));
    
    try {
      await base44.functions.invoke('updateAdMetrics', {
        campaign_id: campaignId,
        event_type: 'impression'
      });
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  };

  const trackClick = async (campaignId) => {
    try {
      await base44.functions.invoke('updateAdMetrics', {
        campaign_id: campaignId,
        event_type: 'click'
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  useEffect(() => {
    eligibleAds.forEach(ad => {
      trackImpression(ad.id);
    });
  }, [eligibleAds]);

  if (!eligibleAds || eligibleAds.length === 0) return null;

  const ad = eligibleAds[0];

  // Story format
  if (position === "stories") {
    return (
      <div
        className="relative flex flex-col items-center gap-2 flex-shrink-0 group"
        style={{ scrollSnapAlign: 'start' }}
        onClick={() => {
          trackImpression(ad.id);
          trackClick(ad.id);
          if (ad.destination_url) {
            window.open(ad.destination_url, '_blank');
          }
        }}
      >
        <button className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 shadow-lg hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
              {ad.media_urls?.[0] && (
                <img src={ad.media_urls[0]} className="w-full h-full object-cover" alt={ad.headline} />
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-gray-900">
            <span className="text-white text-[8px] font-bold">AD</span>
          </div>
        </button>
        <span className="text-gray-300 text-xs max-w-[64px] truncate">Sponsored</span>
      </div>
    );
  }

  // Feed format
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Badge className="bg-purple-500/20 text-purple-300 text-xs">
              Sponsored
            </Badge>
            <span className="text-gray-500 text-xs">Ad</span>
          </div>
        </div>

        {ad.media_urls?.[0] && (
          <img 
            src={ad.media_urls[0]} 
            alt={ad.headline}
            className="w-full aspect-square object-cover cursor-pointer"
            onClick={() => {
              trackClick(ad.id);
              if (ad.destination_url) {
                window.open(ad.destination_url, '_blank');
              }
            }}
          />
        )}

        <div className="p-4">
          <h3 className="text-white font-bold text-lg mb-1">{ad.headline}</h3>
          {ad.description && (
            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{ad.description}</p>
          )}
          
          <Button
            onClick={() => {
              trackClick(ad.id);
              if (ad.destination_url) {
                window.open(ad.destination_url, '_blank');
              }
            }}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {ad.call_to_action?.replace('_', ' ').toUpperCase() || 'LEARN MORE'}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}