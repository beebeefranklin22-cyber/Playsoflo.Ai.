import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Anchor, Wine, Music, Car, PartyPopper, Camera, 
  Sparkles, Search, Filter, Plus, Loader2, TrendingUp,
  Gift, Calendar, Sun, Snowflake, Heart, MessageSquare, Ticket,
  Theater, Laugh, Zap, Globe, Mic, Flame, Moon, Trophy,
  Smile, Activity, Cpu, Utensils, Drum, Palette, SlidersHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import MessageProviderButton from "../components/provider/MessageProviderButton";
import ListExperienceModal from "../components/entertainment/ListExperienceModal";
import TicketAffiliateStats from "../components/affiliate/TicketAffiliateStats";
import AffiliatePayoutManager from "../components/affiliate/AffiliatePayoutManager";
import TicketPurchaseModal from "../components/entertainment/TicketPurchaseModal";

const entertainmentCategories = [
  { id: "all", label: "All Experiences", icon: Sparkles },
  { id: "live_events", label: "Live Events", icon: Ticket },
  { id: "yacht_charter", label: "Yacht Charter", icon: Anchor },
  { id: "exotic_car", label: "Exotic Cars", icon: Car },
  { id: "wine_tasting", label: "Wine Tasting", icon: Wine },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "event_planning", label: "Event Planning", icon: PartyPopper },
  { id: "nightlife", label: "Nightlife", icon: Music },
  { id: "comedy_clubs", label: "Comedy Clubs", icon: Laugh },
  { id: "concerts", label: "Concerts & Shows", icon: Music },
  { id: "theatre", label: "Theatre & Broadway", icon: Theater },
  { id: "festivals", label: "Music Festivals", icon: Flame },
  { id: "karaoke", label: "Karaoke Bars", icon: Mic },
  { id: "escape_rooms", label: "Escape Rooms", icon: Zap },
  { id: "arcade", label: "Arcade Centers", icon: Trophy },
  { id: "bowling", label: "Bowling Alleys", icon: Activity },
  { id: "cinema", label: "Cinema & IMAX", icon: Camera },
  { id: "theme_parks", label: "Theme Parks", icon: Activity },
  { id: "water_parks", label: "Water Parks", icon: Activity },
  { id: "casinos", label: "Casinos", icon: Sparkles },
  { id: "paint_sip", label: "Paint & Sip", icon: Palette },
  { id: "axe_throwing", label: "Axe Throwing", icon: Activity },
  { id: "silent_disco", label: "Silent Disco", icon: Music },
  { id: "drag_shows", label: "Drag Shows", icon: Sparkles },
  { id: "roller_skating", label: "Roller Skating", icon: Activity },
  { id: "trivia_nights", label: "Trivia Nights", icon: Cpu },
  { id: "food_festivals", label: "Food Festivals", icon: Utensils },
  { id: "beer_gardens", label: "Beer Gardens", icon: Wine },
  { id: "rooftop_bars", label: "Rooftop Bars", icon: Moon },
  { id: "speakeasy", label: "Speakeasy Bars", icon: Wine },
  { id: "poetry_slams", label: "Poetry Slams", icon: Heart },
  { id: "jazz_clubs", label: "Jazz Clubs", icon: Music },
  { id: "gaming_cafes", label: "Gaming Cafes", icon: Cpu },
  { id: "haunted_houses", label: "Haunted Houses", icon: Moon },
  { id: "laser_tag", label: "Laser Tag", icon: Zap },
  { id: "go_karts", label: "Go-Kart Racing", icon: Car },
  { id: "trampoline_parks", label: "Trampoline Parks", icon: Activity },
  { id: "mini_golf", label: "Mini Golf", icon: Activity }
];

const occasions = [
  { id: "birthday", label: "Birthday", icon: Gift, color: "from-pink-500 to-rose-500" },
  { id: "wedding", label: "Wedding", icon: Heart, color: "from-red-500 to-pink-500" },
  { id: "anniversary", label: "Anniversary", icon: Heart, color: "from-purple-500 to-pink-500" },
  { id: "corporate", label: "Corporate Event", icon: TrendingUp, color: "from-blue-500 to-cyan-500" },
  { id: "holiday", label: "Holiday", icon: Calendar, color: "from-green-500 to-emerald-500" },
  { id: "summer", label: "Summer Special", icon: Sun, color: "from-yellow-500 to-orange-500" },
  { id: "winter", label: "Winter Special", icon: Snowflake, color: "from-blue-400 to-cyan-400" }
];

export default function EntertainmentExperiences() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialCategory = params.get('category') || 'all';
  
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [showPackageSuggestions, setShowPackageSuggestions] = useState(false);
  const [generatingPackage, setGeneratingPackage] = useState(false);
  const [suggestedPackages, setSuggestedPackages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showListExperience, setShowListExperience] = useState(false);
  const [eventsSearch, setEventsSearch] = useState({ keyword: "", city: "Miami" });
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [filters, setFilters] = useState({
    durationMin: "",
    durationMax: "",
    ageRestriction: "",
    dressCode: ""
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['entertainment-experiences', selectedCategory],
    queryFn: async () => {
      if (selectedCategory === 'all') {
        return await base44.entities.Experience.list('-created_date');
      }
      return await base44.entities.Experience.filter({ 
        category: selectedCategory 
      }, '-created_date');
    },
    enabled: selectedCategory !== 'live_events',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000
  });

  const { data: liveEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['ticketmaster-events', eventsSearch.keyword, eventsSearch.city],
    queryFn: async () => {
      const result = await base44.functions.invoke('fetchTicketmasterEvents', {
        keyword: eventsSearch.keyword,
        city: eventsSearch.city
      });
      return result.data?.events || [];
    },
    enabled: selectedCategory === 'live_events'
  });

  const filteredExperiences = experiences.filter(exp => {
    const searchMatch = searchQuery ? exp.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    
    // Duration filter
    const durationMin = filters.durationMin ? parseFloat(filters.durationMin) : 0;
    const durationMax = filters.durationMax ? parseFloat(filters.durationMax) : Infinity;
    const durationMatch = !exp.duration_minutes || (exp.duration_minutes >= durationMin && exp.duration_minutes <= durationMax);
    
    // Age restriction filter
    const ageMatch = !filters.ageRestriction || !exp.age_restriction || 
      exp.age_restriction.toLowerCase().includes(filters.ageRestriction.toLowerCase());
    
    // Dress code filter
    const dressMatch = !filters.dressCode || !exp.dress_code || 
      exp.dress_code.toLowerCase().includes(filters.dressCode.toLowerCase());
    
    return searchMatch && durationMatch && ageMatch && dressMatch;
  });

  // Cross-sell suggestions (other services to add on)
  const getCrossSellSuggestions = (mainCategory) => {
    const suggestions = {
      yacht_charter: ['photography', 'wine_tasting', 'event_planning'],
      exotic_car: ['photography', 'nightlife'],
      wine_tasting: ['photography', 'event_planning'],
      event_planning: ['photography', 'wine_tasting', 'nightlife'],
      photography: ['exotic_car', 'yacht_charter'],
      nightlife: ['exotic_car', 'photography']
    };
    return suggestions[mainCategory] || [];
  };

  const generateSmartPackage = async () => {
    if (!selectedOccasion) {
      toast.error('Please select an occasion first');
      return;
    }

    setGeneratingPackage(true);
    try {
      const occasionDetails = occasions.find(o => o.id === selectedOccasion);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert entertainment and event planning specialist. Create 3 smart package suggestions for a ${occasionDetails.label}.

Available entertainment categories:
- Yacht Charter
- Exotic Car Rentals
- Wine Tasting
- Photography Services
- Event Planning
- Nightlife Experiences

For each package, suggest:
1. A creative package name
2. 2-4 complementary services that work well together
3. Estimated total value
4. Suggested discount percentage (10-25%)
5. Why this package is perfect for ${occasionDetails.label}

Consider:
- Season-appropriate activities
- Natural service pairings
- Budget tiers (luxury, mid-range, budget-friendly)
- Popular combinations

Return as JSON array with this structure:
[
  {
    "name": "Package name",
    "services": ["service1", "service2", "service3"],
    "original_price": 5000,
    "discount_percent": 20,
    "final_price": 4000,
    "description": "Why this is perfect",
    "tier": "luxury" or "mid-range" or "budget"
  }
]`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            packages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  services: { type: "array", items: { type: "string" } },
                  original_price: { type: "number" },
                  discount_percent: { type: "number" },
                  final_price: { type: "number" },
                  description: { type: "string" },
                  tier: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestedPackages(response.packages || []);
      setShowPackageSuggestions(true);
      toast.success('Smart packages generated!');
    } catch (error) {
      toast.error('Failed to generate packages');
      console.error(error);
    } finally {
      setGeneratingPackage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 p-6 pb-20" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Entertainment Experiences</h1>
              <p className="text-gray-400">Luxury services and unforgettable moments</p>
            </div>
            <Button
              onClick={() => setShowListExperience(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              List Your Experience
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-white font-semibold mb-2 px-4 py-2 bg-white/5 border border-white/20 rounded-xl w-full"
          >
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            Filters
            <span className="ml-auto text-gray-400 text-sm">{showFilters ? '▲' : '▼'}</span>
          </button>
          {showFilters && (
            <div className="bg-white/5 border border-white/20 rounded-2xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Min Duration (min)</label>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.durationMin}
                    onChange={(e) => setFilters({ ...filters, durationMin: e.target.value })}
                    className="bg-white/10 border-white/20 text-white h-9"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Max Duration (min)</label>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.durationMax}
                    onChange={(e) => setFilters({ ...filters, durationMax: e.target.value })}
                    className="bg-white/10 border-white/20 text-white h-9"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Age Restriction</label>
                  <Input
                    type="text"
                    placeholder="e.g., 21+"
                    value={filters.ageRestriction}
                    onChange={(e) => setFilters({ ...filters, ageRestriction: e.target.value })}
                    className="bg-white/10 border-white/20 text-white h-9"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Dress Code</label>
                  <Input
                    type="text"
                    placeholder="e.g., Casual"
                    value={filters.dressCode}
                    onChange={(e) => setFilters({ ...filters, dressCode: e.target.value })}
                    className="bg-white/10 border-white/20 text-white h-9"
                  />
                </div>
              </div>
              {(filters.durationMin || filters.ageRestriction || filters.dressCode) && (
                <Button
                  onClick={() => setFilters({ durationMin: "", durationMax: "", ageRestriction: "", dressCode: "" })}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-purple-500 text-purple-400"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          {selectedCategory === 'live_events' ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={eventsSearch.keyword}
                  onChange={(e) => setEventsSearch({...eventsSearch, keyword: e.target.value})}
                  placeholder="Search concerts, sports, theater..."
                  className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
              <Input
                value={eventsSearch.city}
                onChange={(e) => setEventsSearch({...eventsSearch, city: e.target.value})}
                placeholder="City..."
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search experiences..."
                className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-4" style={{ touchAction: 'pan-x' }}>
            {entertainmentCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setShowPackageSuggestions(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ronron AI Package Suggestions */}
        <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Ronron Smart Packages</h3>
                  <p className="text-purple-300 text-sm">AI-curated bundles for any occasion</p>
                </div>
              </div>
              <Button
                onClick={generateSmartPackage}
                disabled={generatingPackage || !selectedOccasion}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generatingPackage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Packages
                  </>
                )}
              </Button>
            </div>

            {/* Occasion Selector */}
            <div className="mb-4">
              <label className="text-gray-300 text-sm mb-2 block">Select Occasion:</label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {occasions.map((occ) => {
                  const Icon = occ.icon;
                  const isSelected = selectedOccasion === occ.id;
                  return (
                    <button
                      key={occ.id}
                      onClick={() => setSelectedOccasion(occ.id)}
                      className={`p-3 rounded-xl border-2 transition ${
                        isSelected
                          ? `bg-gradient-to-br ${occ.color} border-white/30`
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <Icon className="w-6 h-6 text-white mx-auto mb-1" />
                      <p className="text-white text-xs text-center">{occ.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generated Packages */}
            {showPackageSuggestions && suggestedPackages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-3 gap-4 mt-6"
              >
                {suggestedPackages.map((pkg, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <Badge className={`mb-2 ${
                      pkg.tier === 'luxury' ? 'bg-yellow-500/20 text-yellow-300' :
                      pkg.tier === 'mid-range' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {pkg.tier}
                    </Badge>
                    <h4 className="text-white font-bold mb-2">{pkg.name}</h4>
                    <div className="space-y-1 mb-3">
                      {pkg.services.map((service, i) => (
                        <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                          <Plus className="w-3 h-3" />
                          <span>{service}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs mb-3">{pkg.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-gray-400 text-xs line-through">${pkg.original_price}</p>
                        <p className="text-green-400 font-bold text-lg">${pkg.final_price}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300">
                        Save {pkg.discount_percent}%
                      </Badge>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      Book Package
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Admin Affiliate Dashboard */}
        {currentUser?.role === 'admin' && selectedCategory === 'live_events' && (
          <div className="mb-8 space-y-6">
            <div>
              <h3 className="text-white font-bold text-2xl mb-2">Ticketmaster Affiliate Dashboard</h3>
              <p className="text-gray-400 text-sm">Track your ticket affiliate earnings (Admin Only)</p>
            </div>
            <TicketAffiliateStats currentUser={currentUser} />
            <AffiliatePayoutManager currentUser={currentUser} />
          </div>
        )}

        {/* Main Content */}
        {selectedCategory === 'live_events' ? (
          eventsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : liveEvents.length === 0 ? (
            <div className="text-center py-20">
              <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No events found. Try different search terms.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveEvents.map((event) => {
                const trackClick = async () => {
                  try {
                    const result = await base44.functions.invoke('trackTicketClick', {
                      event_id: event.id,
                      event_name: event.name,
                      ticket_url: event.url
                    });
                    window.open(result.data.tracking_url, '_blank');
                  } catch (error) {
                    console.error('Tracking error:', error);
                    window.open(event.url, '_blank');
                  }
                };

                return (
                  <Card key={event.id} className="bg-white/5 border-white/10 hover:border-purple-500/30 transition group">
                    <CardContent className="p-0">
                      {event.images?.[0]?.url && (
                        <img
                          src={event.images[0].url}
                          alt={event.name}
                          className="w-full h-48 object-cover rounded-t-xl"
                        />
                      )}
                      <div className="p-6">
                        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition">
                          {event.name}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-400 mb-4">
                          {event.dates?.start?.localDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(event.dates.start.localDate).toLocaleDateString()}
                            </div>
                          )}
                          {event._embedded?.venues?.[0]?.name && (
                            <p>📍 {event._embedded.venues[0].name}</p>
                          )}
                          {event.priceRanges?.[0] && (
                            <p className="text-green-400 font-bold">
                              From ${event.priceRanges[0].min}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={trackClick}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Ticket className="w-4 h-4 mr-2" />
                          Buy Tickets
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {filteredExperiences.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No experiences found in this category</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExperiences.map((exp) => (
                    <Card key={exp.id} className="bg-white/5 border-white/10 hover:border-purple-500/30 transition group">
                      <CardContent className="p-0">
                        {exp.image_url && (
                          <img
                            src={exp.image_url}
                            alt={exp.title}
                            className="w-full h-48 object-cover rounded-t-xl"
                          />
                        )}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-white font-bold text-lg group-hover:text-purple-400 transition">
                              {exp.title}
                            </h3>
                            <Badge className="bg-purple-500/20 text-purple-300">
                              {exp.category}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{exp.description}</p>
                          
                          {exp.venue_name && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                              <Calendar className="w-4 h-4" />
                              <span>{exp.venue_name}</span>
                            </div>
                          )}
                          
                          {exp.requires_tickets && exp.ticket_types?.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              <Ticket className="w-4 h-4 text-purple-400" />
                              <span className="text-purple-300 text-xs">E-Tickets Available</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-green-400 font-bold text-xl">
                              {exp.requires_tickets && exp.ticket_types?.length > 0 
                                ? `From $${Math.min(...exp.ticket_types.map(t => t.price))}`
                                : `$${exp.price}`
                              }
                            </div>
                            <Button 
                              onClick={() => {
                                if (exp.requires_tickets) {
                                  setSelectedExperience(exp);
                                  setShowTicketModal(true);
                                } else {
                                  toast.info('Direct booking coming soon!');
                                }
                              }}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {exp.requires_tickets ? 'Buy Tickets' : 'Book Now'}
                            </Button>
                          </div>
                          {currentUser && exp.provider_email && (
                            <MessageProviderButton
                              providerEmail={exp.provider_email}
                              providerName={exp.title}
                              currentUser={currentUser}
                              context={`Inquiry about: ${exp.title}`}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Cross-Sell Suggestions */}
                {selectedCategory !== 'all' && getCrossSellSuggestions(selectedCategory).length > 0 && (
                  <Card className="bg-white/5 border-white/10 mt-8">
                    <CardContent className="p-6">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-purple-400" />
                        Perfect Add-Ons for Your Experience
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {getCrossSellSuggestions(selectedCategory).map((category) => {
                          const cat = entertainmentCategories.find(c => c.id === category);
                          if (!cat) return null;
                          const Icon = cat.icon;
                          return (
                            <button
                              key={category}
                              onClick={() => setSelectedCategory(category)}
                              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-purple-500/30 transition"
                            >
                              <Icon className="w-8 h-8 text-purple-400" />
                              <div className="text-left">
                                <p className="text-white font-medium">{cat.label}</p>
                                <p className="text-gray-400 text-xs">Enhance your experience</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        <ListExperienceModal
          isOpen={showListExperience}
          onClose={() => setShowListExperience(false)}
          currentUser={currentUser}
        />

        {selectedExperience && (
          <TicketPurchaseModal
            isOpen={showTicketModal}
            onClose={() => {
              setShowTicketModal(false);
              setSelectedExperience(null);
            }}
            experience={selectedExperience}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}