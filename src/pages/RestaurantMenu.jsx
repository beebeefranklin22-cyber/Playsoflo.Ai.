import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Minus, ShoppingCart, Star, Clock, DollarSign, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LoadMoreButton } from "../components/Pagination";

function getMilesBetween(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RestaurantMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const restaurantId = new URLSearchParams(location.search).get('id');
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [menuPage, setMenuPage] = useState(1);
  const menuItemsPerPage = 20;
  const [userCoords, setUserCoords] = useState(null);

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => base44.entities.Restaurant.list().then(r => r.find(rest => rest.id === restaurantId)),
    enabled: !!restaurantId
  });

  const { data: allMenuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu-items', restaurantId],
    queryFn: () => base44.entities.MenuItem.filter({ restaurant_id: restaurantId }),
    enabled: !!restaurantId
  });

  const menuItems = allMenuItems.slice(0, menuPage * menuItemsPerPage);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart-items'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CartItem.filter({ user_email: user.email, restaurant_id: restaurantId });
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ item, quantity }) => {
      const user = await base44.auth.me();
      const existing = cartItems.find(ci => ci.menu_item_id === item.id);
      
      if (existing) {
        return base44.entities.CartItem.update(existing.id, {
          quantity: existing.quantity + quantity
        });
      } else {
        return base44.entities.CartItem.create({
          user_email: user.email,
          restaurant_id: restaurantId,
          menu_item_id: item.id,
          menu_item_name: item.name,
          menu_item_price: item.price,
          quantity
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart-items']);
      toast.success('Added to cart');
    }
  });

  const categories = ["all", ...new Set(menuItems.map(item => item.category))];
  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const getItemQuantity = (itemId) => {
    const cartItem = cartItems.find(ci => ci.menu_item_id === itemId);
    return cartItem?.quantity || 0;
  };

  if (!restaurant) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950">
      <div className="relative h-64">
        <img
          src={restaurant.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200"}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        <button
          onClick={() => navigate(createPageUrl("FoodDelivery"))}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-3xl font-bold text-white mb-2">{restaurant.name}</h1>
          {(() => {
            const miles = getMilesBetween(userCoords?.lat, userCoords?.lon, restaurant.latitude, restaurant.longitude);
            const estDelivery = miles ? `${Math.round(miles * 4 + 10)}-${Math.round(miles * 4 + 20)} min` : restaurant.estimated_delivery_time;
            return (
              <div className="flex items-center gap-4 text-white flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{restaurant.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{estDelivery}</span>
                </div>
                {miles !== null && (
                  <div className="flex items-center gap-1 text-blue-300">
                    <MapPin className="w-4 h-4" />
                    <span>{miles.toFixed(1)} mi away</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>${restaurant.delivery_fee} delivery</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === category
                  ? 'bg-orange-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredItems.map((item) => {
            const quantity = getItemQuantity(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-4"
              >
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                  alt={item.name}
                  className="w-24 h-24 rounded-xl object-cover"
                />

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                  <p className="text-gray-300 text-sm mb-2 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold text-lg">${item.price.toFixed(2)}</span>
                    {!item.is_available && (
                      <Badge className="bg-red-500/20 text-red-300">Unavailable</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  {quantity > 0 ? (
                    <div className="flex items-center gap-2 bg-orange-600 rounded-full px-3 py-2">
                      <button
                        onClick={() => addToCartMutation.mutate({ item, quantity: -1 })}
                        className="text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white font-bold min-w-[20px] text-center">{quantity}</span>
                      <button
                        onClick={() => addToCartMutation.mutate({ item, quantity: 1 })}
                        className="text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => addToCartMutation.mutate({ item, quantity: 1 })}
                      disabled={!item.is_available}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <LoadMoreButton
          onLoadMore={() => setMenuPage(p => p + 1)}
          hasMore={allMenuItems.length > menuPage * menuItemsPerPage}
          loading={menuLoading}
        />

        {cartItems.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50">
            <Button
              onClick={() => navigate(createPageUrl("FoodCart"))}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 py-6 text-lg shadow-2xl"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              View Cart ({cartItems.length} items)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}