import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, Calendar, MapPin, ExternalLink, DollarSign,
  Music, Trophy, Drama, Laugh, Clapperboard, Mic2,
  Loader2, ChevronLeft, Clock, Ticket
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TicketAffiliateStats from "../components/affiliate/TicketAffiliateStats";

const eventCategories = [
  { id: "", label: "All Events", icon: Calendar },
  { id: "Music", label: "Music", icon: Music },
  { id: "Sports", label: "Sports", icon: Trophy },
  { id: "Arts & Theatre", label: "Arts & Theatre", icon: Drama },
  { id: "Comedy", label: "Comedy", icon: Laugh },
  { id: "Film", label: "Film", icon: Clapperboard },
];

export default function Events() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ticketmaster-events', searchKeyword, searchCity, selectedCategory],
    queryFn: async () => {
      const response = await base44.functions.invoke('fetchTicketmasterEvents', {
        keyword: searchKeyword || undefined,
        city: searchCity || undefined,
        classificationName: selectedCategory || undefined,
        size: 30
      });
      return response.data;
    },
    enabled: false,
    initialData: { events: [], total: 0 }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 pb-20">
      {/* Header */}
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-transparent" />
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-6 pb-8">
          <div className="flex items-center gap-3 mb-3">
            <Ticket className="w-10 h-10 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">Live Events</h1>
          </div>
          <p className="text-gray-300 text-lg mb-6">
            Discover concerts, sports, comedy shows & more powered by Ticketmaster
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-3 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search artists, teams, or events..."
                className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400 h-12"
              />
            </div>
            <div className="relative w-48">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="City"
                className="pl-12 bg-white/10 border-white/20 text-white placeholder-gray-400 h-12"
              />
            </div>
            <Button 
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 h-12 px-6"
            >
              {isLoading ? (
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

      {/* Affiliate Stats */}
      {currentUser?.role === 'admin' && (
        <div className="px-6 mb-8">
          <h3 className="text-white font-bold text-lg mb-4">Affiliate Performance</h3>
          <TicketAffiliateStats currentUser={currentUser} />
        </div>
      )}

      {/* Category Filter */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4">
          {eventCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid */}
      <div className="px-6">
        {!data?.events?.length && !isLoading && (
          <div className="text-center py-20">
            <Ticket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Discover Live Events</h3>
            <p className="text-gray-400">Search for concerts, sports, comedy shows, and more</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
        )}

        {data?.events?.length > 0 && (
          <>
            <p className="text-gray-300 mb-6">
              Found {data.total.toLocaleString()} events
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition group overflow-hidden">
                    <CardContent className="p-0">
                      {event.image && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={event.image}
                            alt={event.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          {event.classification && (
                            <Badge className="absolute top-3 left-3 bg-purple-500/90 text-white">
                              {event.classification}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="p-5">
                        <h3 className="text-white font-bold text-lg mb-3 line-clamp-2 group-hover:text-purple-400 transition">
                          {event.name}
                        </h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            <span>
                              {new Date(event.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          {event.time && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Clock className="w-4 h-4 text-purple-400" />
                              <span>{event.time}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            <span className="line-clamp-1">
                              {event.venue}{event.city && `, ${event.city}`}{event.state && `, ${event.state}`}
                            </span>
                          </div>
                          {event.genre && (
                            <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                              {event.genre}
                            </Badge>
                          )}
                        </div>

                        {event.priceRange && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-semibold">
                                ${event.priceRange.min} - ${event.priceRange.max}
                              </span>
                            </div>
                          </div>
                        )}

                        {event.info && (
                          <p className="text-gray-400 text-xs mb-4 line-clamp-2">{event.info}</p>
                        )}

                        <Button 
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          onClick={async () => {
                            try {
                              const response = await base44.functions.invoke('trackTicketClick', {
                                event_id: event.id,
                                event_name: event.name,
                                ticket_url: event.url,
                                price_min: event.priceRange?.min,
                                price_max: event.priceRange?.max
                              });
                              
                              // Open tracked URL in new tab
                              window.open(response.data.tracking_url, '_blank');
                              toast.success('Opening Ticketmaster... Earning commission on sale!');
                            } catch (error) {
                              // Fallback to direct link
                              window.open(event.url, '_blank');
                              toast.success('Opening Ticketmaster...');
                            }
                          }}
                        >
                          <Ticket className="w-4 h-4 mr-2" />
                          Buy Tickets
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}