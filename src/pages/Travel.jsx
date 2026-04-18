import React, { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ChevronLeft, Car, Plane, Anchor, Rocket, Bike,
  Briefcase, Search, Globe, Key, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import HailRideModal from "../components/travel/HailRideModal";
import TravelMap from "../components/travel/TravelMap";
import BecomeDriverButton from "../components/driver/BecomeDriverButton";

const defaultTravelOptions = [
  {
    id: "hail_ride",
    name: "Hail a Ride",
    description: "Instant luxury car service",
    icon: Car,
    bgColor: "bg-blue-500/20",
    iconColor: "text-blue-400",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
    action: () => {} // Action will be handled by setHailOpen for this specific ID
  },
  {
    id: "rent_car",
    name: "Rent a Car",
    description: "Luxury and exotic car rentals",
    icon: Key,
    bgColor: "bg-green-500/20",
    iconColor: "text-green-400",
    image: "https://images.unsplash.com/photo-1502877338535-766e1111603d?w=800",
    action: (navigate) => navigate(createPageUrl("CarRentals"))
  },
  {
    id: "flights",
    name: "Book Flights",
    description: "First-class and private air travel",
    icon: Plane,
    bgColor: "bg-purple-500/20",
    iconColor: "text-purple-400",
    image: "https://images.unsplash.com/photo-1437877688267-27b3b3a620b7?w=800",
    action: () => alert("Flight booking coming soon!")
  },
  {
    id: "private_jets",
    name: "Private Jets",
    description: "Exclusive charter flights",
    icon: Plane,
    bgColor: "bg-indigo-500/20",
    iconColor: "text-indigo-400",
    image: "https://images.unsplash.com/photo-1596541624443-41584c312781?w=800",
    action: (navigate) => navigate(createPageUrl("CarRentals"))
  },
  {
    id: "yachts",
    name: "Yacht Charters",
    description: "Luxury marine experiences",
    icon: Anchor,
    bgColor: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
    image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800",
    action: (navigate) => navigate(createPageUrl("CarRentals"))
  },
  {
    id: "helicopter_rides",
    name: "Helicopter Tours",
    description: "Scenic aerial adventures",
    icon: Rocket,
    bgColor: "bg-pink-500/20",
    iconColor: "text-pink-400",
    image: "https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=800",
    action: (navigate) => navigate(createPageUrl("CarRentals"))
  },
  {
    id: "motorcycle_rides",
    name: "Motorcycle Rentals",
    description: "Experience the open road in style",
    icon: Bike,
    bgColor: "bg-orange-500/20",
    iconColor: "text-orange-400",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a1118?w=800",
    action: (navigate) => navigate(createPageUrl("CarRentals"))
  },
  {
    id: "chauffeur_services",
    name: "Chauffeur Services",
    description: "Personalized premium driving",
    icon: Briefcase,
    bgColor: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
    action: (navigate) => navigate(createPageUrl("Marketplace"))
  },
  {
    id: "luxury_concierge",
    name: "Luxury Concierge",
    description: "Your personal assistant, globally",
    icon: Search,
    bgColor: "bg-gray-500/20",
    iconColor: "text-gray-400",
    image: "https://images.unsplash.com/photo-1517486804593-3d027d147413?w=800",
    action: (navigate) => navigate(createPageUrl("Marketplace"))
  }
];

export default function Travel() {
  const navigate = useNavigate();
  const [hailOpen, setHailOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);

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



  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950">
        <div className="relative h-64 flex items-end">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-transparent" />
          <div className="relative z-10 w-full px-6 pb-8 pt-16 flex items-end justify-between">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                SoFlo Travel
              </h1>
              <p className="text-gray-300 text-lg">
                Your journey, reimagined. Explore the world effortlessly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(createPageUrl("RideHistory"))}
                className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20 text-white font-medium flex items-center gap-2"
              >
                <Clock className="w-5 h-5" />
                <span className="hidden sm:inline">My Rides</span>
              </button>
              {currentUser && <BecomeDriverButton currentUser={currentUser} />}
            </div>
          </div>
        </div>

        <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {defaultTravelOptions.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => option.id === "hail_ride" ? setHailOpen(true) : option.action(navigate)}
              className="relative h-64 rounded-3xl overflow-hidden group cursor-pointer"
            >
              <img 
                src={option.image} 
                alt={option.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${option.bgColor} backdrop-blur-xl flex items-center justify-center border border-white/20`}>
                    <option.icon className={`w-6 h-6 ${option.iconColor}`} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {option.name}
                  </h2>
                  <p className="text-gray-300 text-sm">
                    {option.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="px-6 mt-10">
          <h2 className="text-2xl font-bold text-white mb-3">Live Travel Alerts Map</h2>
          <p className="text-gray-400 mb-4">Police presence, accidents, road work, closures, and school zones near you.</p>
          <TravelMap />
        </div>

        <div className="px-6 mt-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Global Connectivity
          </h2>
          <p className="text-gray-400 text-lg mb-6">
            Our integrated network ensures seamless service wherever you are.
          </p>
          <div className="w-32 h-32 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Globe className="w-16 h-16 text-blue-400" />
          </div>
        </div>
      </div>
      <HailRideModal open={hailOpen} onClose={() => setHailOpen(false)} />
    </PageWrapper>
  );
}