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

  const { data: eligibleAds = [] } = useQuery({
    queryKey: ['eligible-ads', currentUser?.email, position],
    queryFn: async () => {
      const activeAds = await base44.entities.AdCampaign.filter({ status: 'active' });
      
      // Filter based on user targeting
      const eligible = activeAds.filter(ad => {
        if (!ad.targeting) return true;
        
        const userAge = currentUser?.age || 25;
        const ageMatch = userAge >= (ad.targeting.age_min || 0) && userAge <= (ad.targeting.age_max || 100);
        
        // Simple interest matching
        const userInterests = currentUser?.interests || [];
        const adInterests = ad.targeting.interests || [];
        const interestMatch = adInterests.length === 0 || 
          adInterests.some(interest => userInterests.includes(interest));
        
        return ageMatch && interestMatch && ad.media_urls?.length > 0;
      });

      // Random selection
      return eligible.sort(() => Math.random() - 0.5).slice(0, 3);
    },
    enabled: !!currentUser,
    refetchInterval: 60000
  });

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
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
            className="w-full h-64 object-cover cursor-pointer"
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
            <p className="text-gray-400 text-sm mb-3">{ad.description}</p>
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