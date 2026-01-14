import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search, User, Briefcase, Music, Tv, ShoppingBag,
  Star, MapPin, DollarSign, ChevronRight, Sparkles,
  Filter, X, TrendingUp, AtSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

export default function UniversalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('search') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("all");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search all entity types
  const { data: users = [] } = useQuery({
    queryKey: ['search-users', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const allUsers = await base44.entities.User.list();
      const searchTerm = debouncedQuery.toLowerCase().replace('@', '');
      return allUsers.filter(user => 
        user.username?.toLowerCase().includes(searchTerm) ||
        user.full_name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.bio?.toLowerCase().includes(searchTerm)
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: services = [] } = useQuery({
    queryKey: ['search-services', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const allServices = await base44.entities.MarketplaceItem.list();
      return allServices.filter(service => 
        service.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        service.category?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ['search-experiences', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const allExperiences = await base44.entities.Experience.list();
      return allExperiences.filter(exp => 
        exp.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        exp.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        exp.location?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: music = [] } = useQuery({
    queryKey: ['search-music', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const allMusic = await base44.entities.MusicTrack.list();
      return allMusic.filter(track => 
        track.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        track.artist?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        track.genre?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: streaming = [] } = useQuery({
    queryKey: ['search-streaming', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const allStreaming = await base44.entities.StreamingContent.list();
      return allStreaming.filter(content => 
        content.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        content.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        content.genre?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const totalResults = users.length + services.length + experiences.length + music.length + streaming.length;

  const ResultCard = ({ item, type, icon: Icon }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer"
    >
      <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {item.image_url || item.profile_photo || item.cover_url ? (
              <img 
                src={item.image_url || item.profile_photo || item.cover_url} 
                alt={item.title || item.full_name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Icon className="w-10 h-10 text-white" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-white font-bold text-lg group-hover:text-purple-400 transition truncate">
                  {item.title || item.full_name || item.name}
                </h3>
                <Badge className="bg-purple-500/20 text-purple-300 shrink-0">
                  {type}
                </Badge>
              </div>

              {item.description && (
                <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                  {item.description}
                </p>
              )}

              {item.username && (
                <p className="text-purple-400 text-sm flex items-center gap-1 mb-1">
                  <AtSign className="w-3 h-3" />
                  {item.username}
                </p>
              )}

              {item.bio && (
                <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                  {item.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-sm">
                {item.price && (
                  <div className="flex items-center gap-1 text-green-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-bold">${item.price}</span>
                  </div>
                )}

                {item.rating && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span>{item.rating}</span>
                  </div>
                )}

                {item.location && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{item.location}</span>
                  </div>
                )}

                {item.artist && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Music className="w-4 h-4" />
                    <span>{item.artist}</span>
                  </div>
                )}

                {item.genre && (
                  <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                    {item.genre}
                  </Badge>
                )}

                {item.category && (
                  <Badge className="bg-indigo-500/20 text-indigo-300 text-xs capitalize">
                    {item.category.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Search Everything</h1>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, services, music, shows, and more..."
              className="pl-12 pr-4 py-6 bg-white/10 border-white/20 text-white text-lg placeholder-gray-400 rounded-2xl"
              autoFocus
            />
          </div>

          {/* Results Count */}
          {debouncedQuery && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-gray-400">
                Found <span className="text-white font-bold">{totalResults}</span> results
              </p>
              {totalResults > 0 && (
                <div className="flex items-center gap-2 text-purple-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Showing best matches</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {!debouncedQuery ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Start Searching</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Search across users, services, experiences, music, shows, and everything on PlaySoFlo
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Results Found</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Try adjusting your search query or browse different categories
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 bg-white/10 backdrop-blur-xl border border-white/20 mb-6">
              <TabsTrigger value="all" className="relative">
                All
                {totalResults > 0 && (
                  <Badge className="ml-2 bg-purple-500">{totalResults}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="relative">
                Users
                {users.length > 0 && (
                  <Badge className="ml-2 bg-blue-500">{users.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="services" className="relative">
                Services
                {services.length > 0 && (
                  <Badge className="ml-2 bg-green-500">{services.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="experiences" className="relative">
                Experiences
                {experiences.length > 0 && (
                  <Badge className="ml-2 bg-pink-500">{experiences.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="music" className="relative">
                Music
                {music.length > 0 && (
                  <Badge className="ml-2 bg-purple-500">{music.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="shows" className="relative">
                Shows
                {streaming.length > 0 && (
                  <Badge className="ml-2 bg-red-500">{streaming.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {users.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Users ({users.length})
                  </h3>
                  {users.slice(0, 3).map(user => (
                    <div key={user.id} onClick={() => navigate(createPageUrl("UserProfile") + `?username=${user.username || user.email}`)}>
                      <ResultCard item={user} type="User" icon={User} />
                    </div>
                  ))}
                  {users.length > 3 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("users")}
                      className="w-full"
                    >
                      View all {users.length} users
                    </Button>
                  )}
                </div>
              )}

              {services.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Services ({services.length})
                  </h3>
                  {services.slice(0, 3).map(service => (
                    <div key={service.id} onClick={() => navigate(createPageUrl("Marketplace"))}>
                      <ResultCard item={service} type="Service" icon={Briefcase} />
                    </div>
                  ))}
                  {services.length > 3 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("services")}
                      className="w-full"
                    >
                      View all {services.length} services
                    </Button>
                  )}
                </div>
              )}

              {experiences.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Experiences ({experiences.length})
                  </h3>
                  {experiences.slice(0, 3).map(exp => (
                    <div key={exp.id} onClick={() => navigate(createPageUrl("explore"))}>
                      <ResultCard item={exp} type="Experience" icon={Sparkles} />
                    </div>
                  ))}
                  {experiences.length > 3 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("experiences")}
                      className="w-full"
                    >
                      View all {experiences.length} experiences
                    </Button>
                  )}
                </div>
              )}

              {music.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Music ({music.length})
                  </h3>
                  {music.slice(0, 3).map(track => (
                    <div key={track.id} onClick={() => navigate(createPageUrl("Vibe"))}>
                      <ResultCard item={track} type="Music" icon={Music} />
                    </div>
                  ))}
                  {music.length > 3 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("music")}
                      className="w-full"
                    >
                      View all {music.length} tracks
                    </Button>
                  )}
                </div>
              )}

              {streaming.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Tv className="w-5 h-5" />
                    Shows & Movies ({streaming.length})
                  </h3>
                  {streaming.slice(0, 3).map(content => (
                    <div key={content.id} onClick={() => navigate(createPageUrl("Streaming"))}>
                      <ResultCard item={content} type="Streaming" icon={Tv} />
                    </div>
                  ))}
                  {streaming.length > 3 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("shows")}
                      className="w-full"
                    >
                      View all {streaming.length} shows
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-3">
              {users.map(user => (
                <div key={user.id} onClick={() => navigate(createPageUrl("UserProfile") + `?username=${user.username || user.email}`)}>
                  <ResultCard item={user} type="User" icon={User} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="services" className="space-y-3">
              {services.map(service => (
                <div key={service.id} onClick={() => navigate(createPageUrl("Marketplace"))}>
                  <ResultCard item={service} type="Service" icon={Briefcase} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="experiences" className="space-y-3">
              {experiences.map(exp => (
                <div key={exp.id} onClick={() => navigate(createPageUrl("explore"))}>
                  <ResultCard item={exp} type="Experience" icon={Sparkles} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="music" className="space-y-3">
              {music.map(track => (
                <div key={track.id} onClick={() => navigate(createPageUrl("Vibe"))}>
                  <ResultCard item={track} type="Music" icon={Music} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="shows" className="space-y-3">
              {streaming.map(content => (
                <div key={content.id} onClick={() => navigate(createPageUrl("Streaming"))}>
                  <ResultCard item={content} type="Streaming" icon={Tv} />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}