import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, AtSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UserSearchBar({ placeholder = "Search users by @username..." }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchUsers = async () => {
      setSearching(true);
      try {
        const allUsers = await base44.entities.User.list();
        const searchTerm = query.toLowerCase().replace('@', '');
        
        const filtered = allUsers.filter(user => 
          user.username?.toLowerCase().includes(searchTerm) ||
          user.full_name?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
        ).slice(0, 10);
        
        setResults(filtered);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleUserSelect = (user) => {
    navigate(createPageUrl("UserProfile") + `?username=${user.username || user.email}`);
    setQuery("");
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {user.full_name?.[0] || "U"}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-white font-semibold truncate">{user.full_name}</p>
                <p className="text-purple-400 text-xs flex items-center gap-1 truncate">
                  <AtSign className="w-3 h-3" />
                  {user.username || user.email?.split('@')[0]}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !searching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl p-4 z-50">
          <p className="text-gray-400 text-sm text-center">No users found</p>
        </div>
      )}
    </div>
  );
}