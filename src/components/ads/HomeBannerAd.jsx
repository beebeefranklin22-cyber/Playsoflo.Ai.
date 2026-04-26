import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HomeBannerAd({ currentUser }) {
  const [dismissed, setDismissed] = useState(false);
  const [tracked, setTracked] = useState(false);

  const { data: adData } = useQuery({
    queryKey: ['home-banner-ad', currentUser?.email],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('serveTargetedAd', { position: 'banner' });
      return data;
    },
    staleTime: 120000,
    refetchInterval: 180000,
  });

  const ad = adData?.ad;

  useEffect(() => {
    if (ad && !tracked) {
      setTracked(true);
      base44.functions.invoke('updateAdMetrics', { campaign_id: ad.id, event_type: 'impression' }).catch(() => {});
    }
  }, [ad?.id]);

  const handleClick = () => {
    if (!ad) return;
    base44.functions.invoke('updateAdMetrics', { campaign_id: ad.id, event_type: 'click' }).catch(() => {});
    if (ad.destination_url) window.open(ad.destination_url, '_blank');
  };

  // Always show a placeholder banner (even without a live ad) so the slot is always visible
  const headline = ad?.headline || "Promote your business on PlaySoFlo";
  const description = ad?.description || "Reach thousands of engaged users. Click to learn more.";
  const imageUrl = ad?.media_urls?.[0];
  const destinationUrl = ad?.destination_url;

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mx-4 my-3 rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-pink-900/40 relative"
      >
        {/* Exit button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition"
          aria-label="Close ad"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>

        <div
          className={`flex items-center gap-4 p-4 ${(destinationUrl || ad) ? 'cursor-pointer' : ''}`}
          onClick={handleClick}
        >
          {/* Image */}
          {imageUrl ? (
            <img src={imageUrl} alt={headline} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-7 h-7 text-white" />
            </div>
          )}

          {/* Text */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide">Sponsored</span>
            </div>
            <p className="text-white font-semibold text-sm">{headline}</p>
            <p className="text-gray-400 text-xs line-clamp-2 mt-0.5">{description}</p>
          </div>

          {/* CTA */}
          {destinationUrl && (
            <div className="flex-shrink-0">
              <span className="text-xs text-purple-300 font-semibold flex items-center gap-1.5 whitespace-nowrap bg-purple-500/20 px-3 py-1.5 rounded-full">
                Learn more <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}