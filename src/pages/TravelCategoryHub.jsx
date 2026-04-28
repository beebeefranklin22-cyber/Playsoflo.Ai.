import React, { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Plus, X, Upload, Loader2, MapPin, Users, Clock,
  ChevronRight, CheckCircle, MessageCircle, Calendar, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TravelProviderOnboardingModal from "@/components/travel/TravelProviderOnboardingModal";
import TravelBookingModal from "@/components/travel/TravelBookingModal";
import LocationFilter from "../components/location/LocationFilter";
import CitySelector from "../components/location/CitySelector";
import { useUserLocation } from "../hooks/useUserLocation";

const CATEGORY_META = {
  private_jets: {
    label: "Private Jets",
    description: "Charter exclusive private jets for any destination",
    image: "https://images.unsplash.com/photo-1596541624443-41584c312781?w=1200",
    color: "from-indigo-900 to-gray-950",
    accent: "text-indigo-400",
    badge: "bg-indigo-500/20 border-indigo-500/30",
  },
  yachts: {
    label: "Yacht Charters",
    description: "Luxury yachts for day trips, sunset cruises and more",
    image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200",
    color: "from-cyan-900 to-gray-950",
    accent: "text-cyan-400",
    badge: "bg-cyan-500/20 border-cyan-500/30",
  },
  helicopter_rides: {
    label: "Helicopter Tours",
    description: "Breathtaking scenic helicopter experiences",
    image: "https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1200",
    color: "from-pink-900 to-gray-950",
    accent: "text-pink-400",
    badge: "bg-pink-500/20 border-pink-500/30",
  },
  motorcycle_rides: {
    label: "Motorcycle Rentals",
    description: "Premium motorcycle rentals for adventurous riders",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a1118?w=1200",
    color: "from-orange-900 to-gray-950",
    accent: "text-orange-400",
    badge: "bg-orange-500/20 border-orange-500/30",
  },
  chauffeur_services: {
    label: "Chauffeur Services",
    description: "Professional chauffeurs for any occasion",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200",
    color: "from-yellow-900 to-gray-950",
    accent: "text-yellow-400",
    badge: "bg-yellow-500/20 border-yellow-500/30",
  },
  luxury_concierge: {
    label: "Luxury Concierge",
    description: "Your personal concierge for exclusive experiences",
    image: "https://images.unsplash.com/photo-1517486804593-3d027d147413?w=1200",
    color: "from-purple-900 to-gray-950",
    accent: "text-purple-400",
    badge: "bg-purple-500/20 border-purple-500/30",
  },
};

export default function TravelCategoryHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [locationCity, setLocationCity] = useState("");
  const [locationRadius, setLocationRadius] = useState(null);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const { userCity, refreshLocation } = useUserLocation();

  // Get category from URL
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || "private_jets";
  const meta = CATEGORY_META[category] || CATEGORY_META["private_jets"];

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["travel-listings", category],
    queryFn: () => base44.entities.TravelListing.filter({ category, is_active: true }),
    initialData: [],
  });

  const filteredListings = listings.filter(listing => {
    if (!locationCity) return true;
    const q = locationCity.toLowerCase();
    return [listing.location, listing.provider_name].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  return (
    <>
    <PageWrapper>
      <div className={`min-h-screen bg-gradient-to-br ${meta.color}`}>
        {/* Hero */}
        <div className="relative h-72 flex items-end">
          <img src={meta.image} alt={meta.label} className="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative z-10 w-full px-6 pb-8 pt-20">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{meta.label}</h1>
            <p className="text-gray-300 text-lg">{meta.description}</p>
          </div>
        </div>

        <div className="px-6 py-8">
          {/* Location Filter */}
          <LocationFilter
            cityValue={locationCity}
            onCityChange={setLocationCity}
            radiusValue={locationRadius}
            onRadiusChange={setLocationRadius}
            userCity={userCity}
            accentColor="purple"
            onOpenCitySettings={() => setShowCitySelector(true)}
          />

          {/* Become a Provider CTA */}
          <div className={`mb-8 p-5 rounded-2xl border ${meta.badge} flex items-center justify-between gap-4`}>
            <div>
              <p className="text-white font-bold text-lg">Are you a {meta.label} provider?</p>
              <p className="text-gray-300 text-sm">List your service and start earning today</p>
            </div>
            <Button
              onClick={() => setShowOnboarding(true)}
              className="bg-white text-gray-900 hover:bg-gray-100 font-bold whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" />
              List Service
            </Button>
          </div>

          {/* Listings */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No providers yet</h3>
              <p className="text-gray-400 mb-6">Be the first to list your {meta.label.toLowerCase()} service in this area!</p>
              <Button onClick={() => setShowOnboarding(true)} className="bg-white text-gray-900 font-bold px-8 py-3">
                List Your Service →
              </Button>
            </div>
          ) : filteredListings.length === 0 && locationCity ? (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-white font-semibold">No listings found near "{locationCity}"</p>
              <p className="text-gray-400 text-sm mt-1">Try a different city or clear the filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-white/30 transition group cursor-pointer"
                  onClick={() => { setSelectedListing(listing); setShowBooking(true); }}
                >
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-48 bg-white/10 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No photo</span>
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-bold text-lg leading-tight">{listing.title}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-sm">{listing.rating || "5.0"}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center gap-3 text-gray-400 text-sm mb-4">
                      {listing.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location}</span>
                      )}
                      {listing.capacity && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />Up to {listing.capacity}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-white">${listing.price}</span>
                        <span className="text-gray-400 text-sm ml-1">/{listing.price_type?.replace("per_", "") || "hr"}</span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-white text-gray-900 font-bold hover:bg-gray-100"
                        onClick={(e) => { e.stopPropagation(); setSelectedListing(listing); setShowBooking(true); }}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

    </PageWrapper>

    {showOnboarding && (
      <TravelProviderOnboardingModal
        category={category}
        categoryLabel={meta.label}
        onClose={() => setShowOnboarding(false)}
        onSuccess={() => {
          setShowOnboarding(false);
          queryClient.invalidateQueries(["travel-listings", category]);
          toast.success("Your listing is live!");
        }}
      />
    )}

    {showBooking && selectedListing && (
      <TravelBookingModal
        listing={selectedListing}
        onClose={() => { setShowBooking(false); setSelectedListing(null); }}
      />
    )}

    {showCitySelector && (
      <CitySelector
        user={{ city: userCity }}
        onClose={() => setShowCitySelector(false)}
        onSaved={() => { refreshLocation(); setShowCitySelector(false); }}
      />
    )}
    </>
  );
}