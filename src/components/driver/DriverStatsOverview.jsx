import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Star, MapPin, Clock, Award, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function DriverStatsOverview({ stats, rating, isOnline }) {
  const statCards = [
    {
      icon: DollarSign,
      label: "Today's Earnings",
      value: `$${(stats?.net_earnings || 0).toFixed(2)}`,
      subValue: `+$${(stats?.tips_earned || 0).toFixed(2)} tips`,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30"
    },
    {
      icon: MapPin,
      label: "Rides Completed",
      value: stats?.total_rides || 0,
      subValue: `${(stats?.miles_driven || 0).toFixed(1)} miles`,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30"
    },
    {
      icon: Clock,
      label: "Hours Online",
      value: `${(stats?.hours_online || 0).toFixed(1)}h`,
      subValue: `$${(stats?.hourly_rate || 0).toFixed(0)}/hr rate`,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30"
    },
    {
      icon: Star,
      label: "Rating",
      value: rating || "5.0",
      subValue: "Keep it up!",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${stat.bgColor} border ${stat.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  {isOnline && stat.label === "Today's Earnings" && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-400 text-[10px] font-bold">LIVE</span>
                    </div>
                  )}
                </div>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400">{stat.subValue}</div>
                <div className="text-[10px] text-gray-500 mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}