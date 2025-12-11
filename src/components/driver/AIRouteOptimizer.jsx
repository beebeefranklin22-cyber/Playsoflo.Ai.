import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { 
  Navigation, MapPin, TrendingUp, AlertCircle, 
  Clock, DollarSign, Zap, Loader2 
} from "lucide-react";
import { motion } from "framer-motion";

export default function AIRouteOptimizer({ currentLocation, isOnline }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOnline && currentLocation) {
      analyzeRoutes();
    }
  }, [isOnline, currentLocation]);

  const analyzeRoutes = async () => {
    setLoading(true);
    try {
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);

      // Fetch comprehensive ride data
      const recentRides = await base44.entities.RideRequest.filter({
        status: "completed"
      });

      const pendingRides = await base44.entities.RideRequest.filter({
        status: "requested"
      });

      // Use AI to analyze patterns with demand hotspot prediction
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an advanced AI route optimizer with real-time demand prediction for rideshare drivers.

CURRENT CONTEXT:
- Time: ${new Date().toLocaleTimeString()}
- Day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
- Peak hour: ${isPeakHour ? 'YES (Rush hour)' : 'No'}
- Active requests: ${pendingRides.length} waiting for drivers
- Recent completed rides: ${recentRides.length}

REAL-TIME DEMAND HOTSPOTS:
Current pending pickups: ${JSON.stringify(pendingRides.map(r => r.pickup_address))}

HISTORICAL PATTERNS:
${JSON.stringify(recentRides.slice(0, 50).map(r => ({
  pickup: r.pickup_address,
  time: new Date(r.created_date).toLocaleTimeString(),
  day: new Date(r.created_date).getDay(),
  fare: r.fare_breakdown?.total_fare
})))}

TASK: Predict top 3 HIGH-DEMAND HOTSPOTS for next 2 hours based on:
1. Real-time pending ride concentrations
2. Historical demand patterns by time/day
3. Known traffic/event patterns
4. Business districts and nightlife zones

Return as JSON: {
  "zones": [
    {
      "name": "Zone name (be specific)",
      "demand": "high|medium|low",
      "earnings": estimated hourly,
      "waitTime": minutes,
      "tip": "Actionable advice with real data",
      "demandScore": 1-100
    }
  ],
  "peakAdvice": "Rush hour/surge pricing info",
  "trafficAlert": "Real-time traffic issues",
  "demandHeatmap": "List of all hotspot areas"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            zones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  demand: { type: "string" },
                  earnings: { type: "number" },
                  waitTime: { type: "number" },
                  tip: { type: "string" }
                }
              }
            },
            peakAdvice: { type: "string" },
            trafficAlert: { type: "string" }
          }
        }
      });

      setRecommendations(analysis);
    } catch (error) {
      console.error("Route optimization error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOnline) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Navigation className="w-6 h-6 text-purple-400" />
            AI Route Optimizer
          </CardTitle>
          <Button
            onClick={analyzeRoutes}
            disabled={loading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Analyzing demand patterns...</p>
          </div>
        ) : recommendations ? (
          <div className="space-y-4">
            {/* Peak Hour Alert */}
            {recommendations.peakAdvice && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300 text-sm">{recommendations.peakAdvice}</p>
                </div>
              </div>
            )}

            {/* Traffic Alert */}
            {recommendations.trafficAlert && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{recommendations.trafficAlert}</p>
                </div>
              </div>
            )}

            {/* High-Demand Zones with Hotspot Visualization */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                🔥 Predicted Demand Hotspots
                <Badge className="bg-purple-500/30 text-purple-200 text-xs">AI-Powered</Badge>
              </h3>
              {recommendations.zones?.map((zone, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`bg-gradient-to-r rounded-xl p-4 hover:bg-white/10 transition border ${
                    zone.demand === 'high' 
                      ? 'from-green-500/20 to-emerald-500/20 border-green-500/50' 
                      : 'from-blue-500/10 to-purple-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-bold">{zone.name}</span>
                      {zone.demandScore >= 85 && (
                        <span className="text-xl animate-pulse">🔥</span>
                      )}
                    </div>
                    <Badge className={
                      zone.demand === 'high' ? 'bg-green-500 text-white animate-pulse' :
                      zone.demand === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }>
                      {zone.demandScore || zone.demand}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-1 text-sm bg-white/5 rounded-lg p-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-bold">${zone.earnings}/hr</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm bg-white/5 rounded-lg p-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 font-semibold">{zone.waitTime} min</span>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm bg-white/5 rounded-lg p-2">💡 {zone.tip}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Navigation className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Click refresh to get AI recommendations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}