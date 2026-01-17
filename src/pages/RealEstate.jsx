import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  ChevronLeft, Home, Building, Hotel, Key, MapPin,
  Bed, Bath, Maximize, Star, Calendar, Check, Sparkles,
  Search, Loader2, Clock, Play, Calculator, FileText, SlidersHorizontal,
  TrendingUp, TrendingDown, CalendarClock, Map, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PropertyBookingModal from "../components/property/PropertyBookingModal";
import ListPropertyModal from "../components/provider/ListPropertyModal";
import ContactSellerModal from "../components/property/ContactSellerModal";
import PropertyReviewsList from "../components/property/PropertyReviewsList";
import VirtualTourViewer from "../components/realestate/VirtualTourViewer";
import MortgageCalculator from "../components/realestate/MortgageCalculator";
import AdvancedPropertyFilters from "../components/realestate/AdvancedPropertyFilters";
import PropertyMapView from "../components/realestate/PropertyMapView";

const categories = [
  { id: "all", label: "All Properties", icon: Building },
  { id: "short_term_rental", label: "Short-Term Rentals", icon: Key },
  { id: "hotel", label: "Hotels", icon: Hotel },
  { id: "apartment", label: "Apartments", icon: Building },
  { id: "house", label: "Houses", icon: Home },
  { id: "villa", label: "Villas", icon: Home },
  { id: "penthouse", label: "Penthouses", icon: Building },
];

const listingTypes = [
  { id: "all", label: "All" },
  { id: "short_term", label: "Book Now" },
  { id: "for_rent", label: "For Rent" },
  { id: "for_sale", label: "For Sale" },
];

export default function RealEstate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedListingType, setSelectedListingType] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchLocation, setSearchLocation] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingProperty, setBookingProperty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showListProperty, setShowListProperty] = useState(false);
  const [contactProperty, setContactProperty] = useState(null);
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [tourProperty, setTourProperty] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorProperty, setCalculatorProperty] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [advancedFilters, setAdvancedFilters] = useState({
    priceMin: "",
    priceMax: "",
    bedroomsMin: "",
    bedroomsMax: "",
    bathroomsMin: "",
    bathroomsMax: "",
    sqftMin: "",
    sqftMax: "",
    amenities: []
  });
  const [viewMode, setViewMode] = useState("grid");
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    initialData: [],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000
  });

  const fetchPropertiesMutation = useMutation({
    mutationFn: async (location) => {
      console.log('Fetching properties for:', location);
      const response = await base44.functions.invoke('fetchRealEstateData', {
        location,
        listing_type: selectedListingType !== 'all' ? selectedListingType : null,
        property_type: selectedCategory !== 'all' ? selectedCategory : null
      });
      console.log('Response:', response);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Success:', data);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(`Found ${data.properties?.length || 0} properties in ${data.location || searchLocation}`);
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to fetch properties');
    }
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchLocation.trim()) {
      // Geocode the location
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}`
        );
        const data = await response.json();
        if (data.length > 0) {
          setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setMapZoom(12);
          setViewMode("map");
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
      fetchPropertiesMutation.mutate(searchLocation);
    }
  };

  const filteredProperties = properties.filter(prop => {
    const categoryMatch = selectedCategory === "all" || prop.property_type === selectedCategory;
    const listingMatch = selectedListingType === "all" || prop.listing_type === selectedListingType;
    
    // Map bounds filter (only when in map view and bounds are set)
    let boundsMatch = true;
    if (viewMode === "map" && mapBounds && prop.latitude && prop.longitude) {
      boundsMatch = prop.latitude >= mapBounds.south && 
                    prop.latitude <= mapBounds.north &&
                    prop.longitude >= mapBounds.west && 
                    prop.longitude <= mapBounds.east;
    }
    
    // Price filter
    const price = prop.listing_type === "short_term" ? prop.price_per_night :
                  prop.listing_type === "for_rent" ? prop.price_per_month :
                  prop.sale_price;
    const priceMin = advancedFilters.priceMin ? parseFloat(advancedFilters.priceMin) : 0;
    const priceMax = advancedFilters.priceMax ? parseFloat(advancedFilters.priceMax) : Infinity;
    const priceMatch = price >= priceMin && price <= priceMax;
    
    // Bedrooms filter
    const bedroomsMin = advancedFilters.bedroomsMin ? parseFloat(advancedFilters.bedroomsMin) : 0;
    const bedroomsMax = advancedFilters.bedroomsMax ? parseFloat(advancedFilters.bedroomsMax) : Infinity;
    const bedroomsMatch = !prop.bedrooms || (prop.bedrooms >= bedroomsMin && prop.bedrooms <= bedroomsMax);
    
    // Bathrooms filter
    const bathroomsMin = advancedFilters.bathroomsMin ? parseFloat(advancedFilters.bathroomsMin) : 0;
    const bathroomsMax = advancedFilters.bathroomsMax ? parseFloat(advancedFilters.bathroomsMax) : Infinity;
    const bathroomsMatch = !prop.bathrooms || (prop.bathrooms >= bathroomsMin && prop.bathrooms <= bathroomsMax);
    
    // Square footage filter
    const sqftMin = advancedFilters.sqftMin ? parseFloat(advancedFilters.sqftMin) : 0;
    const sqftMax = advancedFilters.sqftMax ? parseFloat(advancedFilters.sqftMax) : Infinity;
    const sqftMatch = !prop.square_feet || (prop.square_feet >= sqftMin && prop.square_feet <= sqftMax);
    
    // Amenities filter
    const amenitiesMatch = advancedFilters.amenities.length === 0 || 
      advancedFilters.amenities.every(amenity => 
        prop.amenities?.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
      );
    
    return categoryMatch && listingMatch && priceMatch && bedroomsMatch && 
           bathroomsMatch && sqftMatch && amenitiesMatch && boundsMatch;
  });

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "price_low") {
      const priceA = a.listing_type === "short_term" ? a.price_per_night :
                     a.listing_type === "for_rent" ? a.price_per_month : a.sale_price;
      const priceB = b.listing_type === "short_term" ? b.price_per_night :
                     b.listing_type === "for_rent" ? b.price_per_month : b.sale_price;
      return priceA - priceB;
    }
    if (sortBy === "price_high") {
      const priceA = a.listing_type === "short_term" ? a.price_per_night :
                     a.listing_type === "for_rent" ? a.price_per_month : a.sale_price;
      const priceB = b.listing_type === "short_term" ? b.price_per_night :
                     b.listing_type === "for_rent" ? b.price_per_month : b.sale_price;
      return priceB - priceA;
    }
    if (sortBy === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    }
    // Default: newest
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const getPrice = (property) => {
    if (property.listing_type === "short_term" && property.price_per_night) {
      return `$${property.price_per_night}/night`;
    } else if (property.listing_type === "for_rent" && property.price_per_month) {
      return `$${property.price_per_month.toLocaleString()}/mo`;
    } else if (property.listing_type === "for_sale" && property.sale_price) {
      return `$${property.sale_price.toLocaleString()}`;
    }
    return "Contact for price";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 pb-20 overflow-x-hidden">
      <div className="relative h-48 sm:h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/50 to-transparent" />
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-4 sm:px-6 pb-6 sm:pb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            Real Estate & Stays
          </h1>
          <p className="text-gray-300 text-sm sm:text-lg mb-4">
            Millions of properties nationwide - Find your perfect space
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Search by city, state, or zip code"
                className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <Button 
              type="submit"
              disabled={fetchPropertiesMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 h-10 sm:h-12 px-4 sm:px-6 w-full sm:w-auto"
            >
              {fetchPropertiesMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Listing Type Filter */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Browse Properties</h2>
          <Button
            onClick={() => setShowListProperty(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Building className="w-4 h-4 mr-2" />
            List Your Property
          </Button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {listingTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedListingType(type.id)}
              className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium text-xs sm:text-base transition ${
                selectedListingType === type.id
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 sm:px-6 mb-8">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium text-xs sm:text-base transition ${
                selectedCategory === cat.id
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <cat.icon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <p className="text-gray-300 text-sm sm:text-base">
            {sortedProperties.length} propert{sortedProperties.length !== 1 ? 'ies' : 'y'} available
            {properties.length > 0 && properties[0]?.data_source && (
              <span className="ml-2 text-emerald-400">• Powered by {properties[0].data_source}</span>
            )}
          </p>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-white/10 rounded-xl p-1 border border-white/20">
              <button
                onClick={() => {
                  setViewMode("grid");
                  setMapBounds(null);
                }}
                className={`px-3 py-2 rounded-lg transition ${
                  viewMode === "grid" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-2 rounded-lg transition ${
                  viewMode === "map" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
            
            <Button
              onClick={() => setShowAdvancedFilters(true)}
              variant="outline"
              className="border-emerald-500 text-emerald-400 relative"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {(advancedFilters.amenities?.length > 0 || advancedFilters.priceMin || 
                advancedFilters.bedroomsMin || advancedFilters.sqftMin) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
              )}
            </Button>
          </div>
        </div>

        {viewMode === "map" ? (
          <PropertyMapView
            properties={sortedProperties}
            onPropertyClick={setSelectedProperty}
            searchCenter={mapCenter}
            searchZoom={mapZoom}
            onSearchThisArea={(bounds) => setMapBounds(bounds)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {sortedProperties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedProperty(property)}
                className="group cursor-pointer"
              >
                <div className="relative h-64 rounded-3xl overflow-hidden bg-gray-900 mb-4">
                  <img 
                    src={property.main_image} 
                    alt={property.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {property.verified_host && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Verified
                    </div>
                  )}

                  {property.instant_book && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Instant Book
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-2">
                      {property.rating && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-xl rounded-full text-xs">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-white font-bold">{property.rating}</span>
                          {property.reviews_count > 0 && (
                            <span className="text-white">({property.reviews_count})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-2">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition line-clamp-1">
                    {property.title}
                  </h3>

                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{property.location}</span>
                  </div>

                  <div className="flex items-center gap-4 text-gray-300 text-sm mb-3">
                    {property.bedrooms && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        <span>{property.bedrooms} bed</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        <span>{property.bathrooms} bath</span>
                      </div>
                    )}
                    {property.square_feet && (
                      <div className="flex items-center gap-1">
                        <Maximize className="w-4 h-4" />
                        <span>{property.square_feet.toLocaleString()} sqft</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {getPrice(property)}
                      </p>
                      {property.price_in_soflo && (
                        <p className="text-sm text-emerald-300">
                          or {property.price_in_soflo} SFC
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {property.listing_type === "for_sale" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCalculatorProperty(property);
                            setShowCalculator(true);
                          }}
                          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
                          title="Mortgage Calculator"
                        >
                          <Calculator className="w-5 h-5 text-emerald-400" />
                        </button>
                      )}
                      
                      <button 
                        className="px-6 py-2 bg-emerald-500 rounded-full text-white font-semibold hover:bg-emerald-600 transition"
                        onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser) {
                          toast.error('Please log in to continue');
                          base44.auth.redirectToLogin();
                          return;
                        }
                        if (property.listing_type === "short_term") {
                          setBookingProperty(property);
                          setShowBookingModal(true);
                        } else if (property.listing_type === "for_rent") {
                          navigate(createPageUrl("Messages") + `?contact=${property.created_by}&subject=Lease Application for ${property.title}`);
                        } else {
                          navigate(createPageUrl("Messages") + `?contact=${property.created_by}&subject=Interested in ${property.title}`);
                        }
                      }}
                    >
                        {property.listing_type === "short_term" ? "Book" : 
                         property.listing_type === "for_rent" ? "Apply" : "Contact"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {sortedProperties.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No properties found</h3>
            <p className="text-gray-400 mb-4">Try adjusting your filters</p>
            {(advancedFilters.amenities?.length > 0 || advancedFilters.priceMin || 
              advancedFilters.bedroomsMin || advancedFilters.sqftMin) && (
              <Button
                onClick={() => setAdvancedFilters({
                  priceMin: "", priceMax: "", bedroomsMin: "", bedroomsMax: "",
                  bathroomsMin: "", bathroomsMax: "", sqftMin: "", sqftMax: "", amenities: []
                })}
                variant="outline"
                className="border-emerald-500 text-emerald-400"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Property Detail Modal */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedProperty(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="relative h-96">
                <img 
                  src={selectedProperty.main_image} 
                  alt={selectedProperty.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-white/30 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-8">
                <h2 className="text-4xl font-bold text-white mb-4">
                  {selectedProperty.title}
                </h2>

                <div className="flex items-center gap-4 text-gray-300 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {selectedProperty.location}
                  </div>
                  {selectedProperty.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{selectedProperty.rating}</span>
                      <span>({selectedProperty.reviews_count} reviews)</span>
                    </div>
                  )}
                  {selectedProperty.host_name && (
                    <button
                      onClick={() => navigate(createPageUrl("PropertyHostProfile") + `?host=${selectedProperty.created_by}`)}
                      className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full hover:bg-emerald-500/30 transition"
                    >
                      <Home className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Hosted by {selectedProperty.host_name}</span>
                    </button>
                  )}
                </div>

                <p className="text-gray-300 mb-4 text-lg">
                  {selectedProperty.description}
                </p>

                {/* Property Details */}
                {(selectedProperty.year_built || selectedProperty.parcel_number || selectedProperty.owner_name) && (
                  <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-white/5 rounded-xl">
                    {selectedProperty.year_built && (
                      <div>
                        <p className="text-gray-400 text-sm">Year Built</p>
                        <p className="text-white font-semibold">{selectedProperty.year_built}</p>
                      </div>
                    )}
                    {selectedProperty.lot_size && (
                      <div>
                        <p className="text-gray-400 text-sm">Lot Size</p>
                        <p className="text-white font-semibold">{selectedProperty.lot_size.toLocaleString()} sqft</p>
                      </div>
                    )}
                    {selectedProperty.parcel_number && (
                      <div>
                        <p className="text-gray-400 text-sm">Parcel #</p>
                        <p className="text-white font-semibold text-xs">{selectedProperty.parcel_number}</p>
                      </div>
                    )}
                    {selectedProperty.owner_name && (
                      <div>
                        <p className="text-gray-400 text-sm">Owner</p>
                        <p className="text-white font-semibold">{selectedProperty.owner_name}</p>
                      </div>
                    )}
                    {selectedProperty.zoning && (
                      <div>
                        <p className="text-gray-400 text-sm">Zoning</p>
                        <p className="text-white font-semibold">{selectedProperty.zoning}</p>
                      </div>
                    )}
                    {selectedProperty.county && (
                      <div>
                        <p className="text-gray-400 text-sm">County</p>
                        <p className="text-white font-semibold">{selectedProperty.county}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {selectedProperty.bedrooms && (
                    <div className="p-4 glass-effect rounded-xl text-center">
                      <Bed className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">{selectedProperty.bedrooms}</p>
                      <p className="text-gray-400 text-sm">Bedrooms</p>
                    </div>
                  )}
                  {selectedProperty.bathrooms && (
                    <div className="p-4 glass-effect rounded-xl text-center">
                      <Bath className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">{selectedProperty.bathrooms}</p>
                      <p className="text-gray-400 text-sm">Bathrooms</p>
                    </div>
                  )}
                  {selectedProperty.square_feet && (
                    <div className="p-4 glass-effect rounded-xl text-center">
                      <Maximize className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <p className="text-white font-semibold">{selectedProperty.square_feet.toLocaleString()}</p>
                      <p className="text-gray-400 text-sm">Sq Ft</p>
                    </div>
                  )}
                </div>

                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <span key={idx} className="px-4 py-2 bg-white/10 rounded-full text-white text-sm">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-400" />
                    Reviews {selectedProperty.reviews_count > 0 && `(${selectedProperty.reviews_count})`}
                  </h3>
                  <PropertyReviewsList 
                    propertyId={selectedProperty.id} 
                    hostEmail={selectedProperty.created_by}
                  />
                </div>

                <div className="flex gap-3 mb-6 flex-wrap">
                  {(selectedProperty.images?.length > 1 || selectedProperty.virtual_tour_url) && (
                    <Button
                      onClick={() => {
                        setTourProperty(selectedProperty);
                        setShowVirtualTour(true);
                        setSelectedProperty(null);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {selectedProperty.virtual_tour_url ? 'Virtual Tour' : 'View Gallery'}
                    </Button>
                  )}
                  {selectedProperty.listing_type === "for_sale" && (
                    <Button
                      onClick={() => {
                        setCalculatorProperty(selectedProperty);
                        setShowCalculator(true);
                        setSelectedProperty(null);
                      }}
                      variant="outline"
                      className="border-emerald-500 text-emerald-400"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Mortgage Calculator
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between p-6 glass-effect rounded-2xl">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Price</p>
                    <p className="text-4xl font-bold text-white">
                      {getPrice(selectedProperty)}
                    </p>
                    {selectedProperty.price_in_soflo && (
                      <p className="text-emerald-300 mt-1">
                        or {selectedProperty.price_in_soflo} SFC
                      </p>
                    )}
                  </div>

                  <button 
                    className="px-8 py-4 rounded-2xl text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:scale-105 transition-transform glow-effect"
                    onClick={() => {
                      if (!currentUser) {
                        toast.error('Please log in to continue');
                        base44.auth.redirectToLogin();
                        return;
                      }
                      if (selectedProperty.listing_type === "short_term") {
                        setBookingProperty(selectedProperty);
                        setShowBookingModal(true);
                        setSelectedProperty(null);
                      } else if (selectedProperty.listing_type === "for_rent") {
                        navigate(createPageUrl("Messages") + `?contact=${selectedProperty.created_by}&subject=Lease Application for ${selectedProperty.title}`);
                        setSelectedProperty(null);
                      } else {
                        navigate(createPageUrl("Messages") + `?contact=${selectedProperty.created_by}&subject=Interested in ${selectedProperty.title}`);
                        setSelectedProperty(null);
                      }
                    }}
                  >
                    {selectedProperty.listing_type === "short_term" ? "Book Now" : 
                     selectedProperty.listing_type === "for_rent" ? "Apply Now" : "Contact Agent"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showBookingModal && bookingProperty && (
        <PropertyBookingModal
          property={bookingProperty}
          onClose={() => {
            setShowBookingModal(false);
            setBookingProperty(null);
          }}
        />
      )}

      <ListPropertyModal
        isOpen={showListProperty}
        onClose={() => setShowListProperty(false)}
        currentUser={currentUser}
      />

      {contactProperty && (
        <ContactSellerModal
          property={contactProperty}
          onClose={() => setContactProperty(null)}
        />
      )}

      <AnimatePresence>
        {showVirtualTour && tourProperty && (
          <VirtualTourViewer
            property={tourProperty}
            onClose={() => {
              setShowVirtualTour(false);
              setTourProperty(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCalculator && calculatorProperty && (
          <MortgageCalculator
            property={calculatorProperty}
            onClose={() => {
              setShowCalculator(false);
              setCalculatorProperty(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdvancedFilters && (
          <AdvancedPropertyFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onClose={() => setShowAdvancedFilters(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 640px) {
          body { overflow-x: hidden; }
        }
      `}</style>
    </div>
  );
}