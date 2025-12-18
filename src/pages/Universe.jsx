import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Sparkles, Wallet, Plane, Heart, Cpu,
  ChevronDown, TrendingUp, Globe, Zap,
  ShoppingBag, Tv, Wand2, Activity, Search, UserCircle,
  Home,
  ChevronLeft,
  Building,
  Car,
  Music
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import CardStack from "../components/CardStack";

const pillars = [
  {
    id: "entertainment",
    title: "Entertainment",
    subtitle: "Exotic Experiences",
    icon: Sparkles,
    gradient: "from-purple-600 via-pink-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1566024287286-457247b70310?w=1200",
    features: ["Exotic Cars", "Yachts", "Wine Tastings", "Nightlife"],
    action: "EntertainmentExperiences"
  },
  {
    id: "social",
    title: "Social",
    subtitle: "Share Your Vibe",
    icon: Activity,
    gradient: "from-pink-600 via-rose-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200",
    features: ["Stories", "Live Posts", "Connect", "Experiences"],
    action: "Home"
  },
  {
    id: "music",
    title: "Music",
    subtitle: "Listen & Discover",
    icon: Music,
    gradient: "from-pink-600 via-purple-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200",
    features: ["All Genres", "Top Charts", "New Releases", "Your Artists"],
    action: "Vibe"
  },
  {
    id: "money",
    title: "Money & Wealth",
    subtitle: "Financial Freedom",
    icon: Wallet,
    gradient: "from-green-600 via-emerald-600 to-green-600",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200",
    features: ["SoFloCoin", "Private Banking", "Crypto Custody", "Assets"],
    action: "Wallet"
  },
  {
    id: "real_estate",
    title: "Real Estate & Stays",
    subtitle: "Find Your Space",
    icon: Building,
    gradient: "from-emerald-600 via-green-600 to-emerald-600",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    features: ["Short-Term Rentals", "Hotels", "Buy Property", "Apartments"],
    action: "RealEstate"
  },
  {
    id: "marketplace",
    title: "Marketplace",
    subtitle: "Services & Goods",
    icon: ShoppingBag,
    gradient: "from-amber-600 via-orange-600 to-amber-600",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200",
    features: ["60+ Services", "Home Services", "Luxury Goods", "Verified Pros"],
    action: "Marketplace"
  },
  {
    id: "streaming",
    title: "Streaming",
    subtitle: "Watch & Play",
    icon: Tv,
    gradient: "from-red-600 via-pink-600 to-red-600",
    image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200",
    features: ["Live Sports", "Gaming", "Shows & Movies", "Betting"],
    action: "Streaming"
  },
  {
    id: "travel",
    title: "Travel & Services",
    subtitle: "Lifestyle On-Demand",
    icon: Plane,
    gradient: "from-blue-600 via-cyan-600 to-blue-600",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200",
    features: ["Rides", "Flights", "Private Jets", "Yachts"],
    action: "Travel"
  },
  {
    id: "wellness",
    title: "Health & Wellness",
    subtitle: "Mind Body Spirit",
    icon: Heart,
    gradient: "from-green-600 via-teal-600 to-green-600", // Updated
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200",
    features: ["Medical Care", "Therapy", "Rehabilitation", "Senior Care"], // Updated
    action: "Wellness" // Updated
  },
  {
    id: "ai_creation",
    title: "AI Studio",
    subtitle: "Create & Develop",
    icon: Wand2,
    gradient: "from-violet-600 via-purple-600 to-violet-600",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200",
    features: ["Image Gen", "Code Dev", "Music AI", "Design Tools"],
    action: "AIStudio"
  },
  {
    id: "innovation",
    title: "Innovation",
    subtitle: "Future Tech",
    icon: Cpu,
    gradient: "from-indigo-600 via-purple-600 to-indigo-600",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
    features: ["IoT", "Satellites", "VR/AR", "Smart Energy"],
    action: "AIStudio"
  }
];

const updatedPillars = [
  {
    id: "universe_hub",
    title: "Universe Hub",
    subtitle: "News & Opportunities",
    icon: Globe,
    gradient: "from-cyan-600 via-blue-600 to-cyan-600",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
    features: ["World News", "Forums", "Jobs & Gigs", "Affiliate Programs"],
    action: "UniverseHub"
  },
  ...pillars,
  {
    id: "car_rentals",
    title: "Car Rentals",
    subtitle: "Drive Your Dream",
    icon: Car,
    gradient: "from-blue-600 via-indigo-600 to-blue-600",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200",
    features: ["Exotic Cars", "App Unlock", "Full Insurance", "Delivery"],
    action: "CarRentals"
  },
  {
    id: "memes",
    title: "Meme Creator",
    subtitle: "Create Viral Content",
    icon: Sparkles,
    gradient: "from-pink-600 via-purple-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200",
    features: ["Templates", "AI Text", "Custom Upload", "Share"],
    action: "MemeCreator"
  }
];

export default function Universe() {
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cards = updatedPillars.map((pillar) => ({
    id: pillar.id,
    content: (
      <div className="relative w-full h-full overflow-hidden rounded-3xl">
        <div className="absolute inset-0">
          <motion.img
            key={pillar.id}
            src={pillar.image}
            alt={pillar.title}
            className="w-full h-full object-cover"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6 }}
          />
        </div>

        <div className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} opacity-75`} />

        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-10, -110],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-12 overflow-hidden">
          <div className="flex items-start justify-between flex-shrink-0">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-3 sm:p-4 md:p-5 bg-white/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30"
            >
              <pillar.icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-end gap-2"
            >
              <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-xl rounded-full text-white text-xs sm:text-sm font-bold border border-white/30">
                {updatedPillars.findIndex(p => p.id === pillar.id) + 1}/{updatedPillars.length}
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 flex items-center min-h-0 py-2"
          >
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
              {pillar.features.map((feature, idx) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="px-2 sm:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-xl rounded-xl sm:rounded-2xl text-white text-center text-xs sm:text-sm md:text-base font-medium border border-white/30"
                >
                  {feature}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-shrink-0"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-1 sm:mb-3 drop-shadow-2xl leading-tight">
              {pillar.title}
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-3 sm:mb-6 drop-shadow-lg">
              {pillar.subtitle}
            </p>

            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigate(createPageUrl(pillar.action));
              }}
              role="button"
              tabIndex={0}
              className="w-full py-3 sm:py-4 md:py-5 bg-white/30 backdrop-blur-xl rounded-xl sm:rounded-2xl text-white text-sm sm:text-base md:text-lg font-bold hover:bg-white/40 active:scale-[0.98] transition border-2 border-white/50 shadow-2xl flex items-center justify-center gap-2 sm:gap-3 cursor-pointer touch-manipulation"
            >
              Enter {pillar.title}
              <span className="inline-block">→</span>
            </div>
          </motion.div>
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent" />
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent" />
        </div>
      </div>
    )
  }));

  if (showIntro) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20" />
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: Math.random() * 3
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 sm:px-6 max-w-4xl w-full overflow-y-auto max-h-[100dvh] py-8"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6 sm:mb-8 inline-block"
          >
            <span className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-purple-500/30 border-2 border-purple-400/50 text-purple-300 text-xs sm:text-sm font-bold backdrop-blur-xl">
              World's First Lifestyle Operating System
            </span>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl sm:text-6xl md:text-8xl font-bold mb-4 sm:mb-6"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 text-transparent bg-clip-text drop-shadow-2xl">
              PlaySoFlo
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-lg sm:text-2xl md:text-3xl text-gray-300 mb-4 sm:mb-6 leading-relaxed drop-shadow-lg"
          >
            Where music, money, fun, and identity blend seamlessly
          </motion.p>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-xl sm:text-3xl md:text-4xl text-purple-400 mb-8 sm:mb-12 font-bold"
          >
            Swipe into your lifestyle.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-8 sm:mb-12"
          >
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              <span className="text-white font-medium text-sm sm:text-base">{updatedPillars.length} Pillars</span>
            </div>
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <span className="text-white font-medium text-sm sm:text-base">Global Access</span>
            </div>
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              <span className="text-white font-medium text-sm sm:text-base">Instant</span>
            </div>
          </motion.div>

          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.3, type: "spring", stiffness: 200 }}
            onClick={() => setShowIntro(false)}
            className="px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-full text-white text-lg sm:text-xl font-bold hover:scale-110 transition-transform glow-effect shadow-2xl"
          >
            Start Swiping
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 2, repeat: Infinity }}
            className="mt-8 sm:mt-12 flex flex-col items-center gap-2"
          >
            <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-bounce" />
            <span className="text-purple-400 text-xs sm:text-sm font-medium">Swipe to explore</span>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Header with improved navigation */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
        className="absolute top-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 flex items-center gap-2 sm:gap-4 bg-black/50 backdrop-blur-md safe-area-top"
      >
        {/* Home Button - primary navigation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(createPageUrl("Home"));
          }}
          type="button"
          className="p-2 sm:p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20 flex-shrink-0 cursor-pointer"
          title="Home"
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search pillars..."
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 bg-white/10 backdrop-blur-md rounded-full text-white text-sm sm:text-base placeholder-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        {/* Profile Icon */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(createPageUrl("Profile"));
          }}
          type="button"
          className="p-2 sm:p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition border border-white/20 flex-shrink-0 cursor-pointer"
          title="View profile"
        >
          <UserCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
        </button>
      </motion.div>

      {/* CardStack container - uses remaining viewport */}
      <div className="absolute inset-0 pt-[60px] sm:pt-[72px] md:pt-[84px] px-3 sm:px-4 md:px-6 pb-[80px] sm:pb-[90px] safe-area-bottom">
        <div className="h-full w-full">
          <CardStack
            cards={cards}
            currentIndex={currentIndex}
            onCardChange={(index) => {
              setCurrentIndex(index);
            }}
          />
        </div>
      </div>

      {/* Swipe indicator */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-6 sm:bottom-4 left-0 right-0 pointer-events-none flex items-center justify-center z-40 safe-area-bottom"
      >
        <div className="text-center">
          <motion.div
            animate={{ x: [-20, 20, -20] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-white/60 text-sm sm:text-lg font-medium drop-shadow-lg"
          >
            ← Swipe Left or Right →
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}