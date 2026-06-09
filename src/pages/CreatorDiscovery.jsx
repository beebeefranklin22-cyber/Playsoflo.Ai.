import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Star, Users, Briefcase, Music, Tv, ChevronRight, MapPin, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const TABS = [
  { id: "creators", label: "Creators & Artists", icon: Music },
  { id: "providers", label: "Service Providers", icon: Briefcase },
];

export default function CreatorDiscovery() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("creators");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["creator-directory"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000,
    initialData: [],
  });

  const { data: marketplaceItems = [] } = useQuery({
    queryKey: ["provider-directory-items"],
    queryFn: () => base44.entities.MarketplaceItem.list(),
    staleTime: 60000,
    initialData: [],
  });

  // Build a set of provider emails
  const providerEmails = new Set(marketplaceItems.map(i => i.provider_email || i.created_by).filter(Boolean));

  const creators = allUsers.filter(u =>
    (u.is_creator || u.is_musician || u.username) &&
    u.email !== currentUser?.email &&
    (!searchQuery || u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const providers = allUsers.filter(u =>
    (u.is_provider || u.is_restaurant_owner || u.is_driver || providerEmails.has(u.email)) &&
    u.email !== currentUser?.email &&
    (!searchQuery || u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const list = activeTab === "creators" ? creators : providers;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-fuchsia-400" />
          Creator Directory
        </h1>
        <p className="text-gray-400 text-sm">Browse creators, artists & service providers</p>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-fuchsia-500 transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-5 flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-fuchsia-600 text-white"
                : "bg-white/10 text-gray-400 hover:text-white hover:bg-white/20"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-white/10"}`}>
              {activeTab === tab.id ? list.length : (tab.id === "creators" ? creators.length : providers.length)}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">No {activeTab} found</p>
            {searchQuery && <p className="text-gray-600 text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((user, idx) => {
              const providerItems = marketplaceItems.filter(i => i.provider_email === user.email || i.created_by === user.email);
              return (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(user.email)}`)}
                  className="group bg-white/5 border border-white/10 hover:border-fuchsia-500/40 rounded-2xl p-4 text-left transition-all hover:bg-white/10 active:scale-95"
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center mb-3 mx-auto">
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xl">{user.full_name?.[0]?.toUpperCase() || "U"}</span>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <p className="text-white font-semibold text-sm truncate">{user.full_name || "User"}</p>
                      {user.verified && <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                    </div>
                    {user.username && (
                      <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                    )}
                    {user.city && (
                      <div className="flex items-center justify-center gap-1 mt-1 text-gray-500 text-[10px]">
                        <MapPin className="w-2.5 h-2.5" />
                        {user.city}
                      </div>
                    )}
                    {activeTab === "providers" && providerItems.length > 0 && (
                      <Badge className="mt-2 bg-fuchsia-500/20 text-fuchsia-300 text-[10px] border-0">
                        {providerItems.length} service{providerItems.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {activeTab === "creators" && (user.is_musician || user.is_creator) && (
                      <div className="mt-2 flex gap-1 justify-center flex-wrap">
                        {user.is_musician && <Badge className="bg-pink-500/20 text-pink-300 text-[10px] border-0">Music</Badge>}
                        {user.is_creator && <Badge className="bg-purple-500/20 text-purple-300 text-[10px] border-0">Creator</Badge>}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-center text-fuchsia-400 text-xs font-semibold gap-1 opacity-0 group-hover:opacity-100 transition">
                    View Profile <ChevronRight className="w-3 h-3" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}