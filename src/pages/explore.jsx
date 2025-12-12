import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Star, MapPin, Clock, ChevronLeft, Sparkles, X,
  Heart, SlidersHorizontal, Search, Calendar,
  DollarSign, Users, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SwipeableCard from "../components/SwipeableCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Explore() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    category: "all",
    priceRange: "all",
    tier: "all",
    availability: "all",
    sortBy: "rating"
  });

  // Booking form
  const [bookingForm, setBookingForm] = useState({
    booking_date: "",
    number_of_guests: 1,
    payment_method: "card",
    special_requests: ""
  });

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: async () => {
      try {
        return await base44.entities.Experience.list();
      } catch (err) {
        console.log("Error loading experiences:", err);
        return [];
      }
    },
    initialData: [],
    retry: 1
  });

  const saveExperienceMutation = useMutation({
    mutationFn: async (experienceId) => {
      const savedExperiences = currentUser?.saved_experiences || [];
      const isSaved = savedExperiences.includes(experienceId);
      
      const updated = isSaved
        ? savedExperiences.filter(id => id !== experienceId)
        : [...savedExperiences, experienceId];

      await base44.auth.updateMe({ saved_experiences: updated });
      return { experienceId, isSaved: !isSaved };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      base44.auth.me().then(setCurrentUser);
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData) => {
      // Generate confirmation code
      const confirmationCode = `PSF${Date.now().toString(36).toUpperCase()}`;
      
      const booking = await base44.entities.Booking.create({
        ...bookingData,
        confirmation_code: confirmationCode,
        booking_status: "confirmed",
        payment_status: "paid"
      });

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: bookingData.total_price_usd,
        amount_rri: bookingData.total_price_soflo || 0,
        method: bookingData.payment_method,
        status: "completed",
        reference_type: "order",
        reference_id: booking.id,
        memo: `Booking for ${bookingData.experience_title}`
      });

      return booking;
    },
    onSuccess: (booking) => {
      setShowBooking(false);
      setSelectedExperience(null);
      alert(`Booking confirmed! Your confirmation code is: ${booking.confirmation_code}`);
    }
  });

  // Apply filters and search
  const filteredExperiences = experiences.filter(exp => {
    // Search
    if (searchQuery && !exp.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !exp.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filters.category !== "all" && exp.category !== filters.category) {
      return false;
    }

    // Price range filter
    if (filters.priceRange !== "all") {
      const price = exp.price;
      if (filters.priceRange === "under500" && price >= 500) return false;
      if (filters.priceRange === "500-1000" && (price < 500 || price > 1000)) return false;
      if (filters.priceRange === "1000-3000" && (price < 1000 || price > 3000)) return false;
      if (filters.priceRange === "over3000" && price < 3000) return false;
    }

    // Tier filter
    if (filters.tier !== "all" && exp.tier_required !== filters.tier) {
      return false;
    }

    // Availability filter
    if (filters.availability !== "all" && exp.availability !== filters.availability) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort
    if (filters.sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (filters.sortBy === "price_low") return (a.price || 0) - (b.price || 0);
    if (filters.sortBy === "price_high") return (b.price || 0) - (a.price || 0);
    return 0;
  });

  const handleSwipe = (direction) => {
    if (direction === 'right') {
      const exp = filteredExperiences[currentIndex];
      if (exp) {
        saveExperienceMutation.mutate(exp.id);
      }
    }
    
    const nextIndex = (currentIndex + 1) % filteredExperiences.length;
    setCurrentIndex(nextIndex);
  };

  const handleBooking = () => {
    if (!selectedExperience || !bookingForm.booking_date) {
      alert("Please select a date for your experience");
      return;
    }

    const useSoflo = bookingForm.payment_method === "soflocoin";
    createBookingMutation.mutate({
      experience_id: selectedExperience.id,
      experience_title: selectedExperience.title,
      booking_date: bookingForm.booking_date,
      number_of_guests: bookingForm.number_of_guests,
      total_price_usd: selectedExperience.price * bookingForm.number_of_guests,
      total_price_soflo: useSoflo ? selectedExperience.price_in_soflo * bookingForm.number_of_guests : 0,
      payment_method: bookingForm.payment_method,
      special_requests: bookingForm.special_requests,
      provider_email: selectedExperience.created_by
    });
  };

  const getVisibleCards = () => {
    const visible = [];
    if (!filteredExperiences || filteredExperiences.length === 0) return [];
    for (let i = 0; i < Math.min(3, filteredExperiences.length); i++) {
      const index = (currentIndex + i) % filteredExperiences.length;
      visible.push({
        index,
        experience: filteredExperiences[index],
        stackIndex: i
      });
    }
    return visible;
  };

  const visibleCards = getVisibleCards();
  const isSaved = (expId) => currentUser?.saved_experiences?.includes(expId);

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex items-center gap-4">
        <button
          onClick={() => navigate(createPageUrl("Universe"))}
          className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experiences..."
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
        >
          <SlidersHorizontal className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="absolute top-0 right-0 h-full w-80 bg-gray-900 border-l border-white/10 z-50 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Filters</h3>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Category</label>
                <Select value={filters.category} onValueChange={(v) => setFilters({...filters, category: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="exotic_cars">Exotic Cars</SelectItem>
                    <SelectItem value="yachts">Yachts</SelectItem>
                    <SelectItem value="wine_tasting">Wine Tasting</SelectItem>
                    <SelectItem value="nightlife">Nightlife</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="fine_dining">Fine Dining</SelectItem>
                    <SelectItem value="exclusive_events">Exclusive Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Price Range</label>
                <Select value={filters.priceRange} onValueChange={(v) => setFilters({...filters, priceRange: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under500">Under $500</SelectItem>
                    <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                    <SelectItem value="1000-3000">$1,000 - $3,000</SelectItem>
                    <SelectItem value="over3000">Over $3,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Membership Tier</label>
                <Select value={filters.tier} onValueChange={(v) => setFilters({...filters, tier: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                    <SelectItem value="centurion">Centurion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Sort By</label>
                <Select value={filters.sortBy} onValueChange={(v) => setFilters({...filters, sortBy: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setFilters({ category: "all", priceRange: "all", tier: "all", availability: "all", sortBy: "rating" })}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      {!isLoading && filteredExperiences.length > 0 && (
        <div className="h-full pt-24 pb-32 px-4 md:px-8">
          <div className="relative w-full h-full max-w-2xl mx-auto" style={{ perspective: "1500px" }}>
            {visibleCards.map((card) => (
              <SwipeableCard
                key={card.index}
                index={card.stackIndex}
                active={card.stackIndex === 0}
                onSwipe={card.stackIndex === 0 ? handleSwipe : undefined}
              >
                <div 
                  className="relative w-full h-full overflow-hidden rounded-3xl shadow-2xl cursor-grab active:cursor-grabbing bg-gray-900"
                  onClick={() => card.stackIndex === 0 && setSelectedExperience(card.experience)}
                >
                  <img 
                    src={card.experience.image_url} 
                    alt={card.experience.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  <div className="absolute top-6 right-6 flex gap-2">
                    {card.experience.tier_required && card.experience.tier_required !== "standard" && (
                      <div className="px-4 py-2 bg-yellow-500 rounded-full text-xs font-bold text-black shadow-lg flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        {card.experience.tier_required.toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveExperienceMutation.mutate(card.experience.id);
                      }}
                      className={`p-3 backdrop-blur-xl rounded-full transition ${
                        isSaved(card.experience.id)
                          ? "bg-red-500 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isSaved(card.experience.id) ? "fill-white" : ""}`} />
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-full border border-white/30">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-sm font-bold">{card.experience.rating}</span>
                      </div>
                      <span className="px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-full text-white text-sm font-medium border border-white/30 capitalize">
                        {card.experience.category.replace(/_/g, ' ')}
                      </span>
                      <span className="px-3 py-1.5 bg-green-500/30 backdrop-blur-xl rounded-full text-green-300 text-sm font-bold border border-green-400/30 capitalize">
                        {card.experience.availability}
                      </span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-2xl">
                      {card.experience.title}
                    </h2>

                    <p className="text-lg text-gray-200 mb-6 line-clamp-2 drop-shadow-lg">
                      {card.experience.description}
                    </p>

                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="flex items-center gap-2 text-white">
                        <MapPin className="w-5 h-5" />
                        <span className="font-medium">{card.experience.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white">
                        <Clock className="w-5 h-5" />
                        <span className="font-medium">{card.experience.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30">
                      <div>
                        <p className="text-white/80 text-sm mb-1">From</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-white">
                            ${card.experience.price.toLocaleString()}
                          </span>
                          {card.experience.price_in_soflo && (
                            <span className="text-lg text-purple-300">
                              or {card.experience.price_in_soflo} SFC
                            </span>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExperience(card.experience);
                          setShowBooking(true);
                        }}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white font-bold hover:scale-105 transition-transform shadow-xl"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>
        </div>
      )}

      {/* Swipe Actions */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50">
        <button
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 bg-red-500/20 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-red-500/30 transition border-2 border-red-500/50 shadow-xl"
        >
          <X className="w-8 h-8 text-red-500" />
        </button>

        <button
          onClick={() => filteredExperiences[currentIndex] && setSelectedExperience(filteredExperiences[currentIndex])}
          className="w-20 h-20 bg-blue-500/20 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-blue-500/30 transition border-2 border-blue-500/50 shadow-xl"
        >
          <span className="text-3xl">ℹ️</span>
        </button>

        <button
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 bg-green-500/20 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-green-500/30 transition border-2 border-green-500/50 shadow-xl"
        >
          <Heart className="w-8 h-8 text-green-500" />
        </button>
      </div>

      {/* Counter */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 z-40">
        <span className="text-white font-bold">
          {currentIndex + 1} / {filteredExperiences.length}
        </span>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && selectedExperience && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowBooking(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-64">
                <img 
                  src={selectedExperience.image_url} 
                  alt={selectedExperience.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                <button
                  onClick={() => setShowBooking(false)}
                  className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white/30 transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-8">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Book {selectedExperience.title}
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Select Date
                    </label>
                    <Input
                      type="date"
                      value={bookingForm.booking_date}
                      onChange={(e) => setBookingForm({...bookingForm, booking_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Number of Guests
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={bookingForm.number_of_guests}
                      onChange={(e) => setBookingForm({...bookingForm, number_of_guests: parseInt(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Payment Method
                    </label>
                    <Select value={bookingForm.payment_method} onValueChange={(v) => setBookingForm({...bookingForm, payment_method: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="soflocoin">SoFloCoin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">
                      Special Requests (Optional)
                    </label>
                    <Input
                      placeholder="Any special requests or notes..."
                      value={bookingForm.special_requests}
                      onChange={(e) => setBookingForm({...bookingForm, special_requests: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Price per person</span>
                      <span className="text-white font-semibold">
                        ${selectedExperience.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Guests</span>
                      <span className="text-white font-semibold">×{bookingForm.number_of_guests}</span>
                    </div>
                    <div className="border-t border-white/10 my-4" />
                    <div className="flex justify-between">
                      <span className="text-white text-xl font-bold">Total</span>
                      <div className="text-right">
                        <div className="text-white text-2xl font-bold">
                          ${(selectedExperience.price * bookingForm.number_of_guests).toLocaleString()}
                        </div>
                        {bookingForm.payment_method === "soflocoin" && selectedExperience.price_in_soflo && (
                          <div className="text-purple-400 text-sm">
                            or {selectedExperience.price_in_soflo * bookingForm.number_of_guests} SFC
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleBooking}
                    disabled={!bookingForm.booking_date || createBookingMutation.isLoading}
                    className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-xl font-bold rounded-2xl"
                  >
                    {createBookingMutation.isLoading ? (
                      "Processing..."
                    ) : (
                      <>
                        <CheckCircle className="w-6 h-6 mr-2" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal (existing) */}
      <AnimatePresence>
        {selectedExperience && !showBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedExperience(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-80">
                <img 
                  src={selectedExperience.image_url} 
                  alt={selectedExperience.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                <button
                  onClick={() => setSelectedExperience(null)}
                  className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-xl rounded-full hover:bg-white/30 transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-8">
                <h2 className="text-4xl font-bold text-white mb-4">
                  {selectedExperience.title}
                </h2>
                <p className="text-gray-300 mb-6 text-lg">
                  {selectedExperience.description}
                </p>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-5 h-5" />
                    {selectedExperience.location}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-5 h-5" />
                    {selectedExperience.duration}
                  </div>
                </div>

                <button 
                  onClick={() => setShowBooking(true)}
                  className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white text-xl font-bold hover:scale-105 transition-transform glow-effect"
                >
                  Book for ${selectedExperience.price.toLocaleString()}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}