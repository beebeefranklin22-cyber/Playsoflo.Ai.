import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, Star, MapPin, Building, Check, Shield,
  Calendar, Home, Bed, Bath, Maximize
} from "lucide-react";
import { motion } from "framer-motion";

export default function PropertyHostProfile() {
  const navigate = useNavigate();
  const [hostEmail, setHostEmail] = useState(null);
  const [hostData, setHostData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("host");
    setHostEmail(email);
  }, []);

  const { data: host } = useQuery({
    queryKey: ["host-user", hostEmail],
    queryFn: async () => {
      if (!hostEmail) return null;
      const users = await base44.entities.User.filter({ email: hostEmail });
      return users[0] || null;
    },
    enabled: !!hostEmail,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["host-properties", hostEmail],
    queryFn: async () => {
      if (!hostEmail) return [];
      const allProperties = await base44.entities.Property.list();
      return allProperties.filter(p => p.created_by === hostEmail);
    },
    enabled: !!hostEmail,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["host-bookings", hostEmail],
    queryFn: async () => {
      if (!hostEmail) return [];
      const allBookings = await base44.entities.Booking.list();
      return allBookings.filter(b => b.provider_email === hostEmail);
    },
    enabled: !!hostEmail,
  });

  const completedBookings = bookings.filter(b => b.booking_status === "completed");
  const ratedBookings = completedBookings.filter(b => b.rating && b.rating > 0);
  const avgRating = ratedBookings.length > 0
    ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length
    : 0;

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

  if (!host) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
        <div className="text-white">Loading host profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 pb-20">
      <div className="relative h-64 bg-gradient-to-b from-emerald-900/50 to-transparent">
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-32">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-green-500 rounded-3xl flex items-center justify-center text-white text-5xl font-bold flex-shrink-0">
              {host.full_name?.[0] || "H"}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">
                  {host.provider_brand_name || host.full_name || "Property Host"}
                </h1>
                {host.verified_host && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <Check className="w-3 h-3 mr-1" />
                    Verified Host
                  </Badge>
                )}
              </div>

              {host.provider_description && (
                <p className="text-gray-300 mb-4">{host.provider_description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <Building className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{properties.length}</p>
                  <p className="text-gray-400 text-sm">Properties</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                  </p>
                  <p className="text-gray-400 text-sm">Rating</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <Calendar className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{completedBookings.length}</p>
                  <p className="text-gray-400 text-sm">Bookings</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <Shield className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {host.provider_trust_score || "N/A"}
                  </p>
                  <p className="text-gray-400 text-sm">Trust Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Host Info */}
        {(host.provider_business_address || host.provider_years_experience || host.provider_website) && (
          <Card className="bg-white/5 border-white/10 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">About This Host</h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {host.provider_years_experience && (
                  <div>
                    <p className="text-gray-400 mb-1">Experience</p>
                    <p className="text-white font-semibold">{host.provider_years_experience} years</p>
                  </div>
                )}
                {host.provider_business_address && (
                  <div>
                    <p className="text-gray-400 mb-1">Location</p>
                    <p className="text-white font-semibold">{host.provider_business_address}</p>
                  </div>
                )}
                {host.provider_website && (
                  <div>
                    <p className="text-gray-400 mb-1">Website</p>
                    <a
                      href={host.provider_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Properties */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            {properties.length} Propert{properties.length !== 1 ? 'ies' : 'y'} Listed
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(createPageUrl("RealEstate"))}
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
                    <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                      Instant Book
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    {property.rating && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-xl rounded-full text-xs inline-flex mb-2">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-bold">{property.rating}</span>
                        {property.reviews_count > 0 && (
                          <span className="text-white">({property.reviews_count})</span>
                        )}
                      </div>
                    )}
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

                  <p className="text-2xl font-bold text-white">
                    {getPrice(property)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {properties.length === 0 && (
            <div className="text-center py-20">
              <Home className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No properties listed yet</p>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        {ratedBookings.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Guest Reviews</h2>
              <div className="space-y-4">
                {ratedBookings.slice(0, 10).map((booking) => (
                  <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-bold">{booking.rating}/5</span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{booking.experience_title}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}