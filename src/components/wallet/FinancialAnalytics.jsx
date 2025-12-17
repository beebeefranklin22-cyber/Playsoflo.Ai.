import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, 
  Sparkles, Calendar, PieChart, BarChart3, Target,
  ArrowUpRight, ArrowDownRight, Loader2, Download,
  Brain, Zap, Shield, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FinancialAnalytics({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: spendingInsights, isLoading: loadingSpending, refetch: refetchSpending } = useQuery({
    queryKey: ['financial-analysis', 'spending_insights'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('analyzeFinancials', {
        analysis_type: 'spending_insights',
        time_period: '30'
      });
      return data;
    },
    enabled: activeTab === 'spending'
  });

  const { data: earningForecast, isLoading: loadingEarnings, refetch: refetchEarnings } = useQuery({
    queryKey: ['financial-analysis', 'earning_forecast'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('analyzeFinancials', {
        analysis_type: 'earning_forecast',
        time_period: '90'
      });
      return data;
    },
    enabled: activeTab === 'earnings'
  });

  const { data: financialHealth, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['financial-analysis', 'financial_health'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('analyzeFinancials', {
        analysis_type: 'financial_health'
      });
      return data;
    },
    enabled: activeTab === 'health'
  });

  const { data: cashflowForecast, isLoading: loadingCashflow, refetch: refetchCashflow } = useQuery({
    queryKey: ['financial-analysis', 'cashflow_forecast'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('analyzeFinancials', {
        analysis_type: 'cashflow_forecast'
      });
      return data;
    },
    enabled: activeTab === 'cashflow'
  });

  const generateDetailedReport = async () => {
    setGeneratingReport(true);
    try {
      // Generate all reports
      await Promise.all([
        refetchSpending(),
        refetchEarnings(),
        refetchHealth(),
        refetchCashflow()
      ]);
      toast.success('📊 Comprehensive financial report generated!');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-gradient-to-br from-gray-900 to-purple-900/50 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-6 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">AI Financial Analytics</h2>
                <p className="text-white/80 text-sm">Powered by advanced AI insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={generateDetailedReport}
                disabled={generatingReport}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Full Report
                  </>
                )}
              </Button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <PieChart className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('spending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'spending'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-2" />
              Spending
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'earnings'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Earnings
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'health'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Health Score
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'cashflow'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Cash Flow
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Total Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-white">
                        ${((currentUser?.usd_balance || 0) + ((currentUser?.soflo_coins || 0) * 2.45)).toFixed(2)}
                      </p>
                      <p className="text-green-400 text-sm mt-2">Available funds</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        AI Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-white text-sm">
                        Click tabs above to unlock personalized AI-powered financial insights
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={generateDetailedReport} className="w-full bg-blue-600 hover:bg-blue-700">
                        Generate Full Report
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">What's Included</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span>AI-powered spending insights</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span>Earning potential forecasts</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span>Financial health scoring</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <span>Cash flow predictions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Spending Insights Tab */}
            {activeTab === 'spending' && (
              <motion.div
                key="spending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {loadingSpending ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  </div>
                ) : spendingInsights?.data ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <TrendingDown className="w-5 h-5" />
                            Spending Trend
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`px-4 py-2 rounded-lg ${
                              spendingInsights.data.trend_percentage >= 0 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {spendingInsights.data.trend_percentage >= 0 ? (
                                <ArrowUpRight className="w-5 h-5 inline mr-1" />
                              ) : (
                                <ArrowDownRight className="w-5 h-5 inline mr-1" />
                              )}
                              {Math.abs(spendingInsights.data.trend_percentage)}%
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">{spendingInsights.data.trend}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Savings Potential
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold text-green-400">
                            ${spendingInsights.data.savings_potential?.toFixed(2)}
                          </p>
                          <p className="text-gray-400 text-sm mt-2">Estimated monthly savings</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Top Spending Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {spendingInsights.data.top_categories?.map((cat, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                              <span className="text-white font-medium">{cat.category}</span>
                              <div className="text-right">
                                <span className="text-white font-bold">${cat.amount?.toFixed(2)}</span>
                                <span className="text-gray-400 text-sm ml-2">({cat.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          AI Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {spendingInsights.data.recommendations?.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-300">
                              <span className="text-purple-400 flex-shrink-0">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {spendingInsights.data.anomalies?.length > 0 && (
                      <Card className="bg-orange-500/10 border-orange-500/30">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-400" />
                            Unusual Patterns Detected
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {spendingInsights.data.anomalies.map((anomaly, i) => (
                              <li key={i} className="text-orange-300">{anomaly}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Click "Generate Full Report" to analyze spending</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Earnings Forecast Tab */}
            {activeTab === 'earnings' && (
              <motion.div
                key="earnings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {loadingEarnings ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  </div>
                ) : earningForecast?.data ? (
                  <>
                    <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                      <CardHeader>
                        <CardTitle className="text-white">3-Month Earning Forecast</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {earningForecast.data.monthly_forecast?.map((forecast, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-green-400" />
                                <span className="text-white font-medium">{forecast.month}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-bold text-xl">${forecast.projected_amount?.toFixed(2)}</p>
                                <p className="text-green-400 text-sm">{forecast.confidence}% confidence</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Growth Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {earningForecast.data.growth_opportunities?.map((opp, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-300">
                              <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                              <span>{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-500/10 border-purple-500/20">
                      <CardHeader>
                        <CardTitle className="text-white">Income Diversification Tips</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {earningForecast.data.diversification_tips?.map((tip, i) => (
                            <li key={i} className="text-purple-200">{tip}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Click "Generate Full Report" to forecast earnings</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Financial Health Tab */}
            {activeTab === 'health' && (
              <motion.div
                key="health"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {loadingHealth ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  </div>
                ) : financialHealth?.data ? (
                  <>
                    <Card className={`border-2 ${getHealthColor(financialHealth.data.health_score)}`}>
                      <CardHeader>
                        <CardTitle className="text-white text-center">Financial Health Score</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <div className="relative inline-block">
                          <div className="w-32 h-32 rounded-full border-8 border-white/10 flex items-center justify-center">
                            <div className={`text-5xl font-bold ${getHealthColor(financialHealth.data.health_score).split(' ')[0]}`}>
                              {financialHealth.data.health_score}
                            </div>
                          </div>
                        </div>
                        <p className="text-xl font-semibold text-white mt-4">
                          {financialHealth.data.score_label}
                        </p>
                        <Badge className={`mt-2 ${getHealthColor(financialHealth.data.health_score)}`}>
                          {financialHealth.data.risk_level} Risk
                        </Badge>
                      </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-green-400" />
                            Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {financialHealth.data.strengths?.map((strength, i) => (
                              <li key={i} className="flex items-start gap-2 text-green-300">
                                <span>✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="bg-red-500/10 border-red-500/20">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            Areas for Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {financialHealth.data.weaknesses?.map((weakness, i) => (
                              <li key={i} className="flex items-start gap-2 text-red-300">
                                <span>•</span>
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-400" />
                          Personalized Improvement Plan
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-3">
                          {financialHealth.data.improvement_plan?.map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-bold">
                                {i + 1}
                              </span>
                              <span className="text-gray-300">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Click "Generate Full Report" to assess financial health</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Cash Flow Tab */}
            {activeTab === 'cashflow' && (
              <motion.div
                key="cashflow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {loadingCashflow ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  </div>
                ) : cashflowForecast?.data ? (
                  <>
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">90-Day Cash Flow Prediction</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 mb-4">
                          Trend: <span className="text-white font-semibold">{cashflowForecast.data.current_trend}</span>
                        </p>
                        <div className="h-48 bg-white/5 rounded-lg flex items-end gap-1 p-4">
                          {cashflowForecast.data.daily_forecast?.slice(0, 30).map((day, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-purple-600 to-pink-600 rounded-t"
                              style={{ height: `${Math.max(20, (day.predicted_balance / 1000) * 100)}%` }}
                              title={`Day ${day.day}: $${day.predicted_balance}`}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {cashflowForecast.data.liquidity_warnings?.length > 0 && (
                      <Card className="bg-yellow-500/10 border-yellow-500/30">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                            Liquidity Warnings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {cashflowForecast.data.liquidity_warnings.map((warning, i) => (
                              <li key={i} className="text-yellow-300">{warning}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                      <CardHeader>
                        <CardTitle className="text-white">Cash Management Tips</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {cashflowForecast.data.cash_tips?.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-green-300">
                              <Zap className="w-4 h-4 flex-shrink-0 mt-1" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Click "Generate Full Report" to forecast cash flow</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}