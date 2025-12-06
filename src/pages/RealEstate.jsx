import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  ChevronLeft, Home, Building, Hotel, Key, MapPin,
  Bed, Bath, Maximize, Star, Check, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedListingType, setSelectedListingType] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    initialData: []
  });

  const filteredProperties = properties.filter(prop => {
    const categoryMatch = selectedCategory === "all" || prop.property_type === selectedCategory;
    const listingMatch = selectedListingType === "all" || prop.listing_type === selectedListingType;
    return categoryMatch && listingMatch;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 pb-20">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/50 to-transparent" />
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-6 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Real Estate & Stays
          </h1>
          <p className="text-gray-300 text-lg">
            Find your perfect space - from weekend getaways to dream homes
          </p>
        </div>
      </div>

      {/* Listing Type Filter */}
      <div className="px-6 mb-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {listingTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedListingType(type.id)}
              className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition ${
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
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                selectedCategory === cat.id
                  ? "bg-emerald-500 text-white"
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
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? 'ies' : 'y'} available
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProperties.map((property, index) => (
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

                    <button className="px-6 py-2 bg-emerald-500 rounded-full text-white font-semibold hover:bg-emerald-600 transition">
                      {property.listing_type === "short_term" ? "Book" : 
                       property.listing_type === "for_rent" ? "Apply" : "Contact"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProperties.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No properties found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
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

                <div className="flex items-center gap-4 text-gray-300 mb-6">
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
                </div>

                <p className="text-gray-300 mb-6 text-lg">
                  {selectedProperty.description}
                </p>

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

                  <button className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl text-white text-xl font-bold hover:scale-105 transition-transform glow-effect">
                    {selectedProperty.listing_type === "short_term" ? "Book Now" : 
                     selectedProperty.listing_type === "for_rent" ? "Apply Now" : "Contact Agent"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}