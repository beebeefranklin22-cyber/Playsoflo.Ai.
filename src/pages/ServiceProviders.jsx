import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Star, Clock, Shield, Check, Users, MessageSquare } from "lucide-react";
import BookingModal from "../components/BookingModal";
import MessageProviderButton from "../components/provider/MessageProviderButton";
import { motion } from "framer-motion";

export default function ServiceProviders() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const serviceName = new URLSearchParams(location.search).get('service');

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['service-providers', serviceName],
    queryFn: async () => {
      const items = await base44.entities.MarketplaceItem.filter({ title: serviceName });
      return items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    },
    enabled: !!serviceName
  });

  // Fetch provider verifications
  const { data: providerVerifications = {} } = useQuery({
    queryKey: ['provider-verifications-map'],
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
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950 to-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading providers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950 to-gray-950 pb-20">
      <div className="relative h-48 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/50 to-transparent" />
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-6 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {serviceName}
          </h1>
          <p className="text-gray-300">
            {providers.length} provider{providers.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => {
            const providerVers = providerVerifications[provider.created_by] || [];
            const verificationCount = providerVers.length;
            const trustScore = provider.verified_provider ? 95 : 75;

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/50 transition"
              >
                <div className="relative h-48">
                  <img
                    src={provider.image_url}
                    alt={provider.provider_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  
                  {/* Verification Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {provider.verified_provider && (
                      <div className="px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Trust {trustScore}%
                      </div>
                    )}
                    {verificationCount > 0 && (
                      <div className="px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {verificationCount} Credentials
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <h3 className="text-white font-bold text-lg">{provider.provider_name}</h3>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-medium">{provider.rating || 5.0}</span>
                    <span className="text-gray-400 text-sm">({provider.reviews_count || 0} reviews)</span>
                  </div>

                  {provider.response_time && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Clock className="w-4 h-4" />
                      Responds in {provider.response_time}
                    </div>
                  )}

                  <p className="text-gray-300 text-sm line-clamp-2">
                    {provider.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div>
                      <div className="text-white font-bold text-xl">${provider.price}</div>
                      <div className="text-gray-400 text-xs">per {provider.price_type}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {currentUser && (
                      <MessageProviderButton
                        providerEmail={provider.created_by}
                        providerName={provider.title}
                        currentUser={currentUser}
                        context={`Inquiry about ${serviceName} service`}
                      />
                    )}
                    <button
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowBookingModal(true);
                      }}
                      className={`px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-full text-white font-semibold transition ${!currentUser ? 'col-span-2' : ''}`}
                    >
                      Book
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No providers found</h3>
            <p className="text-gray-400">Be the first to offer this service!</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedProvider && (
        <BookingModal
          service={selectedProvider}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedProvider(null);
          }}
        />
      )}
    </div>
  );
}