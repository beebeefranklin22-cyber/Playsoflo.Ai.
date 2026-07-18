import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Search, Newspaper, Briefcase, MessageSquare, TrendingUp, Filter, X, ChevronRight, Calendar, MapPin, DollarSign, Eye, Heart, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import moment from "moment";

export default function CommunitySearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState(["news", "jobs", "forums", "affiliates"]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch news posts
  const { data: newsResults = [], isLoading: loadingNews } = useQuery({
    queryKey: ["community-search-news", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || !selectedCategories.includes("news")) return [];
      const posts = await base44.entities.NewsPost.filter({ status: "published" });
      return posts.filter(post => 
        post.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        post.content?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        post.category?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: selectedCategories.includes("news") && debouncedQuery.trim().length > 0
  });

  // Fetch job/gig posts
  const { data: jobResults = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["community-search-jobs", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || !selectedCategories.includes("jobs")) return [];
      const jobs = await base44.entities.JobGig.filter({ status: "active" });
      return jobs.filter(job => 
        job.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        job.category?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        job.location?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: selectedCategories.includes("jobs") && debouncedQuery.trim().length > 0
  });

  // Fetch forum threads
  const { data: forumResults = [], isLoading: loadingForums } = useQuery({
    queryKey: ["community-search-forums", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || !selectedCategories.includes("forums")) return [];
      const threads = await base44.entities.ForumThread.list();
      return threads.filter(thread => 
        thread.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        thread.content?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        thread.category?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: selectedCategories.includes("forums") && debouncedQuery.trim().length > 0
  });

  // Fetch affiliate listings
  const { data: affiliateResults = [], isLoading: loadingAffiliates } = useQuery({
    queryKey: ["community-search-affiliates", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim() || !selectedCategories.includes("affiliates")) return [];
      const listings = await base44.entities.AffiliateListing.filter({ status: "active" });
      return listings.filter(listing => 
        listing.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        listing.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        listing.category?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        listing.company_name?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: selectedCategories.includes("affiliates") && debouncedQuery.trim().length > 0
  });

  const isLoading = loadingNews || loadingJobs || loadingForums || loadingAffiliates;
  const totalResults = newsResults.length + jobResults.length + forumResults.length + affiliateResults.length;

  const categoryOptions = [
    { id: "news", label: "News", icon: Newspaper, count: newsResults.length },
    { id: "jobs", label: "Jobs & Gigs", icon: Briefcase, count: jobResults.length },
    { id: "forums", label: "Forums", icon: MessageSquare, count: forumResults.length },
    { id: "affiliates", label: "Affiliate Programs", icon: TrendingUp, count: affiliateResults.length }
  ];

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(createPageUrl("CommunityHub"))}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-100 transition mb-4"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span>Back to Community Hub</span>
          </button>

          <h1 className="text-4xl font-bold text-white mb-2">Community Search</h1>
          <p className="text-gray-300">Search across all community sections</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search news, jobs, forums, affiliate programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 py-6 text-lg bg-white/5 border-white/10 text-white placeholder-gray-400 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              {debouncedQuery.trim() && (
                <>
                  <span className="font-semibold text-white">{totalResults}</span>
                  <span>result{totalResults !== 1 ? 's' : ''} found</span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Filter by Category</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categoryOptions.map(category => {
                    const Icon = category.icon;
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/20 text-gray-400 hover:border-purple-500/50'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{category.label}</span>
                        {debouncedQuery.trim() && (
                          <Badge variant="secondary" className="text-xs">
                            {category.count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && debouncedQuery.trim() && (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-300">Searching...</p>
          </div>
        )}

        {/* Empty State */}
        {!debouncedQuery.trim() && !isLoading && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Start searching</h3>
            <p className="text-gray-400">Enter keywords to search across all community sections</p>
          </div>
        )}

        {/* No Results */}
        {debouncedQuery.trim() && !isLoading && totalResults === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
            <p className="text-gray-400">Try different keywords or adjust your filters</p>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-8">
          {/* News Results */}
          {selectedCategories.includes("news") && newsResults.length > 0 && (
            <ResultSection
              title="News & Updates"
              icon={Newspaper}
              count={newsResults.length}
              color="blue"
            >
              {newsResults.map(post => (
                <NewsResultCard key={post.id} post={post} navigate={navigate} />
              ))}
            </ResultSection>
          )}

          {/* Job Results */}
          {selectedCategories.includes("jobs") && jobResults.length > 0 && (
            <ResultSection
              title="Jobs & Gigs"
              icon={Briefcase}
              count={jobResults.length}
              color="green"
            >
              {jobResults.map(job => (
                <JobResultCard key={job.id} job={job} navigate={navigate} />
              ))}
            </ResultSection>
          )}

          {/* Forum Results */}
          {selectedCategories.includes("forums") && forumResults.length > 0 && (
            <ResultSection
              title="Forum Discussions"
              icon={MessageSquare}
              count={forumResults.length}
              color="purple"
            >
              {forumResults.map(thread => (
                <ForumResultCard key={thread.id} thread={thread} navigate={navigate} />
              ))}
            </ResultSection>
          )}

          {/* Affiliate Results */}
          {selectedCategories.includes("affiliates") && affiliateResults.length > 0 && (
            <ResultSection
              title="Affiliate Programs"
              icon={TrendingUp}
              count={affiliateResults.length}
              color="orange"
            >
              {affiliateResults.map(listing => (
                <AffiliateResultCard key={listing.id} listing={listing} navigate={navigate} />
              ))}
            </ResultSection>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, icon: Icon, count, color, children }) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    orange: "bg-orange-500/20 text-orange-400 border-orange-500/30"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <Badge variant="secondary" className="ml-auto">{count}</Badge>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  );
}

function NewsResultCard({ post, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("CommunityNews"))}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
              {post.category}
            </Badge>
            <span className="text-xs text-gray-400">
              {moment(post.created_date).fromNow()}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {post.content?.substring(0, 150)}...
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{post.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{post.likes?.length || 0}</span>
            </div>
            <span>by {post.author_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobResultCard({ job, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("CommunityJobs"))}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
              {job.type}
            </Badge>
            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
              {job.category}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
            {job.title}
          </h3>
        </div>
      </div>
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
        {job.description?.substring(0, 120)}...
      </p>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {job.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
          </div>
        )}
        {job.pay_rate && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span>{job.pay_rate}</span>
          </div>
        )}
        <span>by {job.poster_name}</span>
      </div>
    </div>
  );
}

function ForumResultCard({ thread, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("CommunityForums"))}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition cursor-pointer group"
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
          {thread.category}
        </Badge>
        {thread.is_pinned && (
          <Badge className="text-xs bg-yellow-500/20 text-yellow-400">Pinned</Badge>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {moment(thread.created_date).fromNow()}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
        {thread.title}
      </h3>
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
        {thread.content?.substring(0, 150)}...
      </p>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          <span>{thread.views || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          <span>{thread.reply_count || 0} replies</span>
        </div>
        <span>by {thread.author_name}</span>
      </div>
    </div>
  );
}

function AffiliateResultCard({ listing, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("CommunityAffiliate"))}
      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        {listing.featured_image && (
          <img
            src={listing.featured_image}
            alt={listing.title}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
              {listing.category}
            </Badge>
            {listing.commission_rate && (
              <Badge className="text-xs bg-green-500/20 text-green-400">
                {listing.commission_rate} commission
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition">
            {listing.title}
          </h3>
          {listing.company_name && (
            <p className="text-sm text-gray-400 mb-2">by {listing.company_name}</p>
          )}
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {listing.description?.substring(0, 120)}...
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{listing.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <ExternalLink className="w-4 h-4" />
              <span>{listing.clicks || 0} clicks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
