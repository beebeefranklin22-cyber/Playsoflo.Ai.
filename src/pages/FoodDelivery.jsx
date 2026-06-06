import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Clock, DollarSign, ShoppingCart, MapPin } from "lucide-react";
import { motion } from "framer-motion";

// Calculate rough miles between two lat/lon points
function getMilesBetween(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FoodDelivery() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [page, setPage] = useState(1);
  const [userCoords, setUserCoords] = useState(null);
  const itemsPerPage = 12;

  // Get user location once for distance display
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['restaurants', page],
    queryFn: async () => {
      const skip = (page - 1) * itemsPerPage;
      return base44.entities.Restaurant.list('-rating', itemsPerPage + skip);
    }
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart-items'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CartItem.filter({ user_email: user.email });
    }
  });

  const cuisines = ["all", "american", "italian", "chinese", "mexican", "japanese", "thai", "indian", "mediterranean", "fast_food", "seafood", "vegan", "bbq"];

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCuisine = selectedCuisine === "all" || r.cuisine_type === selectedCuisine;
    return matchesSearch && matchesCuisine;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Food Delivery</h1>
            <p className="text-gray-300">Order from the best restaurants</p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("FoodCart"))}
            className="relative bg-orange-600 hover:bg-orange-700"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Cart
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                {cartItems.length}
              </span>
            )}
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants or cuisines..."
              className="pl-12 py-6 bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-2xl"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {cuisines.map(cuisine => (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  selectedCuisine === cuisine
                    ? 'bg-orange-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-white">Loading restaurants...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden hover:shadow-2xl transition cursor-pointer"
                onClick={() => navigate(createPageUrl("RestaurantMenu") + `?id=${restaurant.id}`)}
              >
                <div className="relative h-48">
                  <img
                    src={restaurant.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  {!restaurant.is_open && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Closed</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-2">{restaurant.name}</h3>
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{restaurant.description}</p>

                  {(() => {
                    const miles = getMilesBetween(userCoords?.lat, userCoords?.lon, restaurant.latitude, restaurant.longitude);
                    const estDelivery = miles ? `${Math.round(miles * 4 + 10)}-${Math.round(miles * 4 + 20)} min` : restaurant.estimated_delivery_time;
                    return (
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white font-medium">{restaurant.rating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-300">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{estDelivery}</span>
                        </div>
                        {miles !== null && (
                          <div className="flex items-center gap-1 text-blue-300">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{miles.toFixed(1)} mi</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm">${restaurant.delivery_fee}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between">
                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                      {restaurant.cuisine_type}
                    </Badge>
                    {restaurant.min_order > 0 && (
                      <span className="text-xs text-gray-400">Min ${restaurant.min_order}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filteredRestaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-300 text-lg">No restaurants found</p>
          </div>
        )}
      </div>
    </div>
  );
}