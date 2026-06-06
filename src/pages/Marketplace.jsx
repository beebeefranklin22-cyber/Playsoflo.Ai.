import React, { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Star, Clock, ChevronLeft, Sparkles, ShoppingBag, MapPin,
  Scissors, Home, Package, ChefHat, Car, Building,
  Briefcase, Hammer, Heart, Camera, TrendingUp,
  Calculator, Users, Truck, PawPrint, BookOpen,
  Dumbbell, Monitor, Check, Music, Palette, Video,
  Shield, Leaf, Droplet, Bug, Sofa, ShoppingCart,
  Utensils, Baby, Heart as HeartIcon, Wrench,
  Smartphone, Zap, Droplets, Paintbrush, Wind,
  Eye, Waves, Trash2, Key, FileText, DollarSign,
  FileCheck, Plane, MessageSquare, Target, Palette as PaletteIcon,
  Activity, Dumbbell as DumbbellIcon, Search, ShieldCheck, SlidersHorizontal, X, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BookingModal from "../components/BookingModal";
import QuickBookingFlow from "../components/booking/QuickBookingFlow";
import StripePaymentForm from "../components/payment/StripePaymentForm";
import AdvancedFilters from "../components/marketplace/AdvancedFilters";
import LocationFilter from "../components/location/LocationFilter";
import CitySelector from "../components/location/CitySelector";
import { useUserLocation, filterByLocation } from "../hooks/useUserLocation";
import { useGeoDistance } from "../hooks/useGeoDistance";
import ListItemModal from "../components/marketplace/ListItemModal";
import MessageProviderButton from "../components/provider/MessageProviderButton";
import LuxuryBookingModal from "../components/marketplace/LuxuryBookingModal";
import EcommerceOrderModal from "../components/marketplace/EcommerceOrderModal";

const categories = [
  { id: "all", label: "All Services", icon: ShoppingBag },

  // Shop Products
  { id: "clothing_retail", label: "Clothing & Apparel", icon: ShoppingBag },
  { id: "luxury_goods", label: "Shop Products", icon: Package },
  
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
  const queryClient = useQueryClient();
  const { userCity, refreshLocation } = useUserLocation();
  const { userCoords, distanceTo } = useGeoDistance();
  const [locationCity, setLocationCity] = useState("");
  const [locationRadius, setLocationRadius] = useState(null);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [showLuxuryBooking, setShowLuxuryBooking] = useState(false);
  const [luxuryItem, setLuxuryItem] = useState(null);
  const [showEcommerceOrder, setShowEcommerceOrder] = useState(false);
  const [ecommerceItem, setEcommerceItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filters, setFilters] = useState({
    priceRange: [0, 10000],
    minRating: null,
    availability: null,
    verification: null,
    serviceArea: null,
    instantBooking: false,
    escrowProtected: false,
    availabilitySlots: null,
    amenities: []
  });

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['marketplace-items'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-properties'] }),
      queryClient.invalidateQueries({ queryKey: ['marketplace-p2p'] })
    ]);
  };

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
    retry: 1,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 120000
  });

  // Also fetch properties and show in marketplace
  const { data: properties = [] } = useQuery({
    queryKey: ['marketplace-properties'],
    queryFn: async () => {
      try {
        return await base44.entities.Property.list();
      } catch (err) {
        console.log("Error loading properties:", err);
        return [];
      }
    },
    initialData: [],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 120000
  });

  // Fetch inventory products from all stores
  const { data: inventoryProducts = [] } = useQuery({
    queryKey: ['marketplace-inventory'],
    queryFn: async () => {
      try {
        return await base44.entities.InventoryProduct.filter({ status: 'active' });
      } catch (err) {
        console.log("Error loading inventory products:", err);
        return [];
      }
    },
    initialData: [],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 120000
  });

  // Also fetch P2P orders
  const { data: p2pOrders = [] } = useQuery({
    queryKey: ['marketplace-p2p'],
    queryFn: async () => {
      try {
        return await base44.entities.P2POrder.filter({ status: 'active' });
      } catch (err) {
        console.log("Error loading P2P orders:", err);
        return [];
      }
    },
    initialData: [],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 120000
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

  // Map store_type to marketplace category
  const storeTypeToCategory = {
    restaurant: 'restaurant',
    grocery: 'groceries',
    retail: 'luxury_goods',
    clothing: 'clothing_retail',
    convenience: 'groceries',
    electronics: 'tech_support',
    beauty: 'barber_beauty',
    general: 'luxury_goods',
  };

  const allItems = [
    ...items,
    ...inventoryProducts
      .filter(p => p.stock_quantity > 0 || !p.track_inventory)
      .map(p => ({
        id: `inv_${p.id}`,
        title: p.name,
        description: p.description || '',
        price: p.is_on_sale && p.sale_price ? p.sale_price : p.base_price,
        price_type: 'each',
        category: storeTypeToCategory[p.store_type] || 'luxury_goods',
        image_url: p.image_url,
        rating: 5,
        reviews_count: p.total_sold || 0,
        provider_name: p.supplier_name || 'Store',
        provider_email: p.owner_email,
        created_by: p.owner_email,
        verified_provider: false,
        availability: 'available',
        instant_booking: false,
        itemType: 'inventory_product',
        originalData: p
      })),
    ...properties.map(p => ({
      id: `prop_${p.id}`,
      title: p.title,
      description: p.description,
      price: p.listing_type === 'short_term' ? p.price_per_night :
             p.listing_type === 'for_rent' ? p.price_per_month :
             p.sale_price,
      price_type: p.listing_type === 'short_term' ? 'night' :
                  p.listing_type === 'for_rent' ? 'month' : 'total',
      category: 'real_estate',
      image_url: p.main_image,
      rating: p.rating || 4.5,
      reviews_count: p.reviews_count || 0,
      provider_name: p.host_name || 'Property Owner',
      created_by: p.created_by,
      verified_provider: p.verified_host,
      availability: 'available',
      instant_booking: p.instant_book,
      itemType: 'property',
      originalData: p
    })),
    ...p2pOrders.map(o => ({
      id: `p2p_${o.id}`,
      title: `${o.order_type === 'sell' ? 'Sell' : 'Buy'} ${o.crypto_amount} ${o.crypto_currency}`,
      description: o.terms,
      price: o.total_amount,
      price_type: 'total',
      category: 'p2p_crypto',
      rating: 5,
      provider_name: 'P2P Trader',
      created_by: o.seller_email,
      availability: 'available',
      itemType: 'p2p',
      originalData: o
    }))
  ];

  const filteredItems = allItems.filter(item => {
    // Exclude wellness categories
    if (wellnessCategoryIds.includes(item.category)) {
      return false;
    }

    // Location filter — check location, service_area, city, state, address fields
    // Items with NO location data always show (don't hide newly listed services)
    if (locationCity) {
      const q = locationCity.toLowerCase().trim();
      const hay = [item.location, item.service_area, item.city, item.state, item.address]
        .filter(Boolean).join(" ").toLowerCase();
      if (hay.length > 0 && !hay.includes(q)) return false;
    }

    // GPS radius filter (works when browser location is granted)
    if (locationRadius) {
      const raw = item.originalData;
      const lat = raw?.latitude || raw?.lat;
      const lon = raw?.longitude || raw?.lon || raw?.lng;
      if (lat && lon) {
        const d = distanceTo(lat, lon);
        if (d !== null && d > locationRadius) return false;
      }
    }

    // Category filter
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    // Search filter
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      item.title?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.provider_name?.toLowerCase().includes(searchTerm) ||
      item.category?.replace(/_/g, ' ').toLowerCase().includes(searchTerm);

    // Price range filter
    const itemPrice = item.price || 0;
    const matchesPrice = itemPrice >= filters.priceRange[0] && itemPrice <= filters.priceRange[1];

    // Rating filter
    const itemRating = item.rating || 0;
    const matchesRating = !filters.minRating || itemRating >= filters.minRating;

    // Availability filter
    let matchesAvailability = true;
    if (filters.availability === 'available_today') {
      matchesAvailability = item.availability === 'available';
    } else if (filters.availability === 'instant_booking') {
      matchesAvailability = item.instant_booking === true;
    } else if (filters.availability && filters.availability !== 'all') {
      matchesAvailability = item.availability === filters.availability;
    }

    // Verification filter
    let matchesVerification = true;
    if (filters.verification === 'verified_only') {
      matchesVerification = item.verified_provider === true;
    } else if (filters.verification === 'multi_credential') {
      const providerVers = providerVerifications[item.created_by] || [];
      matchesVerification = providerVers.length >= 3;
    } else if (filters.verification === 'highly_verified') {
      const providerVers = providerVerifications[item.created_by] || [];
      matchesVerification = providerVers.length >= 5;
    }

    // Service area filter
    let matchesServiceArea = true;
    if (filters.serviceArea && filters.serviceArea !== 'all') {
      const itemServiceArea = (item.service_area || item.location || '').toLowerCase();
      const searchArea = filters.serviceArea.replace('_', ' ').toLowerCase();
      matchesServiceArea = itemServiceArea.includes(searchArea) || 
                          itemServiceArea.includes('nationwide') ||
                          filters.serviceArea === 'online' && itemServiceArea.includes('remote');
    }

    // Special features filters
    const matchesInstantBooking = !filters.instantBooking || item.instant_booking === true;
    const matchesEscrow = !filters.escrowProtected || item.escrow_required === true;
    
    // Availability slots filter (based on availability field)
    let matchesSlots = true;
    if (filters.availabilitySlots === 'morning') {
      matchesSlots = item.availability === 'available'; // Assume available items have flexible hours
    } else if (filters.availabilitySlots === 'afternoon') {
      matchesSlots = item.availability === 'available';
    } else if (filters.availabilitySlots === 'evening') {
      matchesSlots = item.availability === 'available';
    } else if (filters.availabilitySlots === 'weekend') {
      matchesSlots = item.availability !== 'booked';
    }

    // Amenities filter
    let matchesAmenities = true;
    if (filters.amenities && filters.amenities.length > 0) {
      const itemAmenities = item.originalData?.amenities || [];
      matchesAmenities = filters.amenities.every(amenity => 
        itemAmenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
      );
    }

    return matchesCategory && matchesSearch && matchesPrice && matchesRating && 
           matchesAvailability && matchesVerification && matchesServiceArea && 
           matchesInstantBooking && matchesEscrow && matchesSlots && matchesAmenities;
  });

  // Sort filtered items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return (a.price || 0) - (b.price || 0);
      case 'price_high':
        return (b.price || 0) - (a.price || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'reviews':
        return (b.reviews_count || 0) - (a.reviews_count || 0);
      case 'relevance':
      default:
        // Relevance: verified + highly rated + instant booking first
        const aScore = (a.verified_provider ? 100 : 0) + 
                      (a.rating || 0) * 10 + 
                      (a.instant_booking ? 50 : 0) +
                      (a.reviews_count || 0);
        const bScore = (b.verified_provider ? 100 : 0) + 
                      (b.rating || 0) * 10 + 
                      (b.instant_booking ? 50 : 0) +
                      (b.reviews_count || 0);
        return bScore - aScore;
    }
  });

  // Group items by service/title to show multiple providers
  const groupedByService = sortedItems.reduce((acc, item) => {
    if (!acc[item.title]) {
      acc[item.title] = [];
    }
    acc[item.title].push(item);
    return acc;
  }, {});

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950 to-gray-950">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/50 to-transparent" />
        <div className="relative z-10 w-full px-6 pb-8 pt-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Marketplace
          </h1>
          <p className="text-gray-300 text-lg mb-4">
            60+ service categories - find anything you need
          </p>

          {/* List Item CTA */}
          {currentUser && (
            <button
              onClick={() => setShowListModal(true)}
              className="mb-3 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white font-semibold text-sm hover:scale-105 transition-transform shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              List Your Product or Service
            </button>
          )}

          {/* Search Bar */}
          <div className="flex gap-3 max-w-3xl">
            <div className="relative flex-1">
              <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services, providers..."
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition backdrop-blur-xl"
              />
            </div>
            <button
              onClick={() => {
                if (window.NativeAppBridge?.triggerHaptic) {
                  window.NativeAppBridge.triggerHaptic('light');
                }
                setShowFilters(!showFilters);
              }}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl font-medium transition flex items-center gap-2 min-h-[44px] ${
                showFilters
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
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

      {/* Location Filter */}
      <div className="px-6 mb-2">
        <LocationFilter
          cityValue={locationCity}
          onCityChange={setLocationCity}
          radiusValue={locationRadius}
          onRadiusChange={setLocationRadius}
          userCity={userCity}
          accentColor="orange"
          onOpenCitySettings={() => setShowCitySelector(true)}
        />
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="px-6">
          <AdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={() => {
              if (window.NativeAppBridge?.triggerHaptic) {
                window.NativeAppBridge.triggerHaptic('light');
              }
              setFilters({
                priceRange: [0, 10000],
                minRating: null,
                availability: null,
                verification: null,
                serviceArea: null,
                instantBooking: false,
                escrowProtected: false,
                availabilitySlots: null,
                amenities: []
              });
            }}
          />
        </div>
      )}

      <div className="px-6 mb-8">
        <h2 className="text-white font-bold text-xl mb-4">Browse by Category</h2>
        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {categories.map((cat) => {
            const categoryCount = allItems.filter(item => 
              item.category === cat.id && !wellnessCategoryIds.includes(item.category)
            ).length;
            
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition relative ${
                  selectedCategory === cat.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                <span>{cat.label}</span>
                {cat.id !== 'all' && categoryCount > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedCategory === cat.id
                      ? "bg-white/20"
                      : "bg-orange-500/20 text-orange-400"
                  }`}>
                    {categoryCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <p className="text-gray-300">
            {sortedItems.length} service{sortedItems.length !== 1 ? 's' : ''} available
          </p>
          
          {/* Sort Options */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Sort by:</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'price_low', label: 'Price: Low-High' },
                { value: 'price_high', label: 'Price: High-Low' },
                { value: 'rating', label: 'Rating' },
                { value: 'reviews', label: 'Most Reviews' }
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => {
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('light');
                    }
                    setSortBy(sort.value);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition min-h-[36px] ${
                    sortBy === sort.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Become a Provider Card - Shows for each category */}
          {selectedCategory !== "all" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group cursor-pointer"
              onClick={() => navigate(createPageUrl("ProviderHub"))}
            >
              <div className="relative h-80 rounded-3xl overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 border-2 border-white/20">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=600')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Become a Provider
                  </h3>
                  <p className="text-white/90 text-sm mb-4">
                    Start offering {categories.find(c => c.id === selectedCategory)?.label.toLowerCase()} services
                  </p>
                  <div className="space-y-2 text-left w-full max-w-xs">
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Set your own rates</span>
                    </div>
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Get paid securely</span>
                    </div>
                    <div className="flex items-center gap-2 text-white text-sm">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>Build your client base</span>
                    </div>
                  </div>
                  <button className="mt-6 px-8 py-3 bg-white rounded-full text-orange-600 font-bold hover:scale-105 transition-transform shadow-xl">
                    Get Started →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          <AnimatePresence>
            {sortedItems.map((item) => {
              const isInventoryProduct = item.itemType === 'inventory_product';
              const isFood = ["restaurant", "food_truck", "groceries"].includes(item.category);
              const isLuxuryBooking = ["yacht_charter", "concierge", "chauffeur", "private_aviation",
                "personal_security", "yacht_charter", "luxury_shopping_experience", "exclusive_event_access",
                "personal_stylist", "fine_art_consulting", "sommelier_services",
                "car_rental", "property_rental"].includes(item.category);
                              const isPhysicalProduct = ["clothing_retail", "fashion_boutique", "streetwear", "vintage_clothing",
                "custom_apparel", "print_on_demand", "graphic_printing", "screen_printing",
                "luxury_goods", "jewelry_repair", "tailoring", "personal_shopping",
                "equipment_rental", "hair_extensions"].includes(item.category);
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
                  onClick={() => {
                    if (item.itemType === 'property') {
                      navigate(createPageUrl("RealEstate"));
                    } else if (item.itemType === 'inventory_product') {
                      // handled by button
                    } else if (!item.itemType || item.itemType === 'service') {
                      navigate(createPageUrl("ServiceProviders") + `?service=${encodeURIComponent(item.title)}`);
                    }
                  }}
                >
                  <div className="relative h-80 rounded-3xl overflow-hidden bg-gray-900">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-purple-700 flex items-center justify-center">
                        <ShoppingBag className="w-20 h-20 text-white/30" />
                      </div>
                    )}
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

                    {isInventoryProduct && item.originalData?.stock_quantity > 0 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                        {item.originalData.stock_quantity} in stock
                      </div>
                    )}
                    {isInventoryProduct && item.originalData?.is_on_sale && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                        SALE
                      </div>
                    )}

                    {!isInventoryProduct && item.instant_booking && (
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

                      {/* Distance badge */}
                      {(() => {
                        const raw = item.originalData;
                        const lat = raw?.latitude || raw?.lat;
                        const lon = raw?.longitude || raw?.lon || raw?.lng;
                        const d = distanceTo(lat, lon);
                        return d !== null ? (
                          <div className="flex items-center gap-1 text-blue-300 text-xs mb-2">
                            <MapPin className="w-3 h-3" />
                            <span>{d.toFixed(1)} mi away</span>
                          </div>
                        ) : null;
                      })()}

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
                                <span className="text-2xl font-bold">${Number(item.price || 0).toFixed(2)}</span>
                            <span className="text-sm text-gray-400">/{item.price_type || 'item'}</span>
                          </div>
                          {item.price_in_soflo && (
                            <span className="text-sm text-orange-300">
                              or {item.price_in_soflo} SFC
                            </span>
                          )}
                        </div>

                        {currentUser && (item.created_by || item.provider_email) && currentUser.email !== (item.created_by || item.provider_email) && (
                          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                            <MessageProviderButton
                              providerEmail={item.created_by || item.provider_email}
                              providerName={item.provider_name || 'Provider'}
                              currentUser={currentUser}
                              className="w-full text-sm"
                            />
                          </div>
                        )}
                        {isInventoryProduct || isPhysicalProduct ? (
                          <button
                            className="px-5 py-3 bg-blue-600 rounded-full text-white font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEcommerceItem(item);
                              setShowEcommerceOrder(true);
                            }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Buy Now
                          </button>
                        ) : isLuxuryBooking ? (
                          <button
                            className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-lg shadow-purple-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLuxuryItem(item);
                              setShowLuxuryBooking(true);
                            }}
                          >
                            <Sparkles className="w-4 h-4" />
                            Book Now
                          </button>
                        ) : isFood ? (
                          <button
                            className="px-5 py-3 bg-green-600 rounded-full text-white font-semibold hover:bg-green-700 transition flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEcommerceItem(item);
                              setShowEcommerceOrder(true);
                            }}
                          >
                            <Utensils className="w-4 h-4" />
                            Order Now
                          </button>
                        ) : groupedByService[item.title]?.length > 1 ? (
                          <button
                            className="px-5 py-3 bg-purple-500 rounded-full text-white font-semibold hover:bg-purple-600 transition flex items-center gap-2"
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
                            className="px-5 py-3 bg-orange-500 rounded-full text-white font-semibold hover:bg-orange-600 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedService(item);
                              setSelectedProvider({ email: item.created_by, full_name: item.provider_name });
                              setShowQuickBooking(true);
                            }}
                          >
                            Book Now
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

                        {/* Show service details info */}
                        {filteredItems.length > 0 && (
                        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <p className="text-blue-300 text-sm">
                        💡 <strong>Tip:</strong> Click any service card to view full details including portfolio images, service area, and provider information.
                        </p>
                        </div>
                        )}

        {sortedItems.length === 0 && !isLoading && (
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

      {/* Quick Booking Modal */}
      {showQuickBooking && selectedService && selectedProvider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowQuickBooking(false)}
        >
          <div
            className="w-full max-w-2xl bg-gray-900 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <QuickBookingFlow
              service={selectedService}
              provider={selectedProvider}
              onClose={() => {
                setShowQuickBooking(false);
                setSelectedService(null);
                setSelectedProvider(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries(['marketplace-items']);
              }}
            />
          </div>
        </div>
      )}

      {/* Payment Modal for Food Orders */}
      {showPayment && pendingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Complete Your Order</h2>
                <button 
                  onClick={() => {
                    setShowPayment(false);
                    setPendingOrder(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <p className="text-white/90 mt-2">{pendingOrder.title}</p>
              <p className="text-white font-bold text-xl mt-1">${pendingOrder.price.toFixed(2)}</p>
            </div>

            <div className="p-6">
              <StripePaymentForm
                amount={pendingOrder.price}
                referenceType="order"
                referenceId={pendingOrder.item_id}
                description={`${pendingOrder.isProduct ? 'Product order' : 'Food order'}: ${pendingOrder.title}`}
                onSuccess={async (paymentIntentId) => {
                  try {
                    if (!paymentIntentId) {
                      throw new Error('Payment verification failed');
                    }

                    const order = await base44.entities.Order.create({
                      order_type: pendingOrder.category,
                      item_id: pendingOrder.item_id,
                      item_title: pendingOrder.title,
                      quantity: 1,
                      total_usd: pendingOrder.price,
                      pickup: false,
                      status: "confirmed",
                      provider_email: pendingOrder.provider_email,
                      payment_intent_id: paymentIntentId
                    });

                    // Dispatch delivery job — food vs physical product
                    try {
                      const dispatchFn = pendingOrder.isProduct ? 'dispatchProductOrder' : 'dispatchFoodOrder';
                      await base44.functions.invoke(dispatchFn, {
                        order_id: order.id,
                        item_title: pendingOrder.title,
                        provider_email: pendingOrder.provider_email,
                        delivery_address: pendingOrder.delivery_address || 'Customer address on file',
                        price: pendingOrder.price,
                        payment_intent_id: paymentIntentId
                      });
                    } catch (dispatchErr) {
                      console.error('Dispatch error (non-fatal):', dispatchErr);
                    }

                    // Success haptic
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('success');
                    }

                    setShowPayment(false);
                    setPendingOrder(null);
                    const successMsg = pendingOrder.isProduct
                      ? "✅ Order placed! Seller notified & driver being assigned for delivery."
                      : "✅ Order placed! Restaurant notified & driver being assigned.";
                    toast.success(successMsg);
                  } catch (error) {
                    console.error('Order creation error:', error);

                    // Error haptic
                    if (window.NativeAppBridge?.triggerHaptic) {
                      window.NativeAppBridge.triggerHaptic('error');
                    }

                    toast.error('Payment succeeded but order failed. Please contact support.');
                  }
                }}
                onError={(error) => {
                  console.error('Payment error:', error);

                  // Error haptic
                  if (window.NativeAppBridge?.triggerHaptic) {
                    window.NativeAppBridge.triggerHaptic('error');
                  }

                  toast.error('Payment failed: ' + (error?.message || 'Unknown error'));
                }}
                metadata={{
                  order_type: pendingOrder.category,
                  item_title: pendingOrder.title,
                  provider_email: pendingOrder.provider_email
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCitySelector && (
        <CitySelector
          user={{ city: userCity }}
          onClose={() => setShowCitySelector(false)}
          onSaved={() => { refreshLocation(); setShowCitySelector(false); }}
        />
      )}

      {/* Luxury Booking Modal */}
      <AnimatePresence>
        {showLuxuryBooking && luxuryItem && currentUser && (
          <LuxuryBookingModal
            item={luxuryItem}
            currentUser={currentUser}
            onClose={() => { setShowLuxuryBooking(false); setLuxuryItem(null); }}
            onSuccess={() => {
              setShowLuxuryBooking(false);
              setLuxuryItem(null);
              queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
            }}
          />
        )}
      </AnimatePresence>

      {/* E-commerce Order Modal */}
      <AnimatePresence>
        {showEcommerceOrder && ecommerceItem && currentUser && (
          <EcommerceOrderModal
            item={ecommerceItem}
            currentUser={currentUser}
            onClose={() => { setShowEcommerceOrder(false); setEcommerceItem(null); }}
            onSuccess={() => {
              setShowEcommerceOrder(false);
              setEcommerceItem(null);
              queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
              queryClient.invalidateQueries({ queryKey: ['marketplace-inventory'] });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showListModal && currentUser && (
          <ListItemModal
            currentUser={currentUser}
            onClose={() => setShowListModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['marketplace-items'] });
            }}
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