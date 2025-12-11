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

      // Fetch recent ride data
      const recentRides = await base44.entities.RideRequest.filter({
        status: "completed"
      });

      // Use AI to analyze patterns
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze rideshare demand patterns and provide route recommendations.

Current time: ${new Date().toLocaleTimeString()}
Peak hour: ${isPeakHour}
Recent rides: ${recentRides.length} in last hour

Provide 3 high-demand zones with:
1. Zone name (Miami area)
2. Estimated demand level (high/medium/low)
3. Expected earnings per hour
4. Wait time estimate
5. One-sentence tip

Return as JSON: {
  "zones": [
    {
      "name": "string",
      "demand": "high|medium|low",
      "earnings": number,
      "waitTime": number,
      "tip": "string"
    }
  ],
  "peakAdvice": "string",
  "trafficAlert": "string"
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

            {/* High-Demand Zones */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-sm">Recommended Zones</h3>
              {recommendations.zones?.map((zone, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">{zone.name}</span>
                    </div>
                    <Badge className={
                      zone.demand === 'high' ? 'bg-green-500/20 text-green-300' :
                      zone.demand === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }>
                      {zone.demand} demand
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-bold">${zone.earnings}/hr</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-400">{zone.waitTime} min wait</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs italic">{zone.tip}</p>
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