import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { 
  Users, TrendingUp, Star, DollarSign, 
  MapPin, Clock, Sparkles, Target 
} from "lucide-react";
import { motion } from "framer-motion";

export default function AIPassengerMatcher({ ride, driverStats }) {
  const [matchScore, setMatchScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    if (ride) {
      analyzeMatch();
    }
  }, [ride]);

  const analyzeMatch = async () => {
    setAnalyzing(true);
    try {
      // Calculate match score based on multiple factors
      const factors = {
        distance: ride.estimated_distance_miles || 5,
        earnings: ride.fare_breakdown?.total_fare || 15,
        riderRating: 4.8, // Would come from rider data
        location: ride.pickup_address,
        time: new Date().getHours(),
        driverHourlyRate: driverStats?.hourly_rate || 20,
        isShared: ride.is_shared || false,
        tipProbability: 0.7 // Based on historical data
      };

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ride opportunity for a driver:

Ride details:
- Distance: ${factors.distance} miles
- Earnings: $${factors.earnings}
- Pickup: ${factors.location}
- Time: ${factors.time}:00
- Shared ride: ${factors.isShared}
- Driver's current hourly rate: $${factors.driverHourlyRate}/hr

Provide a match score (0-100) and brief analysis considering:
1. Profitability vs driver's average
2. Time efficiency
3. Location convenience
4. Potential for tips

Return JSON: {
  "score": number,
  "recommendation": "accept|consider|decline",
  "earnings_impact": "positive|neutral|negative",
  "reasons": ["string"],
  "tip_likelihood": "high|medium|low",
  "time_efficiency": number,
  "next_ride_proximity": "high|medium|low"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            recommendation: { type: "string" },
            earnings_impact: { type: "string" },
            reasons: { type: "array", items: { type: "string" } },
            tip_likelihood: { type: "string" },
            time_efficiency: { type: "number" },
            next_ride_proximity: { type: "string" }
          }
        }
      });

      setMatchScore(analysis);
    } catch (error) {
      console.error("Matching error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!ride || analyzing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-semibold">AI Match Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Match Score:</span>
          <Badge className={
            matchScore?.score >= 80 ? 'bg-green-500/20 text-green-300' :
            matchScore?.score >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-red-500/20 text-red-300'
          }>
            {matchScore?.score}/100
          </Badge>
        </div>
      </div>

      {matchScore && (
        <div className="space-y-3">
          {/* Recommendation */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            matchScore.recommendation === 'accept' ? 'bg-green-500/10 border border-green-500/30' :
            matchScore.recommendation === 'consider' ? 'bg-yellow-500/10 border border-yellow-500/30' :
            'bg-red-500/10 border border-red-500/30'
          }`}>
            <Target className={`w-5 h-5 ${
              matchScore.recommendation === 'accept' ? 'text-green-400' :
              matchScore.recommendation === 'consider' ? 'text-yellow-400' :
              'text-red-400'
            }`} />
            <span className={`font-semibold ${
              matchScore.recommendation === 'accept' ? 'text-green-300' :
              matchScore.recommendation === 'consider' ? 'text-yellow-300' :
              'text-red-300'
            }`}>
              {matchScore.recommendation === 'accept' ? '✓ Recommended' :
               matchScore.recommendation === 'consider' ? '⚡ Consider' :
               '✗ Not Optimal'}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <div className={`text-xs font-semibold ${
                matchScore.earnings_impact === 'positive' ? 'text-green-400' :
                matchScore.earnings_impact === 'neutral' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {matchScore.earnings_impact}
              </div>
              <div className="text-gray-400 text-xs">Earnings</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-blue-400 text-xs font-semibold">
                {matchScore.time_efficiency}%
              </div>
              <div className="text-gray-400 text-xs">Efficiency</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <div className={`text-xs font-semibold ${
                matchScore.tip_likelihood === 'high' ? 'text-green-400' :
                matchScore.tip_likelihood === 'medium' ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {matchScore.tip_likelihood}
              </div>
              <div className="text-gray-400 text-xs">Tip odds</div>
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-1">
            {matchScore.reasons?.slice(0, 3).map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <div className="w-1 h-1 bg-cyan-400 rounded-full mt-1.5 flex-shrink-0" />
                <span className="text-gray-300">{reason}</span>
              </div>
            ))}
          </div>

          {/* Next Ride Prediction */}
          {matchScore.next_ride_proximity && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>
                Next ride proximity: <strong className="text-cyan-400">
                  {matchScore.next_ride_proximity}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}