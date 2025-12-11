import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { TrendingUp, DollarSign, Zap, Loader2, ArrowUpRight } from "lucide-react";

export default function PricingOptimizer({ cars, rentals }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzePricing();
  }, [cars, rentals]);

  const analyzePricing = async () => {
    setLoading(true);
    try {
      const carPerformance = cars.map(car => {
        const carRentals = rentals.filter(r => r.car_model === car.title);
        const revenue = carRentals
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const utilization = carRentals.filter(r => 
          r.status === 'active' || r.status === 'confirmed'
        ).length;

        return {
          title: car.title,
          currentPrice: car.price,
          totalRentals: carRentals.length,
          revenue,
          utilization,
          availability: car.availability
        };
      });

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a dynamic pricing AI for car rental fleet optimization.

Current fleet performance:
${JSON.stringify(carPerformance)}

Market context:
- Season: ${new Date().getMonth() >= 5 && new Date().getMonth() <= 8 ? 'Peak (Summer)' : 'Off-peak'}
- Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
- Average market rate for luxury cars: $400-800/day

Analyze and provide dynamic pricing suggestions to:
1. Maximize revenue on high-demand vehicles
2. Increase utilization on underperforming vehicles
3. Account for seasonal and demand patterns

Return JSON:
{
  "suggestions": [
    {
      "carTitle": "title",
      "currentPrice": 500,
      "suggestedPrice": 650,
      "priceChange": "+30%",
      "reason": "High demand, 95% utilization - can increase price",
      "potentialRevenue": "+$150/day",
      "confidence": "High"
    }
  ],
  "marketInsight": "Overall market analysis",
  "seasonalTip": "Seasonal pricing advice"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  carTitle: { type: "string" },
                  currentPrice: { type: "number" },
                  suggestedPrice: { type: "number" },
                  priceChange: { type: "string" },
                  reason: { type: "string" },
                  potentialRevenue: { type: "string" },
                  confidence: { type: "string" }
                }
              }
            },
            marketInsight: { type: "string" },
            seasonalTip: { type: "string" }
          }
        }
      });

      setSuggestions(analysis);
    } catch (error) {
      console.error("Pricing analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-400" />
            Dynamic Pricing AI
          </CardTitle>
          <Button
            onClick={analyzePricing}
            disabled={loading}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Optimizing prices...</p>
          </div>
        ) : suggestions?.suggestions?.length > 0 ? (
          <div className="space-y-4">
            {suggestions.suggestions.map((suggestion, idx) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-bold">{suggestion.carTitle}</h4>
                    <p className="text-gray-400 text-sm">{suggestion.reason}</p>
                  </div>
                  <Badge className={
                    suggestion.confidence === 'High' ? 'bg-green-500 text-white' :
                    'bg-yellow-500/30 text-yellow-300'
                  }>
                    {suggestion.confidence}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Current Price</p>
                    <p className="text-white text-xl font-bold">${suggestion.currentPrice}</p>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Suggested Price</p>
                    <p className="text-green-400 text-xl font-bold flex items-center gap-1">
                      ${suggestion.suggestedPrice}
                      <ArrowUpRight className="w-4 h-4" />
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-400 font-semibold">{suggestion.priceChange}</span>
                  <span className="text-gray-300">{suggestion.potentialRevenue} extra</span>
                </div>
              </div>
            ))}

            <div className="space-y-2">
              {suggestions.marketInsight && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                  📊 {suggestions.marketInsight}
                </div>
              )}
              {suggestions.seasonalTip && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-sm text-purple-300">
                  🌞 {suggestions.seasonalTip}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No pricing adjustments needed right now</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}