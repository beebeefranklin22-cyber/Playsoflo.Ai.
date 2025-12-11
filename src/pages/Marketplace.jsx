import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Star, Clock, ChevronLeft, Sparkles, ShoppingBag,
  Scissors, Home, Package, ChefHat, Car, Building,
  Briefcase, Hammer, Heart, Camera, TrendingUp,
  Calculator, Users, Truck, PawPrint, BookOpen,
  Dumbbell, Monitor, Check, Music, Palette, Video,
  Shield, Leaf, Droplet, Bug, Sofa, ShoppingCart,
  Utensils, Baby, Heart as HeartIcon, Wrench,
  Smartphone, Zap, Droplets, Paintbrush, Wind,
  Eye, Waves, Trash2, Key, FileText, DollarSign,
  FileCheck, Plane, MessageSquare, Target, Palette as PaletteIcon,
  Activity, Dumbbell as DumbbellIcon, Search, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BookingModal from "../components/BookingModal";

const categories = [
  { id: "all", label: "All Services", icon: ShoppingBag },
  
  // Food & Delivery (Featured at top)
  { id: "restaurant", label: "Restaurants & Delivery", icon: Utensils },
  { id: "food_truck", label: "Food Trucks", icon: Truck },
  { id: "groceries", label: "Groceries Delivery", icon: ShoppingCart },

  // Insurance & Protection
  { id: "health_insurance", label: "Health Insurance", icon: Shield },
  { id: "car_insurance", label: "Car Insurance", icon: Car },
  { id: "home_insurance", label: "Home Insurance", icon: Home },
  { id: "life_insurance", label: "Life Insurance", icon: Shield },
  { id: "bail_bonding", label: "Bail Bonds", icon: Shield },

  // Beauty & Personal Care
  { id: "barber_beauty", label: "Barber & Beauty", icon: Scissors },
  { id: "hair_extensions", label: "Hair Extensions", icon: Scissors },
  { id: "hair_makeup", label: "Hair & Makeup", icon: Sparkles },

  // Home Services
  { id: "home_services", label: "Home Services", icon: Home },
  { id: "cleaning", label: "Cleaning", icon: Sparkles },
  { id: "landscaping", label: "Landscaping", icon: Leaf },
  { id: "pool_maintenance", label: "Pool Service", icon: Droplet },
  { id: "pest_control", label: "Pest Control", icon: Bug },
  { id: "plumbing", label: "Plumbing", icon: Droplets },
  { id: "electrical", label: "Electrical", icon: Zap },
  { id: "hvac", label: "HVAC", icon: Wind },
  { id: "roofing", label: "Roofing", icon: Home },
  { id: "painting", label: "Painting", icon: Paintbrush },
  { id: "window_cleaning", label: "Window Cleaning", icon: Eye },
  { id: "pressure_washing", label: "Pressure Washing", icon: Waves },
  { id: "junk_removal", label: "Junk Removal", icon: Trash2 },
  { id: "locksmith", label: "Locksmith", icon: Key },

  // Food & Hospitality
  { id: "personal_chef", label: "Personal Chef", icon: ChefHat },
  { id: "catering", label: "Catering", icon: Utensils },

  // Transportation
  { id: "chauffeur", label: "Chauffeur", icon: Car },
  { id: "moving_services", label: "Moving", icon: Truck },

  // Real Estate & Property
  { id: "property_rental", label: "Property Rental", icon: Building },
  { id: "real_estate", label: "Real Estate", icon: Building },
  { id: "interior_design", label: "Interior Design", icon: Sofa },

  // Professional Services
  { id: "legal_services", label: "Legal", icon: Briefcase },
  { id: "accounting", label: "Accounting", icon: Calculator },
  { id: "consulting", label: "Consulting", icon: TrendingUp },
  { id: "financial_planning", label: "Financial Planning", icon: DollarSign },
  { id: "tax_preparation", label: "Tax Prep", icon: FileCheck },
  { id: "insurance", label: "Insurance (General)", icon: Shield },
  { id: "notary", label: "Notary", icon: FileText },
  { id: "private_investigation", label: "Private Investigation", icon: Search },

  // Construction & Trades
  { id: "construction", label: "Construction", icon: Hammer },
  { id: "automotive", label: "Automotive", icon: Car },

  // Events & Entertainment
  { id: "wedding_planning", label: "Wedding Planning", icon: Heart },
  { id: "event_planning", label: "Event Planning", icon: Users },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "video_production", label: "Video Production", icon: Video },
  { id: "dj_entertainment", label: "DJ & Entertainment", icon: Music },
  { id: "equipment_rental", label: "Equipment Rental", icon: Package },

  // Creative Services
  { id: "graphic_design", label: "Graphic Design", icon: Palette },
  { id: "marketing", label: "Marketing", icon: TrendingUp },

  // Education & Coaching
  { id: "tutoring", label: "Tutoring", icon: BookOpen },
  { id: "music_lessons", label: "Music Lessons", icon: Music },
  { id: "art_classes", label: "Art Classes", icon: PaletteIcon },
  { id: "fitness_training", label: "Fitness Training", icon: DumbbellIcon },
  { id: "sports_coaching", label: "Sports Coaching", icon: Target },
  { id: "life_coaching", label: "Life Coaching", icon: MessageSquare },
  { id: "career_coaching", label: "Career Coaching", icon: Briefcase },

  // Care Services
  { id: "childcare", label: "Childcare", icon: Baby },
  { id: "pet_services", label: "Pet Services", icon: PawPrint },

  // Tech & Digital
  { id: "tech_support", label: "Tech Support", icon: Monitor },
  { id: "computer_repair", label: "Computer Repair", icon: Monitor },
  { id: "virtual_assistant", label: "Virtual Assistant", icon: Users },

  // Other Services
  { id: "concierge", label: "Concierge", icon: Sparkles },
  { id: "luxury_goods", label: "Luxury Goods", icon: Package },
  { id: "personal_shopping", label: "Personal Shopping", icon: ShoppingCart },
  { id: "tailoring", label: "Tailoring", icon: Scissors },
  { id: "jewelry_repair", label: "Jewelry Repair", icon: Sparkles },
  { id: "translation", label: "Translation", icon: MessageSquare },
  { id: "security_services", label: "Security", icon: Shield },
  { id: "travel_planning", label: "Travel Planning", icon: Plane },
];

export default function Marketplace() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['marketplace-items'],
    queryFn: async () => {
      try {
        return await base44.entities.MarketplaceItem.list();
      } catch (err) {
        console.log("Error loading marketplace items:", err);
        return [];
      }
    },
    initialData: [],
    retry: 1
  });

  // Add query for provider verifications
  const { data: providerVerifications = {} } = useQuery({
    queryKey: ['provider-verifications-map'],
    queryFn: async () => {
      try {
        const verifications = await base44.entities.ProviderVerification.filter({
          status: "verified"
        });
        // Create a map of provider_email -> verification count
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

  // Filter out wellness categories
  const wellnessCategoryIds = [
    "acupuncture", "chiropractic", "orthodontics", "physical_therapy",
    "mental_health_counseling", "nutrition_counseling", "massage_therapy",
    "wellness", "yoga_meditation", "rehab", "physical_rehabilitation",
    "substance_abuse_counseling", "occupational_therapy", "speech_therapy",
    "injury_care", "senior_care", "elder_care", "hospice_care",
    "home_healthcare", "mobility_assistance", "medical_equipment_rental",
    "shelter_services", "medical_health"
  ];

  const filteredItems = items.filter(item => {
    // Exclude wellness categories
    if (wellnessCategoryIds.includes(item.category)) {
      return false;
    }
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group items by service/title to show multiple providers
  const groupedByService = filteredItems.reduce((acc, item) => {
    if (!acc[item.title]) {
      acc[item.title] = [];
    }
    acc[item.title].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950 to-gray-950 pb-20">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/50 to-transparent" />
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(createPageUrl("Universe"))}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-6 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Marketplace
          </h1>
          <p className="text-gray-300 text-lg mb-4">
            60+ service categories - find anything you need
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services, providers..."
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition backdrop-blur-xl"
            />
          </div>
        </div>
      </div>

      {/* Featured: Food Delivery Section */}
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-r from-green-500/10 to-orange-500/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <Utensils className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Food & Grocery Delivery</h3>
              <p className="text-gray-300 text-sm">Order from restaurants, food trucks, and grocery stores</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedCategory("restaurant")}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition"
            >
              <Utensils className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <span className="text-white text-sm font-medium">Restaurants</span>
            </button>
            <button
              onClick={() => setSelectedCategory("food_truck")}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition"
            >
              <Truck className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <span className="text-white text-sm font-medium">Food Trucks</span>
            </button>
            <button
              onClick={() => setSelectedCategory("groceries")}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition"
            >
              <ShoppingCart className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <span className="text-white text-sm font-medium">Groceries</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trust & Safety Banner */}
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1">Trust & Safety Protection</h3>
              <p className="text-gray-300 text-sm">
                • All providers verified • AI fraud detection • Escrow-backed payments • 24/7 monitoring • Report suspicious activity
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                selectedCategory === cat.id
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-300">
            {filteredItems.length} service{filteredItems.length !== 1 ? 's' : ''} available
          </p>
          <button 
            onClick={() => navigate(createPageUrl("ProviderHub"))}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-full text-white font-semibold hover:scale-105 transition-transform"
          >
            Become a Provider
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const isFood = ["restaurant", "food_truck", "groceries"].includes(item.category);
              const trustScore = item.verified_provider ? 95 : 75;
              const providerVers = providerVerifications[item.created_by] || [];
              const verificationCount = providerVers.length;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group cursor-pointer"
                >
                  <div className="relative h-80 rounded-3xl overflow-hidden bg-gray-900">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Enhanced Verification Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {item.verified_provider && (
                        <div className="px-3 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Verified • Trust {trustScore}%
                        </div>
                      )}
                      {verificationCount > 0 && (
                        <div className="px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {verificationCount} Credential{verificationCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {item.instant_booking && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                        Instant Booking
                      </div>
                    )}

                    {item.escrow_required && !isFood && (
                      <div className="absolute top-12 right-4 px-3 py-1 bg-emerald-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Escrow Protected
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-sm font-medium">{item.rating}</span>
                        <span className="text-gray-300 text-sm">({item.reviews_count || 0})</span>
                        <span className="text-gray-300 text-sm">•</span>
                        <span className="text-gray-300 text-sm capitalize">
                          {item.availability}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-300 transition">
                        {item.title}
                      </h3>

                      <p className="text-gray-300 text-sm mb-2">
                        by {item.provider_name}
                      </p>

                      {/* Multiple Providers Indicator */}
                      {groupedByService[item.title]?.length > 1 && (
                        <div className="mb-2">
                          <span className="text-orange-400 text-xs font-semibold">
                            +{groupedByService[item.title].length - 1} more provider{groupedByService[item.title].length > 2 ? 's' : ''} available
                          </span>
                        </div>
                      )}

                      {item.response_time && (
                        <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                          <Clock className="w-3 h-3" />
                          Responds in {item.response_time}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-2 text-white">
                            <span className="text-2xl font-bold">${item.price}</span>
                            <span className="text-sm text-gray-400">/{item.price_type}</span>
                          </div>
                          {item.price_in_soflo && (
                            <span className="text-sm text-orange-300">
                              or {item.price_in_soflo} SFC
                            </span>
                          )}
                        </div>

                        {!isFood ? (
                          groupedByService[item.title]?.length > 1 ? (
                            <button
                              className="px-6 py-3 bg-purple-500 rounded-full text-white font-semibold hover:bg-purple-600 transition flex items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(createPageUrl("ServiceProviders") + `?service=${encodeURIComponent(item.title)}`);
                              }}
                            >
                              <Users className="w-4 h-4" />
                              Compare
                            </button>
                          ) : (
                            <button
                              className="px-6 py-3 bg-orange-500 rounded-full text-white font-semibold hover:bg-orange-600 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedService(item);
                                setShowBookingModal(true);
                              }}
                            >
                              Book Now
                            </button>
                          )
                        ) : (
                          <button
                            className="px-6 py-3 bg-green-600 rounded-full text-white font-semibold hover:bg-green-700 transition"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const order = await base44.entities.Order.create({
                                order_type: item.category,
                                item_id: String(item.id),
                                item_title: item.title,
                                quantity: 1,
                                total_usd: item.price,
                                pickup: false,
                                status: "pending",
                                provider_email: item.created_by || ""
                              });
                              await base44.entities.Payment.create({
                                amount_usd: item.price,
                                method: "rri",
                                status: "completed",
                                reference_type: "order",
                                reference_id: String(order.id),
                                memo: `Order for ${item.title}`
                              });
                              alert("✅ Order placed! You'll receive updates.");
                            }}
                          >
                            Order Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No services found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery ? `No results for "${searchQuery}"` : "Try selecting a different category"}
            </p>
            <button className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-full text-white font-bold hover:scale-105 transition-transform">
              Be the First Provider in This Category
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedService(null);
          }}
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}