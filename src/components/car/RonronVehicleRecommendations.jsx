import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Brain, Sparkles, TrendingUp, Star, DollarSign, Loader2, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RonronVehicleRecommendations({ currentUser }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      generateRecommendations();
    }
  }, [currentUser]);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // Get user's rental history
      const myRentals = await base44.entities.CarRental.filter({
        renter_email: currentUser.email
      });

      // Get available vehicles
      const allCars = await base44.entities.MarketplaceItem.filter({
        category: "automotive",
        availability: "available"
      });

      if (allCars.length === 0) {
        setRecommendations({ vehicles: [], message: "No vehicles available at the moment" });
        setLoading(false);
        return;
      }

      // Analyze preferences and generate recommendations
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Ronron AI, an intelligent car rental recommendation engine.

USER RENTAL HISTORY:
${myRentals.length > 0 ? JSON.stringify(myRentals.slice(0, 10).map(r => ({
  car: r.car_model,
  duration: r.rental_days,
  cost: r.total_amount,
  date: r.start_date,
  completed: r.status === 'completed'
}))) : "No rental history - new user"}

AVAILABLE VEHICLES:
${JSON.stringify(allCars.slice(0, 20).map(car => ({
  id: car.id,
  title: car.title,
  price: car.price,
  description: car.description,
  specifications: car.specifications
})))}

USER PROFILE:
- Total rentals: ${myRentals.length}
- Preferred rental duration: ${myRentals.length > 0 ? (myRentals.reduce((sum, r) => sum + (r.rental_days || 1), 0) / myRentals.length).toFixed(0) : 'N/A'} days
- Average spend: $${myRentals.length > 0 ? (myRentals.reduce((sum, r) => sum + (r.total_amount || 0), 0) / myRentals.length).toFixed(0) : 'N/A'}

Analyze the user's rental patterns and preferences to recommend 3-5 vehicles that match their:
1. Budget preferences
2. Past rental choices
3. Usage patterns
4. Value for money

For each recommendation, provide:
- Vehicle ID from available list
- Match score (0-100)
- Reason for recommendation
- Key benefits
- Value proposition

Return JSON with detailed recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vehicle_id: { type: "string" },
                  match_score: { type: "number" },
                  reason: { type: "string" },
                  benefits: { type: "array", items: { type: "string" } },
                  value_proposition: { type: "string" },
                  best_for: { type: "string" }
                }
              }
            },
            personalized_message: { type: "string" },
            rental_insights: { type: "string" }
          }
        }
      });

      // Match recommendations with actual vehicles
      const recommendedVehicles = analysis.recommendations
        .map(rec => {
          const vehicle = allCars.find(c => c.id === rec.vehicle_id);
          return vehicle ? { ...vehicle, aiRecommendation: rec } : null;
        })
        .filter(v => v !== null);

      setRecommendations({
        vehicles: recommendedVehicles,
        message: analysis.personalized_message,
        insights: analysis.rental_insights
      });
    } catch (error) {
      console.error("Recommendation error:", error);
      setRecommendations({ vehicles: [], message: "Unable to generate recommendations" });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            Ronron AI Recommendations
            <Badge className="bg-purple-500/30 text-purple-200">Personalized</Badge>
          </CardTitle>
          <Button
            onClick={generateRecommendations}
            disabled={loading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Analyzing your preferences...</p>
          </div>
        ) : recommendations?.vehicles.length > 0 ? (
          <div className="space-y-4">
            {/* Personalized Message */}
            {recommendations.message && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-200 text-sm">{recommendations.message}</p>
              </div>
            )}

            {/* Recommended Vehicles */}
            <div className="space-y-3">
              {recommendations.vehicles.map((vehicle, idx) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition border border-white/10"
                >
                  <div className="flex gap-4">
                    {/* Vehicle Image */}
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={vehicle.image_url} 
                        alt={vehicle.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Vehicle Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-bold">{vehicle.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-500/20 text-green-300 text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              {vehicle.aiRecommendation.match_score}% Match
                            </Badge>
                            <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                              {vehicle.aiRecommendation.best_for}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">
                            ${vehicle.price}<span className="text-sm text-gray-400">/day</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-2">
                        {vehicle.aiRecommendation.reason}
                      </p>

                      {/* Benefits */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {vehicle.aiRecommendation.benefits?.slice(0, 3).map((benefit, i) => (
                          <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            ✓ {benefit}
                          </span>
                        ))}
                      </div>

                      {/* Value Proposition */}
                      <div className="bg-blue-500/10 rounded-lg p-2 mb-3">
                        <p className="text-blue-300 text-xs">
                          <TrendingUp className="w-3 h-3 inline mr-1" />
                          {vehicle.aiRecommendation.value_proposition}
                        </p>
                      </div>

                      <Button
                        onClick={() => {
                          navigate(createPageUrl("CarRentals") + `?car=${vehicle.id}`);
                        }}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 w-full"
                      >
                        View Details & Book
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Insights */}
            {recommendations.insights && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-purple-400" />
                  Rental Insights
                </h4>
                <p className="text-gray-300 text-sm">{recommendations.insights}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {recommendations?.message || "No recommendations available"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}