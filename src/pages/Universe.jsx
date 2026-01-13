import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Sparkles, Wallet, Plane, Heart, Cpu,
  ChevronDown, TrendingUp, Globe, Zap,
  ShoppingBag, Tv, Wand2, Activity, Search, UserCircle,
  Home, // Added Home icon
  ChevronLeft, // Added ChevronLeft icon
  Building, // Added Building icon for Real Estate
  Car, // Added Car icon for Car Rentals
  Music // Added Music icon
} from "lucide-react"; // Changed import from "lucide" to "lucide-react"
import { motion } from "framer-motion";
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
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200",
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
  },
  {
    id: "live_sports",
    title: "Live Sports",
    subtitle: "Watch & Bet Live",
    icon: Activity,
    gradient: "from-green-600 via-lime-600 to-green-600",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200",
    features: ["Live Games", "Betting", "Fantasy", "Scores"],
    action: "Streaming"
  },
  {
    id: "comedy_clubs",
    title: "Comedy Clubs",
    subtitle: "Stand-Up & Laughs",
    icon: Sparkles,
    gradient: "from-yellow-600 via-orange-600 to-yellow-600",
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200",
    features: ["Stand-Up", "Open Mic", "Improv", "Shows"],
    action: "Events"
  },
  {
    id: "concerts",
    title: "Concerts & Shows",
    subtitle: "Live Music Events",
    icon: Music,
    gradient: "from-pink-600 via-red-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200",
    features: ["Artists", "Venues", "VIP", "Tickets"],
    action: "Events"
  },
  {
    id: "theatre",
    title: "Theatre & Broadway",
    subtitle: "Stage Performances",
    icon: Activity,
    gradient: "from-red-600 via-rose-600 to-red-600",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200",
    features: ["Plays", "Musicals", "Ballet", "Opera"],
    action: "Events"
  },
  {
    id: "festivals",
    title: "Festivals",
    subtitle: "Music & Culture",
    icon: Sparkles,
    gradient: "from-orange-600 via-amber-600 to-orange-600",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200",
    features: ["EDM", "Rock", "Hip-Hop", "Food"],
    action: "Events"
  },
  {
    id: "nightlife",
    title: "Nightlife",
    subtitle: "Clubs & Lounges",
    icon: Sparkles,
    gradient: "from-purple-600 via-fuchsia-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1200",
    features: ["VIP Tables", "DJ Sets", "Bottle Service", "Events"],
    action: "Events"
  },
  {
    id: "karaoke",
    title: "Karaoke Bars",
    subtitle: "Sing Your Heart Out",
    icon: Music,
    gradient: "from-cyan-600 via-blue-600 to-cyan-600",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",
    features: ["Private Rooms", "Public Stage", "Songs", "Events"],
    action: "Events"
  },
  {
    id: "escape_rooms",
    title: "Escape Rooms",
    subtitle: "Solve & Escape",
    icon: Cpu,
    gradient: "from-indigo-600 via-purple-600 to-indigo-600",
    image: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1200",
    features: ["Themes", "Teams", "Puzzles", "Adventure"],
    action: "Events"
  },
  {
    id: "arcade",
    title: "Arcade Centers",
    subtitle: "Classic & Modern",
    icon: Activity,
    gradient: "from-red-600 via-pink-600 to-red-600",
    image: "https://images.unsplash.com/photo-1511882150382-421056c89033?w=1200",
    features: ["Retro Games", "VR", "Prizes", "Tournaments"],
    action: "Gaming"
  },
  {
    id: "bowling",
    title: "Bowling Alleys",
    subtitle: "Strike & Chill",
    icon: Activity,
    gradient: "from-blue-600 via-cyan-600 to-blue-600",
    image: "https://images.unsplash.com/photo-1598713424137-d1ca8f539cbd?w=1200",
    features: ["Lanes", "Cosmic", "Leagues", "Party"],
    action: "Events"
  },
  {
    id: "cinema",
    title: "Cinema & IMAX",
    subtitle: "Big Screen Magic",
    icon: Tv,
    gradient: "from-purple-600 via-violet-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200",
    features: ["Premieres", "IMAX", "4DX", "Showtimes"],
    action: "Streaming"
  },
  {
    id: "theme_parks",
    title: "Theme Parks",
    subtitle: "Thrills & Adventure",
    icon: Activity,
    gradient: "from-green-600 via-emerald-600 to-green-600",
    image: "https://images.unsplash.com/photo-1594995438559-e2a1b1a9492d?w=1200",
    features: ["Rides", "Shows", "Fast Pass", "Tickets"],
    action: "Events"
  },
  {
    id: "water_parks",
    title: "Water Parks",
    subtitle: "Splash & Slide",
    icon: Activity,
    gradient: "from-cyan-600 via-teal-600 to-cyan-600",
    image: "https://images.unsplash.com/photo-1561839947-b96e6e5e2e17?w=1200",
    features: ["Slides", "Wave Pool", "Lazy River", "Passes"],
    action: "Events"
  },
  {
    id: "casinos",
    title: "Casinos",
    subtitle: "Games & Jackpots",
    icon: Sparkles,
    gradient: "from-yellow-600 via-amber-600 to-yellow-600",
    image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=1200",
    features: ["Slots", "Poker", "Shows", "Dining"],
    action: "Events"
  },
  {
    id: "wine_tasting",
    title: "Wine Tasting",
    subtitle: "Vineyards & Tours",
    icon: Heart,
    gradient: "from-rose-600 via-red-600 to-rose-600",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200",
    features: ["Tastings", "Tours", "Pairings", "Events"],
    action: "Events"
  },
  {
    id: "paint_sip",
    title: "Paint & Sip",
    subtitle: "Art Classes & Wine",
    icon: Sparkles,
    gradient: "from-purple-600 via-pink-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200",
    features: ["Classes", "Events", "Private", "BYOB"],
    action: "Events"
  },
  {
    id: "axe_throwing",
    title: "Axe Throwing",
    subtitle: "Aim & Compete",
    icon: Activity,
    gradient: "from-orange-600 via-red-600 to-orange-600",
    image: "https://images.unsplash.com/photo-1616161560417-66d4db5892ec?w=1200",
    features: ["Lanes", "Leagues", "Events", "Coaching"],
    action: "Events"
  },
  {
    id: "silent_disco",
    title: "Silent Disco",
    subtitle: "Headphone Parties",
    icon: Music,
    gradient: "from-indigo-600 via-purple-600 to-indigo-600",
    image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200",
    features: ["Multi-Channel", "DJ Sets", "Events", "Rentals"],
    action: "Events"
  },
  {
    id: "drag_shows",
    title: "Drag Shows",
    subtitle: "Queens & Performances",
    icon: Sparkles,
    gradient: "from-pink-600 via-fuchsia-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200",
    features: ["Shows", "Brunch", "Bingo", "Meet & Greet"],
    action: "Events"
  },
  {
    id: "roller_skating",
    title: "Roller Skating",
    subtitle: "Rinks & Parties",
    icon: Activity,
    gradient: "from-blue-600 via-sky-600 to-blue-600",
    image: "https://images.unsplash.com/photo-1565343738032-e68392da0b67?w=1200",
    features: ["Rinks", "Disco Nights", "Lessons", "Rentals"],
    action: "Events"
  },
  {
    id: "trivia_nights",
    title: "Trivia Nights",
    subtitle: "Test Your Knowledge",
    icon: Cpu,
    gradient: "from-teal-600 via-cyan-600 to-teal-600",
    image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1200",
    features: ["Bars", "Teams", "Prizes", "Themes"],
    action: "Events"
  },
  {
    id: "food_festivals",
    title: "Food Festivals",
    subtitle: "Taste & Explore",
    icon: Heart,
    gradient: "from-orange-600 via-yellow-600 to-orange-600",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
    features: ["Food Trucks", "Tastings", "Chefs", "Vendors"],
    action: "Events"
  },
  {
    id: "beer_gardens",
    title: "Beer Gardens",
    subtitle: "Craft & Relax",
    icon: Heart,
    gradient: "from-amber-600 via-yellow-600 to-amber-600",
    image: "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=1200",
    features: ["Craft Beer", "Outdoor", "Events", "Food"],
    action: "Events"
  },
  {
    id: "rooftop_bars",
    title: "Rooftop Bars",
    subtitle: "Sky-High Vibes",
    icon: Sparkles,
    gradient: "from-purple-600 via-blue-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200",
    features: ["Views", "Cocktails", "Sunset", "DJ"],
    action: "Events"
  },
  {
    id: "speakeasy",
    title: "Speakeasy Bars",
    subtitle: "Hidden Cocktails",
    icon: Sparkles,
    gradient: "from-slate-600 via-gray-600 to-slate-600",
    image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200",
    features: ["Secret Entry", "Craft Cocktails", "Vintage", "Exclusive"],
    action: "Events"
  },
  {
    id: "poetry_slams",
    title: "Poetry Slams",
    subtitle: "Spoken Word Art",
    icon: Heart,
    gradient: "from-rose-600 via-pink-600 to-rose-600",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200",
    features: ["Open Mic", "Competitions", "Workshops", "Artists"],
    action: "Events"
  },
  {
    id: "jazz_clubs",
    title: "Jazz Clubs",
    subtitle: "Smooth & Soulful",
    icon: Music,
    gradient: "from-indigo-600 via-blue-600 to-indigo-600",
    image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=1200",
    features: ["Live Jazz", "Dining", "Cocktails", "Events"],
    action: "Events"
  },
  {
    id: "anime_conventions",
    title: "Anime Cons",
    subtitle: "Cosplay & Culture",
    icon: Activity,
    gradient: "from-pink-600 via-purple-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200",
    features: ["Cosplay", "Vendors", "Panels", "Meet & Greet"],
    action: "Events"
  },
  {
    id: "gaming_cafes",
    title: "Gaming Cafes",
    subtitle: "Play & Socialize",
    icon: Cpu,
    gradient: "from-violet-600 via-purple-600 to-violet-600",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200",
    features: ["PC Gaming", "Consoles", "Tournaments", "Food"],
    action: "Gaming"
  },
  {
    id: "haunted_houses",
    title: "Haunted Houses",
    subtitle: "Scares & Thrills",
    icon: Activity,
    gradient: "from-gray-600 via-slate-600 to-gray-600",
    image: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=1200",
    features: ["Extreme", "Family-Friendly", "Seasonal", "Tours"],
    action: "Events"
  },
  {
    id: "laser_tag",
    title: "Laser Tag",
    subtitle: "Battle & Play",
    icon: Zap,
    gradient: "from-green-600 via-lime-600 to-green-600",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200",
    features: ["Arenas", "Teams", "Parties", "Tournaments"],
    action: "Events"
  },
  {
    id: "go_karts",
    title: "Go-Kart Racing",
    subtitle: "Speed & Competition",
    icon: Car,
    gradient: "from-red-600 via-orange-600 to-red-600",
    image: "https://images.unsplash.com/photo-1569144157591-c60f3f82f137?w=1200",
    features: ["Indoor", "Outdoor", "Electric", "Races"],
    action: "Events"
  },
  {
    id: "trampoline_parks",
    title: "Trampoline Parks",
    subtitle: "Jump & Flip",
    icon: Activity,
    gradient: "from-lime-600 via-green-600 to-lime-600",
    image: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200",
    features: ["Free Jump", "Dodgeball", "Foam Pit", "Fitness"],
    action: "Events"
  },
  {
    id: "mini_golf",
    title: "Mini Golf",
    subtitle: "Putt & Party",
    icon: Activity,
    gradient: "from-green-600 via-emerald-600 to-green-600",
    image: "https://images.unsplash.com/photo-1593111774240-d529f12287f3?w=1200",
    features: ["Indoor", "Outdoor", "Glow-in-Dark", "Courses"],
    action: "Events"
  },
  {
    id: "wine_bars",
    title: "Wine Bars",
    subtitle: "Sip & Savor",
    icon: Heart,
    gradient: "from-red-600 via-rose-600 to-red-600",
    image: "https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=1200",
    features: ["Flights", "Pairings", "Events", "Bottles"],
    action: "Events"
  },
  {
    id: "hookah_lounges",
    title: "Hookah Lounges",
    subtitle: "Smoke & Relax",
    icon: Sparkles,
    gradient: "from-teal-600 via-cyan-600 to-teal-600",
    image: "https://images.unsplash.com/photo-1579275542618-a1dfed5f54ba?w=1200",
    features: ["Flavors", "VIP", "Music", "Food"],
    action: "Events"
  },
  {
    id: "cooking_classes",
    title: "Cooking Classes",
    subtitle: "Learn & Taste",
    icon: Heart,
    gradient: "from-orange-600 via-red-600 to-orange-600",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200",
    features: ["Chefs", "Cuisines", "Private", "Date Night"],
    action: "Events"
  },
  {
    id: "dance_clubs",
    title: "Dance Clubs",
    subtitle: "Move & Groove",
    icon: Music,
    gradient: "from-fuchsia-600 via-pink-600 to-fuchsia-600",
    image: "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200",
    features: ["EDM", "Hip-Hop", "Latin", "House"],
    action: "Events"
  },
  {
    id: "magic_shows",
    title: "Magic Shows",
    subtitle: "Illusions & Wonder",
    icon: Sparkles,
    gradient: "from-purple-600 via-indigo-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1528795259021-d8c86e14e549?w=1200",
    features: ["Close-Up", "Stage", "Mentalism", "Tickets"],
    action: "Events"
  },
  {
    id: "circus",
    title: "Circus Shows",
    subtitle: "Acrobats & Clowns",
    icon: Sparkles,
    gradient: "from-red-600 via-orange-600 to-red-600",
    image: "https://images.unsplash.com/photo-1515191107209-c28698631303?w=1200",
    features: ["Big Top", "Cirque", "Family", "Tickets"],
    action: "Events"
  },
  {
    id: "murder_mystery",
    title: "Murder Mystery",
    subtitle: "Solve The Case",
    icon: Cpu,
    gradient: "from-gray-600 via-slate-600 to-gray-600",
    image: "https://images.unsplash.com/photo-1571228896825-62a5e7e9d4fb?w=1200",
    features: ["Dinner Shows", "Interactive", "Teams", "Events"],
    action: "Events"
  },
  {
    id: "burlesque",
    title: "Burlesque Shows",
    subtitle: "Glamour & Performance",
    icon: Sparkles,
    gradient: "from-red-600 via-pink-600 to-red-600",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",
    features: ["Shows", "Classes", "Vintage", "Events"],
    action: "Events"
  },
  {
    id: "rage_rooms",
    title: "Rage Rooms",
    subtitle: "Break & Release",
    icon: Activity,
    gradient: "from-red-600 via-orange-600 to-red-600",
    image: "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=1200",
    features: ["Smash", "Stress Relief", "Therapy", "Sessions"],
    action: "Events"
  },
  {
    id: "virtual_reality",
    title: "VR Experiences",
    subtitle: "Immersive Worlds",
    icon: Cpu,
    gradient: "from-cyan-600 via-blue-600 to-cyan-600",
    image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=1200",
    features: ["Games", "Adventures", "Social VR", "Arcades"],
    action: "Gaming"
  },
  {
    id: "esports",
    title: "Esports Arenas",
    subtitle: "Pro Gaming",
    icon: Activity,
    gradient: "from-purple-600 via-violet-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200",
    features: ["Tournaments", "Watch Parties", "Teams", "Betting"],
    action: "Gaming"
  },
  {
    id: "indoor_skydiving",
    title: "Indoor Skydiving",
    subtitle: "Feel The Rush",
    icon: Plane,
    gradient: "from-blue-600 via-cyan-600 to-blue-600",
    image: "https://images.unsplash.com/photo-1533167649158-6d508895b680?w=1200",
    features: ["Wind Tunnel", "Training", "Group", "Lessons"],
    action: "Events"
  },
  {
    id: "art_classes",
    title: "Art Classes",
    subtitle: "Create & Learn",
    icon: Heart,
    gradient: "from-pink-600 via-rose-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200",
    features: ["Painting", "Sculpting", "Drawing", "Pottery"],
    action: "Events"
  },
  {
    id: "outdoor_concerts",
    title: "Outdoor Concerts",
    subtitle: "Music Under Stars",
    icon: Music,
    gradient: "from-indigo-600 via-purple-600 to-indigo-600",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200",
    features: ["Amphitheaters", "Festivals", "Lawn", "Food"],
    action: "Events"
  },
  {
    id: "sports_bars",
    title: "Sports Bars",
    subtitle: "Watch & Cheer",
    icon: Activity,
    gradient: "from-green-600 via-emerald-600 to-green-600",
    image: "https://images.unsplash.com/photo-1595272548358-f95c0834d1c3?w=1200",
    features: ["Big Screens", "Food", "Beer", "Games"],
    action: "Events"
  },
  {
    id: "speed_dating",
    title: "Speed Dating",
    subtitle: "Meet & Connect",
    icon: Heart,
    gradient: "from-pink-600 via-rose-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200",
    features: ["Singles Events", "LGBTQ+", "Virtual", "Themed"],
    action: "Events"
  },
  {
    id: "book_clubs",
    title: "Book Clubs",
    subtitle: "Read & Discuss",
    icon: Heart,
    gradient: "from-blue-600 via-indigo-600 to-blue-600",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200",
    features: ["In-Person", "Virtual", "Genres", "Authors"],
    action: "CommunityHub"
  },
  {
    id: "comedy_improv",
    title: "Improv Comedy",
    subtitle: "Interactive Laughs",
    icon: Sparkles,
    gradient: "from-yellow-600 via-orange-600 to-yellow-600",
    image: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200",
    features: ["Shows", "Classes", "Teams", "Workshops"],
    action: "Events"
  },
  {
    id: "open_mic",
    title: "Open Mic Nights",
    subtitle: "Perform & Shine",
    icon: Music,
    gradient: "from-purple-600 via-pink-600 to-purple-600",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",
    features: ["Comedy", "Music", "Poetry", "Storytelling"],
    action: "Events"
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

            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigate(createPageUrl(pillar.action));
              }}
              type="button"
              className="w-full py-3 sm:py-4 md:py-5 bg-white/30 backdrop-blur-xl rounded-xl sm:rounded-2xl text-white text-sm sm:text-base md:text-lg font-bold hover:bg-white/40 active:scale-[0.98] transition border-2 border-white/50 shadow-2xl flex items-center justify-center gap-2 sm:gap-3 cursor-pointer touch-manipulation"
            >
              Enter {pillar.title}
              <span className="inline-block">→</span>
            </button>
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