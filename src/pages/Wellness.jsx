import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Star, Clock, Activity, Heart, Shield,
  Users, Home, Package, MessageSquare,
  CheckCircle, ShieldCheck, Plus, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "@/components/PageWrapper";
import WellnessProviderOnboardingModal from "@/components/wellness/WellnessProviderOnboardingModal";
import WellnessChatModal from "@/components/wellness/WellnessChatModal";
import UnifiedBookingModal from "@/components/booking/UnifiedBookingModal";
import LocationFilter from "../components/location/LocationFilter";
import CitySelector from "../components/location/CitySelector";
import { useUserLocation } from "../hooks/useUserLocation";

// Distance in miles between two lat/lng points. Self-contained here (rather
// than a shared util) since it's only meaningful once a service actually
// carries latitude/longitude -- see 0021_wellness_hub_fixes.sql.
function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius, miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationLabel(service) {
  if (service.location_type === "virtual") {
    return service.virtual_meeting_note ? `Virtual — ${service.virtual_meeting_note}` : "Virtual session";
  }
  if (service.location_type === "mobile") {
    return service.service_area ? `Mobile — comes to you (${service.service_area})` : "Mobile — provider comes to you";
  }
  return service.location || service.service_area || "In-person";
}

// Sends a booking-confirmation email using the same real, working
// Resend-backed api/email.js every other booking-confirmation call site in
// the app already POSTs to (see src/functions/sendBookingEmails.js). The
// checkout call (UnifiedBookingModal -> processUnifiedCheckout ->
// api/checkout.js) already wrote the real service_bookings row with
// customer_email set correctly -- fetch it back by the returned order_id so
// the email has the actual confirmed date/time, and pair it with the
// service's structured location (added in 0021_wellness_hub_fixes.sql) so
// the customer actually sees where/how to show up. Best-effort: the booking
// itself is already paid for, so a failed email must never surface as an
// error to the customer.
async function sendWellnessBookingConfirmation(checkoutResult, service) {
  try {
    const orderId = checkoutResult?.order_id;
    if (!orderId) return;
    const booking = await base44.entities.ServiceBooking.get(orderId);
    if (!booking?.customer_email) return;

    const when = booking.booking_date
      ? `${booking.booking_date}${booking.booking_time ? ` at ${booking.booking_time}` : ""}`
      : "a time to be confirmed with your provider";

    const body = `
      <p>Your booking for <strong>${service.title}</strong> with ${service.provider_name || "your provider"} is confirmed.</p>
      <p><strong>When:</strong> ${when}</p>
      <p><strong>Where:</strong> ${locationLabel(service)}</p>
      <p><strong>Total paid:</strong> $${Number(booking.total_price || 0).toFixed(2)}</p>
    `;

    await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: booking.customer_email, subject: "Your wellness booking is confirmed", body }),
    });
  } catch (err) {
    console.error("Failed to send wellness booking confirmation email:", err);
  }
}

const wellnessCategories = [
  { id: "acupuncture", label: "Acupuncture", icon: Activity, color: "from-green-500 to-emerald-500" },
  { id: "chiropractic", label: "Chiropractic Care", icon: Activity, color: "from-blue-500 to-cyan-500" },
  { id: "orthodontics", label: "Orthodontics", icon: Activity, color: "from-purple-500 to-indigo-500" },
  { id: "physical_therapy", label: "Physical Therapy", icon: Activity, color: "from-orange-500 to-amber-500" },
  { id: "mental_health_counseling", label: "Mental Health", icon: Heart, color: "from-pink-500 to-rose-500" },
  { id: "nutrition_counseling", label: "Nutrition", icon: Activity, color: "from-yellow-500 to-orange-500" },
  { id: "massage_therapy", label: "Massage Therapy", icon: Heart, color: "from-teal-500 to-cyan-500" },
  { id: "wellness", label: "General Wellness", icon: Activity, color: "from-lime-500 to-green-500" },
  { id: "yoga_meditation", label: "Yoga & Meditation", icon: Activity, color: "from-violet-500 to-purple-500" },
  { id: "rehab", label: "Rehabilitation", icon: Heart, color: "from-red-500 to-orange-500" },
  { id: "physical_rehabilitation", label: "Physical Rehab", icon: Activity, color: "from-indigo-500 to-blue-500" },
  { id: "substance_abuse_counseling", label: "Substance Abuse Support", icon: Heart, color: "from-rose-500 to-pink-500" },
  { id: "occupational_therapy", label: "Occupational Therapy", icon: Activity, color: "from-cyan-500 to-teal-500" },
  { id: "speech_therapy", label: "Speech Therapy", icon: MessageSquare, color: "from-amber-500 to-yellow-500" },
  { id: "injury_care", label: "Injury Care", icon: Heart, color: "from-red-600 to-rose-600" },
  { id: "senior_care", label: "Senior Care", icon: Users, color: "from-orange-600 to-amber-600" },
  { id: "elder_care", label: "Elder Care", icon: Users, color: "from-yellow-600 to-orange-600" },
  { id: "hospice_care", label: "Hospice Care", icon: Heart, color: "from-purple-600 to-pink-600" },
  { id: "home_healthcare", label: "Home Healthcare", icon: Home, color: "from-teal-600 to-cyan-600" },
  { id: "mobility_assistance", label: "Mobility Assistance", icon: Activity, color: "from-blue-600 to-indigo-600" },
  { id: "medical_equipment_rental", label: "Medical Equipment", icon: Package, color: "from-gray-500 to-slate-500" },
  { id: "shelter_services", label: "Shelter Services", icon: Home, color: "from-emerald-600 to-green-600" },
  { id: "medical_health", label: "Medical & Health", icon: Heart, color: "from-red-500 to-pink-500" }
];

export default function Wellness() {
  const navigate = useNavigate();
  const { userCity, refreshLocation } = useUserLocation();
  const [locationCity, setLocationCity] = useState("");
  const [locationRadius, setLocationRadius] = useState(null);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [chatService, setChatService] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  // For the radius filter to do real distance math (rather than being
  // decorative) we need the customer's coordinates, mirroring how
  // UnifiedBookingModal already asks for GPS to price delivery.
  useEffect(() => {
    if (!locationRadius || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
      () => setUserCoords(null),
      { timeout: 5000 }
    );
  }, [locationRadius]);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['wellness-services'],
    queryFn: async () => {
      try {
        const allItems = await base44.entities.MarketplaceItem.list();
        const wellnessCategoryIds = wellnessCategories.map(c => c.id);
        return allItems.filter(item => wellnessCategoryIds.includes(item.category));
      } catch (err) {
        console.log("Error loading wellness services:", err);
        return [];
      }
    },
    initialData: []
  });

  const { data: providerVerifications = {} } = useQuery({
    queryKey: ['provider-verifications-wellness'],
    queryFn: async () => {
      try {
        const verifications = await base44.entities.ProviderVerification.filter({
          status: "verified"
        });
        const map = {};
        verifications.forEach(v => {
          if (!map[v.provider_email]) {
            map[v.provider_email] = [];
          }
          map[v.provider_email].push(v);
        });
        return map;
      } catch {
        return {};
      }
    },
    initialData: {}
  });

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.provider_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !locationCity || (() => {
      const q = locationCity.toLowerCase();
      const hay = [service.location, service.service_area].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    })();
    // Radius filter: only actually excludes a service once we have both the
    // customer's coordinates and the service's (latitude/longitude, added in
    // 0021_wellness_hub_fixes.sql). A service with no coordinates yet always
    // passes rather than being hidden — same "don't strand un-located items"
    // rule useUserLocation.js's filterByLocation already uses.
    const matchesRadius = !locationRadius || !userCoords || service.latitude == null || service.longitude == null || (
      haversineMiles(userCoords[0], userCoords[1], service.latitude, service.longitude) <= locationRadius
    );
    return matchesCategory && matchesSearch && matchesLocation && matchesRadius;
  });

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-teal-950 to-green-950">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/50 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-8 pt-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
            <Activity className="w-10 h-10 text-green-400" />
            Health & Wellness
          </h1>
          <p className="text-gray-300 text-lg mb-4">
            Comprehensive healthcare and wellness services
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search health services, providers..."
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 transition backdrop-blur-xl"
            />
          </div>
        </div>
      </div>

      {/* List Your Service CTA */}
      <div className="px-6 mb-4">
        <div className="bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-green-500/30 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-bold text-lg mb-1">Are you a Health & Wellness Provider?</h3>
            <p className="text-gray-300 text-sm">List your services, set your prices, and start receiving bookings today.</p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full text-white font-semibold transition"
          >
            <Plus className="w-5 h-5" />
            List My Service
          </button>
        </div>
      </div>

      {/* Trust & Safety Banner */}
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1">Verified Health Professionals</h3>
              <p className="text-gray-300 text-sm">
                All providers are verified • Licensed professionals • Background checked • Insured & certified
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Give Back CTA */}
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Support Community Health</h3>
              <p className="text-gray-300 text-sm">
                Help families in need, rehab services, and senior care programs
              </p>
            </div>
            <button
              onClick={() => navigate(createPageUrl("GiveBack"))}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-semibold transition flex items-center gap-2"
            >
              <Heart className="w-5 h-5" />
              Give Back
            </button>
          </div>
        </div>
      </div>

      {/* Location Filter */}
      <div className="px-6">
        <LocationFilter
          cityValue={locationCity}
          onCityChange={setLocationCity}
          radiusValue={locationRadius}
          onRadiusChange={setLocationRadius}
          userCity={userCity}
          accentColor="green"
          onOpenCitySettings={() => setShowCitySelector(true)}
        />
      </div>

      {/* Category Filters */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition ${
              selectedCategory === "all"
                ? "bg-green-500 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            All Services
          </button>
          {wellnessCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                selectedCategory === cat.id
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-6">
        <p className="text-gray-300 mb-6">
          {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} available
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredServices.map((service, idx) => {
              // ProviderVerification rows are keyed by provider_email (that's
              // what the onboarding modal writes and what the map below is
              // built from), but this used to look them up by
              // service.created_by -- a column MarketplaceItem.create()
              // never actually populated, so verificationCount was always 0
              // and the "N License(s)" badge could never render even for a
              // fully verified provider.
              const providerVers = providerVerifications[service.provider_email || service.created_by] || [];
              const verificationCount = providerVers.length;
              const trustScore = service.verified_provider ? 95 : 75;

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group cursor-pointer"
                >
                  <div className="relative h-80 rounded-3xl overflow-hidden bg-gray-900">
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Verification Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {service.verified_provider && (
                        <div className="px-3 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified • {trustScore}%
                        </div>
                      )}
                      {verificationCount > 0 && (
                        <div className="px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {verificationCount} License{verificationCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {service.instant_booking && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                        Instant Booking
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-sm font-medium">{service.rating}</span>
                        <span className="text-gray-300 text-sm">({service.reviews_count || 0})</span>
                        <span className="text-gray-300 text-sm">•</span>
                        <span className="text-gray-300 text-sm capitalize">
                          {service.availability}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-300 transition">
                        {service.title}
                      </h3>

                      <p className="text-gray-300 text-sm mb-3">
                        by {service.provider_name}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400 text-xs mb-3">
                        {service.response_time && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Responds in {service.response_time}
                          </span>
                        )}
                        {service.duration_minutes && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {service.duration_minutes} min
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          {locationLabel(service)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-2 text-white">
                            <span className="text-2xl font-bold">${service.price}</span>
                            <span className="text-sm text-gray-400">/{service.price_type}</span>
                          </div>
                          {service.price_in_soflo && (
                            <span className="text-sm text-green-300">
                              or {service.price_in_soflo} SFC
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
                            title="Message Provider"
                            onClick={e => { e.stopPropagation(); setChatService(service); }}
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          <button
                            className="px-6 py-3 bg-green-500 rounded-full text-white font-semibold hover:bg-green-600 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookingService(service);
                            }}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredServices.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No services found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery ? `No results for "${searchQuery}"` : "Be the first to list a wellness service!"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-full text-white font-semibold transition"
              >
                List My Service
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOnboarding && (
          <WellnessProviderOnboardingModal onClose={() => setShowOnboarding(false)} />
        )}
        {chatService && (
          <WellnessChatModal service={chatService} onClose={() => setChatService(null)} />
        )}
        {bookingService && (
          <UnifiedBookingModal
            isOpen={!!bookingService}
            onClose={() => setBookingService(null)}
            provider={{
              email: bookingService.provider_email || bookingService.created_by,
              full_name: bookingService.provider_name,
              provider_business_name: bookingService.provider_name,
              location: locationLabel(bookingService),
            }}
            item={bookingService}
            orderType="service_booking"
            onSuccess={(data) => sendWellnessBookingConfirmation(data, bookingService)}
          />
        )}
        {showCitySelector && (
          <CitySelector
            user={{ city: userCity }}
            onClose={() => setShowCitySelector(false)}
            onSaved={() => { refreshLocation(); setShowCitySelector(false); }}
          />
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
    </PageWrapper>
  );
}