import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingOptimizer({ currentPrice, pricingAnalysis, onApplyPrice }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!pricingAnalysis) return null;

  const priceChange = pricingAnalysis.recommended_daily_rate - currentPrice;
  const priceChangePercent = ((priceChange / currentPrice) * 100).toFixed(1);

  return (
    <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-400" />
          AI Pricing Optimization
          <Badge className="bg-green-500/30 text-green-300 ml-2">
            {pricingAnalysis.confidence_score}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Recommendation */}
        <div className="bg-white/5 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Price</p>
              <p className="text-white text-3xl font-bold">${currentPrice}</p>
              <p className="text-gray-500 text-xs">per day</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">AI Recommended</p>
              <p className="text-green-400 text-3xl font-bold">${pricingAnalysis.recommended_daily_rate}</p>
              <p className={`text-sm font-semibold ${priceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange > 0 ? '+' : ''}{priceChangePercent}%
              </p>
            </div>
          </div>
        </div>

        {/* Market Context */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            Market Analysis
          </h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400 mb-1">Competitor Range</p>
              <p className="text-white font-bold">
                ${pricingAnalysis.competitor_price_range?.min} - ${pricingAnalysis.competitor_price_range?.max}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Market Avg</p>
              <p className="text-white font-bold">${pricingAnalysis.competitor_price_range?.average}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Demand</p>
              <p className="text-white font-bold uppercase">{pricingAnalysis.demand_forecast}</p>
            </div>
          </div>
        </div>

        {/* Strategy & Reasoning */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-purple-400 text-sm hover:text-purple-300 mb-2"
          >
            {showDetails ? '− Hide Details' : '+ Show AI Reasoning'}
          </button>
          
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/5 rounded-xl p-4"
            >
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Strategy</p>
                  <p className="text-white capitalize">{pricingAnalysis.pricing_strategy}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Reasoning</p>
                  <p className="text-gray-300">{pricingAnalysis.reasoning}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Seasonal Adjustments</p>
                  <p className="text-gray-300">{pricingAnalysis.seasonal_adjustments}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Expected Impact</p>
                  <p className="text-green-400">
                    +{pricingAnalysis.expected_booking_increase}% booking increase
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Recommended Rates */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Hourly</p>
            <p className="text-white font-bold">${pricingAnalysis.recommended_hourly_rate}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Daily</p>
            <p className="text-white font-bold">${pricingAnalysis.recommended_daily_rate}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Weekly</p>
            <p className="text-white font-bold">${pricingAnalysis.recommended_weekly_rate}</p>
          </div>
        </div>

        {onApplyPrice && (
          <Button
            onClick={() => onApplyPrice(pricingAnalysis.recommended_daily_rate)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg"
          >
            <Target className="w-5 h-5 mr-2" />
            Apply AI Pricing
          </Button>
        )}
      </CardContent>
    </Card>
  );
}