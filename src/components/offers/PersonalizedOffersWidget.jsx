import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Clock, Sparkles, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function PersonalizedOffersWidget({ user, onOfferAdded }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({});
  const [dismissed, setDismissed] = useState(false);

  // Fetch personalized offers
  const fetchOffers = async () => {
    if (!user || dismissed) return;
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generatePersonalizedOffers', {});
      if (response?.offers && response.offers.length > 0) {
        setOffers(response.offers);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (offers.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const newTimeRemaining = {};

      offers.forEach((offer, idx) => {
        const expiresAt = new Date(offer.expiresAt);
        const diff = expiresAt - now;
        const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
        const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
        newTimeRemaining[idx] = `${hours}h ${minutes}m`;
      });

      setTimeRemaining(newTimeRemaining);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [offers]);

  // Initialize countdown on load
  useEffect(() => {
    const now = new Date();
    const newTimeRemaining = {};

    offers.forEach((offer, idx) => {
      const expiresAt = new Date(offer.expiresAt);
      const diff = expiresAt - now;
      const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
      newTimeRemaining[idx] = `${hours}h ${minutes}m`;
    });

    setTimeRemaining(newTimeRemaining);
  }, [offers]);

  if (loading || offers.length === 0 || dismissed) return null;

  const currentOffer = offers[activeOfferIndex];

  const handleAddToBundle = () => {
    toast.success(`"${currentOffer.name}" added to cart! Check out and save ${currentOffer.discountPercent}%.`);
    if (onOfferAdded) onOfferAdded(currentOffer);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full mb-6 rounded-2xl overflow-hidden"
      >
        <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" />
            <span className="font-bold text-lg">Limited-Time Bundle Offer</span>
          </div>

          {/* Main offer content */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{currentOffer.name}</h3>
              <p className="text-white/90 text-sm mt-1">{currentOffer.description}</p>
            </div>

            {/* Services list */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">What's Included</p>
              <div className="grid grid-cols-2 gap-2">
                {currentOffer.services.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                    {service}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing and CTA */}
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">${currentOffer.bundlePrice.toFixed(2)}</span>
                  <span className="text-lg line-through opacity-70">${currentOffer.originalPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">{currentOffer.discountPercent}% OFF</span>
                </div>
              </div>

              <button
                onClick={handleAddToBundle}
                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition flex items-center gap-2 active:scale-95"
              >
                Add Bundle
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Urgency and timer */}
            <div className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold">{currentOffer.urgencyMessage}</p>
              <div className="flex items-center gap-2 text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" />
                {timeRemaining[activeOfferIndex] || 'Loading...'}
              </div>
            </div>
          </div>

          {/* Carousel indicators */}
          {offers.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/20">
              {offers.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveOfferIndex(idx)}
                  className={`h-2 transition-all ${
                    idx === activeOfferIndex ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}