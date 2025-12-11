import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  Target, Zap, Brain, Loader2, CheckCircle, BarChart3 
} from "lucide-react";
import { motion } from "framer-motion";

export default function FleetInsightsModule({ cars, rentals }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cars.length > 0 && rentals.length > 0) {
      analyzeFleet();
    }
  }, [cars, rentals]);

  const analyzeFleet = async () => {
    setLoading(true);
    try {
      // Calculate comprehensive metrics
      const vehicleMetrics = cars.map(car => {
        const carRentals = rentals.filter(r => r.car_model === car.title);
        const completedRentals = carRentals.filter(r => r.status === 'completed');
        const activeRentals = carRentals.filter(r => ['active', 'confirmed'].includes(r.status));
        
        const revenue = completedRentals.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const totalDays = completedRentals.reduce((sum, r) => sum + (r.rental_days || 1), 0);
        const avgRentalDuration = completedRentals.length > 0 ? totalDays / completedRentals.length : 0;
        
        // Calculate days available vs days rented
        const daysSinceAdded = Math.floor((Date.now() - new Date(car.created_date).getTime()) / (1000 * 60 * 60 * 24));
        const utilization = daysSinceAdded > 0 ? (totalDays / daysSinceAdded) * 100 : 0;
        
        const revenuePerDay = totalDays > 0 ? revenue / totalDays : 0;
        const bookingFrequency = daysSinceAdded > 0 ? completedRentals.length / (daysSinceAdded / 30) : 0;

        return {
          id: car.id,
          title: car.title,
          price: car.price,
          revenue,
          totalRentals: carRentals.length,
          completedRentals: completedRentals.length,
          activeRentals: activeRentals.length,
          utilization: Math.min(utilization, 100),
          avgRentalDuration,
          revenuePerDay,
          bookingFrequency,
          daysSinceAdded,
          availability: car.availability
        };
      });

      // Overall fleet metrics
      const totalRevenue = vehicleMetrics.reduce((sum, v) => sum + v.revenue, 0);
      const avgUtilization = vehicleMetrics.reduce((sum, v) => sum + v.utilization, 0) / vehicleMetrics.length;
      const totalBookings = vehicleMetrics.reduce((sum, v) => sum + v.completedRentals, 0);

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an advanced fleet analytics AI specializing in car rental profitability optimization.

FLEET OVERVIEW:
- Total vehicles: ${cars.length}
- Total revenue: $${totalRevenue.toFixed(2)}
- Average utilization: ${avgUtilization.toFixed(1)}%
- Total completed bookings: ${totalBookings}

INDIVIDUAL VEHICLE PERFORMANCE:
${JSON.stringify(vehicleMetrics.map(v => ({
  vehicle: v.title,
  price: v.price,
  revenue: v.revenue,
  utilization: v.utilization.toFixed(1) + '%',
  bookings: v.completedRentals,
  avgDuration: v.avgRentalDuration.toFixed(1) + ' days',
  revenuePerDay: v.revenuePerDay.toFixed(2),
  bookingFrequency: v.bookingFrequency.toFixed(1) + '/month',
  availability: v.availability
})), null, 2)}

ANALYSIS REQUIREMENTS:
1. **Revenue Performance**: Identify top and bottom performers by revenue
2. **Utilization Analysis**: Which vehicles have poor utilization (<30%) and why
3. **Pricing Effectiveness**: Are vehicles priced optimally for their performance?
4. **Underperforming Segments**: Which car models need attention
5. **Growth Opportunities**: Where can revenue be maximized

Provide comprehensive insights with specific, actionable recommendations.

Return JSON with detailed analysis:`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_performance: {
              type: "object",
              properties: {
                grade: { type: "string" },
                summary: { type: "string" },
                revenue_trend: { type: "string" },
                utilization_assessment: { type: "string" }
              }
            },
            top_performers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vehicle_id: { type: "string" },
                  vehicle: { type: "string" },
                  reason: { type: "string" },
                  revenue: { type: "number" },
                  recommendation: { type: "string" }
                }
              }
            },
            underperformers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vehicle_id: { type: "string" },
                  vehicle: { type: "string" },
                  issues: { type: "array", items: { type: "string" } },
                  current_price: { type: "number" },
                  suggested_action: { type: "string" },
                  potential_revenue_increase: { type: "string" }
                }
              }
            },
            pricing_insights: {
              type: "object",
              properties: {
                overpriced: { type: "array", items: { type: "string" } },
                underpriced: { type: "array", items: { type: "string" } },
                optimal: { type: "array", items: { type: "string" } }
              }
            },
            actionable_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  action: { type: "string" },
                  expected_impact: { type: "string" },
                  timeframe: { type: "string" }
                }
              }
            },
            revenue_opportunities: {
              type: "object",
              properties: {
                quick_wins: { type: "array", items: { type: "string" } },
                long_term_strategies: { type: "array", items: { type: "string" } },
                estimated_additional_monthly_revenue: { type: "number" }
              }
            },
            utilization_optimization: {
              type: "object",
              properties: {
                low_utilization_reasons: { type: "array", items: { type: "string" } },
                improvement_strategies: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setInsights({
        ...analysis,
        metrics: vehicleMetrics,
        totalRevenue,
        avgUtilization
      });
    } catch (error) {
      console.error("Fleet analysis error:", error);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/30">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Analyzing fleet performance with AI...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Insufficient data for insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <Card className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            Fleet Performance Overview
            <Badge className="bg-indigo-500/30 text-indigo-200">AI Analysis</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Performance Grade</span>
                <Badge className={
                  insights.overall_performance.grade === 'A' ? 'bg-green-500 text-white' :
                  insights.overall_performance.grade === 'B' ? 'bg-blue-500 text-white' :
                  'bg-yellow-500 text-white'
                }>
                  {insights.overall_performance.grade}
                </Badge>
              </div>
              <p className="text-white text-2xl font-bold">{insights.avgUtilization.toFixed(1)}%</p>
              <p className="text-gray-400 text-xs">Average Utilization</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-sm">Total Revenue</span>
              </div>
              <p className="text-green-400 text-2xl font-bold">${insights.totalRevenue.toFixed(0)}</p>
              <p className="text-gray-400 text-xs">{insights.overall_performance.revenue_trend}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 text-sm">Potential Growth</span>
              </div>
              <p className="text-purple-400 text-2xl font-bold">
                +${insights.revenue_opportunities?.estimated_additional_monthly_revenue || 0}/mo
              </p>
              <p className="text-gray-400 text-xs">With optimizations</p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-200 text-sm">{insights.overall_performance.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      {insights.top_performers?.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Top Performing Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.top_performers.map((vehicle, idx) => (
              <motion.div
                key={vehicle.vehicle_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-bold">{vehicle.vehicle}</h4>
                    <p className="text-gray-300 text-sm">{vehicle.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">${vehicle.revenue}</p>
                    <p className="text-gray-400 text-xs">Revenue</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-green-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {vehicle.recommendation}
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Underperformers */}
      {insights.underperformers?.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Underperforming Vehicles - Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.underperformers.map((vehicle, idx) => (
              <motion.div
                key={vehicle.vehicle_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-bold mb-2">{vehicle.vehicle}</h4>
                    <div className="space-y-1 mb-3">
                      {vehicle.issues.map((issue, i) => (
                        <p key={i} className="text-orange-300 text-sm flex items-start gap-2">
                          <span className="text-orange-400">•</span>
                          {issue}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-gray-400 text-xs">Current Price</p>
                    <p className="text-white font-bold">${vehicle.current_price}</p>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-3">
                  <p className="text-purple-300 text-sm font-semibold mb-1">Recommended Action:</p>
                  <p className="text-gray-300 text-sm">{vehicle.suggested_action}</p>
                </div>

                {vehicle.potential_revenue_increase && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-semibold">{vehicle.potential_revenue_increase}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pricing Insights */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            Pricing Effectiveness Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {insights.pricing_insights.underpriced?.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h4 className="text-green-300 font-semibold mb-2">Underpriced (Raise Price)</h4>
                <ul className="space-y-1">
                  {insights.pricing_insights.underpriced.map((vehicle, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {vehicle}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.pricing_insights.overpriced?.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <h4 className="text-red-300 font-semibold mb-2">Overpriced (Lower Price)</h4>
                <ul className="space-y-1">
                  {insights.pricing_insights.overpriced.map((vehicle, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {vehicle}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.pricing_insights.optimal?.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="text-blue-300 font-semibold mb-2">Optimally Priced</h4>
                <ul className="space-y-1">
                  {insights.pricing_insights.optimal.map((vehicle, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {vehicle}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actionable Recommendations */}
      <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Priority Action Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.actionable_recommendations?.map((rec, idx) => (
            <div
              key={idx}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <Badge className={
                  rec.priority === 'high' ? 'bg-red-500 text-white' :
                  rec.priority === 'medium' ? 'bg-yellow-500 text-white' :
                  'bg-blue-500 text-white'
                }>
                  {rec.priority.toUpperCase()} PRIORITY
                </Badge>
                <span className="text-gray-400 text-xs">{rec.timeframe}</span>
              </div>
              <p className="text-white font-semibold mb-1">{rec.action}</p>
              <p className="text-green-400 text-sm">
                Expected Impact: {rec.expected_impact}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revenue Opportunities */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Revenue Growth Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Quick Wins
              </h4>
              <ul className="space-y-2">
                {insights.revenue_opportunities.quick_wins?.map((win, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {win}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Long-term Strategies
              </h4>
              <ul className="space-y-2">
                {insights.revenue_opportunities.long_term_strategies?.map((strategy, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <Target className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    {strategy}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Utilization Optimization */}
      {insights.utilization_optimization && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Utilization Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-semibold mb-2">Low Utilization Root Causes:</h4>
                <ul className="space-y-1">
                  {insights.utilization_optimization.low_utilization_reasons?.map((reason, i) => (
                    <li key={i} className="text-orange-300 text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-2">Improvement Strategies:</h4>
                <ul className="space-y-1">
                  {insights.utilization_optimization.improvement_strategies?.map((strategy, i) => (
                    <li key={i} className="text-green-300 text-sm flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {strategy}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          onClick={analyzeFleet}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Brain className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
}