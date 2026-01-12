import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Play, ChevronLeft, Tv, Gamepad2, Music, Radio,
  TrendingUp, Clock, Users, Sparkles, Film, Filter, SlidersHorizontal,
  Upload, Star, Calendar, DollarSign, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import PaymentConfirmation from "../components/payment/PaymentConfirmation";

const categories = [
  { id: "all", label: "All", icon: Tv },
  { id: "movies", label: "Movies", icon: Film },
  { id: "sports", label: "Sports", icon: TrendingUp },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "entertainment", label: "Shows", icon: Play },
  { id: "music", label: "Music", icon: Music },
  { id: "betting", label: "Betting", icon: TrendingUp },
];

const movieTypes = [
  { id: "all_movies", label: "All Movies" },
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "thriller", label: "Thriller" },
  { id: "horror", label: "Horror" },
  { id: "romance", label: "Romance" },
  { id: "animation", label: "Animation" },
  { id: "documentary", label: "Documentary" },
];

const showTypes = [
  { id: "all_shows", label: "All Shows" },
  { id: "reality", label: "Reality TV" },
  { id: "sitcom", label: "Sitcom" },
  { id: "drama_series", label: "Drama Series" },
  { id: "documentary_series", label: "Documentary" },
  { id: "talk_show", label: "Talk Show" },
  { id: "competition", label: "Competition" },
  { id: "news", label: "News" },
];

const sportsTypes = [
  { id: "all_sports", label: "All Sports" },
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
  { id: "soccer", label: "Soccer" },
  { id: "baseball", label: "Baseball" },
  { id: "tennis", label: "Tennis" },
  { id: "mma", label: "MMA/Boxing" },
  { id: "racing", label: "Racing" },
];

const availabilityOptions = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "subscription", label: "Subscription" },
  { value: "rent_buy", label: "Rent/Buy" },
];

const sortOptions = [
  { value: "popularity", label: "Most Popular" },
  { value: "release_date", label: "Release Date" },
  { value: "rating", label: "Highest Rated" },
  { value: "title", label: "Title (A-Z)" },
];

export default function Streaming() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMovieType, setSelectedMovieType] = useState("all_movies");
  const [selectedShowType, setSelectedShowType] = useState("all_shows");
  const [selectedSportType, setSelectedSportType] = useState("all_sports");
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [genreFilter, setGenreFilter] = useState("");

  // Upload states
  const [uploadData, setUploadData] = useState({
    title: "",
    type: "movie",
    category: "entertainment",
    description: "",
    thumbnail_url: "",
    duration: "",
    rating: "",
    requires_subscription: false,
    is_monetized: false,
    price_usd: 0,
    rental_price_usd: 0,
  });
  const [uploading, setUploading] = useState(false);
  
  // Purchase states
  const [selectedContent, setSelectedContent] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseType, setPurchaseType] = useState("buy");
  const [processing, setProcessing] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [confirmedPurchase, setConfirmedPurchase] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: content = [], isLoading } = useQuery({
    queryKey: ['streaming-content'],
    queryFn: () => base44.entities.StreamingContent.list(),
    initialData: []
  });

  const trendingContent = [...content]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  const filteredContent = (() => {
    let filtered = content;
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by main category
    if (selectedCategory === "movies") {
      filtered = content.filter(item => item.type === "movie");
      
      // Filter movies by subcategory
      if (selectedMovieType !== "all_movies") {
        filtered = filtered.filter(item => 
          item.description?.toLowerCase().includes(selectedMovieType) ||
          item.title?.toLowerCase().includes(selectedMovieType)
        );
      }
    } else if (selectedCategory === "entertainment") {
      filtered = content.filter(item => item.type === "series" || item.category === "entertainment");
      
      // Filter shows by subcategory
      if (selectedShowType !== "all_shows") {
        filtered = filtered.filter(item => 
          item.description?.toLowerCase().includes(selectedShowType.replace('_', ' ')) ||
          item.title?.toLowerCase().includes(selectedShowType.replace('_', ' '))
        );
      }
    } else if (selectedCategory === "sports") {
      filtered = content.filter(item => item.category === "sports");
      
      // Filter sports by subcategory
      if (selectedSportType !== "all_sports") {
        filtered = filtered.filter(item => 
          item.description?.toLowerCase().includes(selectedSportType) ||
          item.title?.toLowerCase().includes(selectedSportType)
        );
      }
    } else if (selectedCategory !== "all") {
      filtered = content.filter(item => item.category === selectedCategory);
    }
    
    // Filter by genre
    if (genreFilter) {
      filtered = filtered.filter(item => 
        item.description?.toLowerCase().includes(genreFilter.toLowerCase()) ||
        item.title?.toLowerCase().includes(genreFilter.toLowerCase())
      );
    }
    
    // Filter by year
    if (yearFilter) {
      filtered = filtered.filter(item => 
        item.description?.includes(yearFilter) || item.title?.includes(yearFilter)
      );
    }
    
    // Filter by rating
    if (ratingFilter) {
      const minRating = parseFloat(ratingFilter);
      filtered = filtered.filter(item => 
        item.rating && parseFloat(item.rating) >= minRating
      );
    }
    
    // Filter by availability
    if (availabilityFilter !== "all") {
      if (availabilityFilter === "free") {
        filtered = filtered.filter(item => !item.requires_subscription);
      } else if (availabilityFilter === "subscription") {
        filtered = filtered.filter(item => item.requires_subscription);
      }
    }
    
    // Sort content
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "popularity") {
        return (b.views || 0) - (a.views || 0);
      } else if (sortBy === "release_date") {
        return new Date(b.created_date) - new Date(a.created_date);
      } else if (sortBy === "rating") {
        return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      } else if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
    
    return filtered;
  })();

  const handleUpload = async () => {
    if (!currentUser) {
      toast.error("Please log in to upload content");
      return;
    }
    
    if (!uploadData.title || !uploadData.thumbnail_url) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setUploading(true);
    try {
      await base44.entities.StreamingContent.create({
        ...uploadData,
        creator_email: currentUser.email,
        rating: parseFloat(uploadData.rating) || 0,
        price_usd: parseFloat(uploadData.price_usd) || 0,
        rental_price_usd: parseFloat(uploadData.rental_price_usd) || 0,
      });
      toast.success("Content uploaded successfully!");
      setShowUpload(false);
      setUploadData({
        title: "",
        type: "movie",
        category: "entertainment",
        description: "",
        thumbnail_url: "",
        duration: "",
        rating: "",
        requires_subscription: false,
        is_monetized: false,
        price_usd: 0,
        rental_price_usd: 0,
      });
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePurchase = async () => {
    if (!currentUser || !selectedContent) return;
    
    setProcessing(true);
    try {
      const price = purchaseType === "rent" ? selectedContent.rental_price_usd : selectedContent.price_usd;
      const platformFeePercent = 0.15; // 15% platform fee
      const platformFee = price * platformFeePercent;
      const creatorEarnings = price - platformFee;
      
      // Check if user has enough balance
      if (currentUser.balance_usd < price) {
        toast.error("Insufficient wallet balance. Please add funds to your wallet.");
        setProcessing(false);
        return;
      }
      
      // Deduct from buyer's wallet
      await base44.auth.updateMe({
        balance_usd: currentUser.balance_usd - price
      });
      
      // Add to creator's balance using service role
      const creators = await base44.entities.User.filter({ email: selectedContent.creator_email });
      if (creators.length > 0) {
        const creator = creators[0];
        await base44.asServiceRole.entities.User.update(creator.id, {
          balance_usd: (creator.balance_usd || 0) + creatorEarnings
        });
      }
      
      // Create purchase record
      const expiresAt = purchaseType === "rent" 
        ? new Date(Date.now() + (selectedContent.rental_duration_hours || 48) * 60 * 60 * 1000).toISOString()
        : null;
        
      const purchase = await base44.entities.ContentPurchase.create({
        content_id: selectedContent.id,
        buyer_email: currentUser.email,
        creator_email: selectedContent.creator_email,
        amount_usd: price,
        purchase_type: purchaseType,
        payment_method: "wallet",
        access_expires_at: expiresAt,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings
      });

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: price,
        amount_rri: 0,
        method: "wallet",
        status: "completed",
        reference_type: "other",
        reference_id: purchase.id,
        sender_email: currentUser.email,
        recipient_email: selectedContent.creator_email,
        memo: `${purchaseType === "rent" ? "Rental" : "Purchase"}: ${selectedContent.title}`
      });

      // Notify creator
      await base44.entities.Notification.create({
        recipient_email: selectedContent.creator_email,
        type: "payment_received",
        title: "Content Purchase",
        message: `${currentUser.full_name || currentUser.email} ${purchaseType === "rent" ? "rented" : "purchased"} your content "${selectedContent.title}" for $${price.toFixed(2)}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        read: false
      });
      
      setConfirmedPurchase({ amount: price, title: selectedContent.title });
      setShowPaymentConfirmation(true);
      setShowPurchaseModal(false);
    } catch (error) {
      toast.error("Purchase failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleTip = async (content, amount) => {
    if (!currentUser) {
      toast.error("Please log in to send tips");
      return;
    }
    
    if (currentUser.balance_usd < amount) {
      toast.error("Insufficient wallet balance. Please add funds to your wallet.");
      return;
    }
    
    try {
      // Deduct from tipper's wallet
      await base44.auth.updateMe({
        balance_usd: currentUser.balance_usd - amount
      });
      
      // Add to creator's wallet using service role
      const creators = await base44.entities.User.filter({ email: content.creator_email || content.created_by });
      if (creators.length > 0) {
        const creator = creators[0];
        await base44.asServiceRole.entities.User.update(creator.id, {
          balance_usd: (creator.balance_usd || 0) + amount
        });
      }
      
      // Create tip transaction
      await base44.entities.TipTransaction.create({
        creator_email: content.creator_email || content.created_by,
        tipper_email: currentUser.email,
        amount_usd: amount,
        content_id: String(content.id)
      });

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: amount,
        amount_rri: 0,
        method: "wallet",
        status: "completed",
        reference_type: "other",
        sender_email: currentUser.email,
        recipient_email: content.creator_email || content.created_by,
        memo: `Tip for: ${content.title}`
      });

      // Notify creator
      await base44.entities.Notification.create({
        recipient_email: content.creator_email || content.created_by,
        type: "payment_received",
        title: "Tip Received",
        message: `${currentUser.full_name || currentUser.email} tipped you $${amount.toFixed(2)}!`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        read: false
      });
      
      // Update user state
      const updatedUser = await base44.auth.me();
      setCurrentUser(updatedUser);
      
      setConfirmedPurchase({ amount, title: "Tip sent" });
      setShowPaymentConfirmation(true);
    } catch (error) {
      toast.error("Tip failed: " + error.message);
    }
  };

  const checkAccess = async (content) => {
    if (!content.is_monetized) return true;
    if (!currentUser) return false;
    if (content.creator_email === currentUser.email) return true;
    
    const purchases = await base44.entities.ContentPurchase.filter({
      content_id: content.id,
      buyer_email: currentUser.email
    });
    
    if (purchases.length === 0) return false;
    
    const purchase = purchases[0];
    if (purchase.purchase_type === "buy") return true;
    if (purchase.purchase_type === "rent") {
      return new Date(purchase.access_expires_at) > new Date();
    }
    
    return false;
  };

  const handleContentClick = async (content) => {
    const hasAccess = await checkAccess(content);
    
    if (!hasAccess && content.is_monetized) {
      setSelectedContent(content);
      setShowPurchaseModal(true);
    } else {
      // Navigate to viewer or play content
      toast.info("Playing content...");
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadData({ ...uploadData, thumbnail_url: file_url });
      toast.success("Thumbnail uploaded!");
    } catch (error) {
      toast.error("Image upload failed");
    }
  };

  const liveContent = content.filter(item => item.is_live);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-gray-950 pb-20">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/50 to-transparent" />
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
            Streaming
          </h1>
          <p className="text-gray-300 text-lg">
            Watch live sports, shows, gaming & more
          </p>
        </div>
      </div>

      {/* Content Discovery Section */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Discover Content</h2>
              <p className="text-gray-300">Personalized recommendations based on your interests</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {currentUser && (
                <Button
                  onClick={() => setShowUpload(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl("Gaming"))}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Play Games
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("PersonalizedFeed"))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explore
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">2.4M</p>
              <p className="text-gray-400 text-xs">Trending Now</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">850K</p>
              <p className="text-gray-400 text-xs">Creators</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <Play className="w-8 h-8 text-pink-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">15K</p>
              <p className="text-gray-400 text-xs">Live Streams</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-8">
        <Input
          type="text"
          placeholder="Search content by title, description, genre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-12 text-lg"
        />
      </div>

      {/* Trending Now Section */}
      {trendingContent.length > 0 && !searchQuery && (
        <div className="px-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            Trending Now
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {trendingContent.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group cursor-pointer relative"
              >
                <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  #{idx + 1}
                </div>
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gray-900">
                  <img 
                    src={item.thumbnail_url} 
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-orange-500/90 rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                    <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                      <Users className="w-3 h-3" />
                      {item.views || 0} views
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {liveContent.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveContent.slice(0, 2).map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative h-48 rounded-2xl overflow-hidden cursor-pointer group"
              >
                <img 
                  src={item.thumbnail_url} 
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                
                <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 rounded-full text-xs font-bold text-white flex items-center gap-1 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  LIVE
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-4 text-gray-300 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      45.2K watching
                    </div>
                    {item.betting_available && (
                      <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300 text-xs font-bold">
                        Bet Live
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar flex-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (cat.id !== "movies") setSelectedMovieType("all_movies");
                  if (cat.id !== "entertainment") setSelectedShowType("all_shows");
                  if (cat.id !== "sports") setSelectedSportType("all_sports");
                }}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                  selectedCategory === cat.id
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="bg-white/10 border-white/20 hover:bg-white/20 flex-shrink-0 ml-4"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Genre</label>
                <Input
                  type="text"
                  placeholder="e.g., Action, Drama"
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Availability</label>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Min Rating</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="e.g., 7.5"
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Year</label>
                <Input
                  type="text"
                  placeholder="e.g., 2024"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setGenreFilter("");
                  setYearFilter("");
                  setRatingFilter("");
                  setAvailabilityFilter("all");
                  setSortBy("popularity");
                }}
                variant="outline"
                className="bg-white/5 border-white/20"
              >
                Clear All Filters
              </Button>
            </div>
          </motion.div>
        )}

        {/* Movie Subcategories */}
        {selectedCategory === "movies" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar mt-4">
            {movieTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedMovieType(type.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedMovieType === type.id
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        {/* Shows Subcategories */}
        {selectedCategory === "entertainment" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar mt-4">
            {showTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedShowType(type.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedShowType === type.id
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        {/* Sports Subcategories */}
        {selectedCategory === "sports" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar mt-4">
            {sportsTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedSportType(type.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedSportType === type.id
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6">
        <h2 className="text-2xl font-bold text-white mb-4">Browse Content</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredContent.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group cursor-pointer"
                onClick={() => handleContentClick(item)}
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gray-900">
                  <img 
                    src={item.thumbnail_url} 
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-red-500/90 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>

                  {/* Monetization badges */}
                  {item.is_monetized && (
                    <div className="absolute top-2 left-2 z-10 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {item.rental_price_usd > 0 ? `$${item.rental_price_usd}` : `$${item.price_usd}`}
                    </div>
                  )}
                  
                  {/* Tip button */}
                  <div className="absolute right-2 top-2 z-10">
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const amountStr = prompt('Tip amount in USD:');
                        if (!amountStr) return;
                        const amount = parseFloat(amountStr);
                        if (isNaN(amount) || amount <= 0) {
                          toast.error("Invalid amount");
                          return;
                        }
                        await handleTip(item, amount);
                      }}
                    >
                      Tip
                    </Button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                    <h3 className="text-white font-bold mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                      {item.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration}
                        </div>
                      )}
                      {item.rating && (
                        <span>★ {item.rating}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredContent.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tv className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No content found</h3>
            <p className="text-gray-400">Try selecting a different category</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={() => setShowUpload(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Upload Content
              </h2>
              <button onClick={() => setShowUpload(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Title *</label>
                <Input
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  placeholder="Enter content title"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Type</label>
                  <Select 
                    value={uploadData.type} 
                    onValueChange={(v) => setUploadData({ ...uploadData, type: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="series">TV Series</SelectItem>
                      <SelectItem value="live_sports">Live Sports</SelectItem>
                      <SelectItem value="live_event">Live Event</SelectItem>
                      <SelectItem value="gaming_stream">Gaming Stream</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Category</label>
                  <Select 
                    value={uploadData.category} 
                    onValueChange={(v) => setUploadData({ ...uploadData, category: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                <Textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Describe your content..."
                  className="bg-white/10 border-white/20 text-white"
                  rows={4}
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Thumbnail *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => document.getElementById('thumbnail-upload').click()}
                    variant="outline"
                    className="bg-white/10 border-white/20"
                  >
                    Choose Image
                  </Button>
                  {uploadData.thumbnail_url && (
                    <img src={uploadData.thumbnail_url} className="h-10 w-16 object-cover rounded" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Duration</label>
                  <Input
                    value={uploadData.duration}
                    onChange={(e) => setUploadData({ ...uploadData, duration: e.target.value })}
                    placeholder="e.g., 2h 30m"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Rating (0-10)</label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={uploadData.rating}
                    onChange={(e) => setUploadData({ ...uploadData, rating: e.target.value })}
                    placeholder="e.g., 8.5"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  checked={uploadData.requires_subscription}
                  onChange={(e) => setUploadData({ ...uploadData, requires_subscription: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-white text-sm">Requires subscription</label>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-xl mb-4">
                  <input
                    type="checkbox"
                    checked={uploadData.is_monetized}
                    onChange={(e) => setUploadData({ ...uploadData, is_monetized: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-white text-sm font-medium">Enable monetization</label>
                </div>

                {uploadData.is_monetized && (
                  <div className="space-y-4 pl-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Purchase Price (USD)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={uploadData.price_usd}
                        onChange={(e) => setUploadData({ ...uploadData, price_usd: e.target.value })}
                        placeholder="e.g., 9.99"
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Users can buy permanent access</p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Rental Price (USD)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={uploadData.rental_price_usd}
                        onChange={(e) => setUploadData({ ...uploadData, rental_price_usd: e.target.value })}
                        placeholder="e.g., 3.99"
                        className="bg-white/10 border-white/20 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">48-hour rental access (optional)</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-300 text-xs">
                        <strong>Note:</strong> Platform takes 15% commission. You'll receive 85% of each sale.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {uploading ? "Uploading..." : "Upload Content"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Payment Confirmation */}
      {showPaymentConfirmation && confirmedPurchase && (
        <PaymentConfirmation
          amount={confirmedPurchase.amount}
          currency="USD"
          type="purchase"
          onClose={() => {
            setShowPaymentConfirmation(false);
            setConfirmedPurchase(null);
            window.location.reload();
          }}
        />
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={() => setShowPurchaseModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Purchase Content</h2>
              <button onClick={() => setShowPurchaseModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">{selectedContent.title}</h3>
                {selectedContent.duration && (
                  <p className="text-gray-400 text-sm">{selectedContent.duration}</p>
                )}
              </div>

              <div className="space-y-2">
                {selectedContent.price_usd > 0 && (
                  <button
                    onClick={() => setPurchaseType("buy")}
                    className={`w-full p-4 rounded-xl border-2 transition ${
                      purchaseType === "buy"
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-white font-bold">Buy</p>
                        <p className="text-gray-400 text-sm">Permanent access</p>
                      </div>
                      <p className="text-green-400 font-bold text-xl">${selectedContent.price_usd}</p>
                    </div>
                  </button>
                )}

                {selectedContent.rental_price_usd > 0 && (
                  <button
                    onClick={() => setPurchaseType("rent")}
                    className={`w-full p-4 rounded-xl border-2 transition ${
                      purchaseType === "rent"
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-white font-bold">Rent</p>
                        <p className="text-gray-400 text-sm">48-hour access</p>
                      </div>
                      <p className="text-blue-400 font-bold text-xl">${selectedContent.rental_price_usd}</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Your wallet balance:</span>
                  <span className="text-white font-bold">${currentUser?.balance_usd?.toFixed(2) || "0.00"}</span>
                </div>
                {currentUser && currentUser.balance_usd < (purchaseType === "rent" ? selectedContent.rental_price_usd : selectedContent.price_usd) && (
                  <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                    Insufficient balance. Add funds to your wallet.
                  </div>
                )}
              </div>

              <Button
                onClick={handlePurchase}
                disabled={processing || !currentUser || currentUser.balance_usd < (purchaseType === "rent" ? selectedContent.rental_price_usd : selectedContent.price_usd)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {processing ? "Processing..." : `Confirm ${purchaseType === "rent" ? "Rental" : "Purchase"}`}
              </Button>

              <Button
                onClick={() => navigate(createPageUrl("Wallet"))}
                variant="outline"
                className="w-full bg-white/5 border-white/20"
              >
                Add Funds to Wallet
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}