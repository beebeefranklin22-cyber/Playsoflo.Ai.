import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, TrendingUp, AlertCircle, RefreshCw, Droplet, Zap, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DeFiTracker({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: positions = [] } = useQuery({
    queryKey: ['defi-positions', currentUser.email],
    queryFn: async () => {
      return await base44.entities.DeFiPosition.filter({
        user_email: currentUser.email,
        status: 'active'
      });
    }
  });

  const refreshPositionsMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('fetchDeFiPositions', {
        walletAddress: currentUser.email
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['defi-positions']);
      toast.success('✓ DeFi positions updated');
      setRefreshing(false);
    },
    onError: () => {
      toast.error('Failed to refresh positions');
      setRefreshing(false);
    }
  });

  const trackAPYMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('trackDeFiAPY');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['defi-positions']);
      if (data.alerts_sent > 0) {
        toast.success(`📊 ${data.alerts_sent} APY alert(s) detected`);
      }
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      trackAPYMutation.mutate();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    refreshPositionsMutation.mutate();
  };

  const totalValueUSD = positions.reduce((sum, p) => sum + (p.total_value_usd || 0), 0);
  const totalRewards = positions.reduce((sum, p) => sum + (p.rewards_earned || 0), 0);
  const avgAPY = positions.length > 0 
    ? positions.reduce((sum, p) => sum + (p.current_apy || 0), 0) / positions.length 
    : 0;

  const protocolIcons = {
    uniswap: "🦄",
    aave: "👻",
    compound: "🏦",
    curve: "🌀",
    yearn: "💙",
    pancakeswap: "🥞",
    sushiswap: "🍣",
    balancer: "⚖️"
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl bg-gray-900 rounded-3xl overflow-hidden my-8"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Droplet className="w-8 h-8" />
                  DeFi Portfolio
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  Track liquidity pools, yield farms, and lending positions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-purple-100 text-sm">Total Value</p>
                <p className="text-white text-2xl font-bold">${totalValueUSD.toFixed(2)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-purple-100 text-sm">Total Rewards</p>
                <p className="text-green-400 text-2xl font-bold">${totalRewards.toFixed(2)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-purple-100 text-sm">Avg APY</p>
                <p className="text-white text-2xl font-bold">{avgAPY.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Active Positions */}
            {positions.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Droplet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No DeFi positions tracked yet</p>
                  <Button onClick={handleRefresh} className="bg-purple-600">
                    Scan for Positions
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {positions.map((position) => (
                  <Card key={position.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">
                            {protocolIcons[position.protocol] || "💎"}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg capitalize">
                              {position.protocol}
                            </h4>
                            <p className="text-gray-400 text-sm">{position.pool_name}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
                          {position.current_apy?.toFixed(2)}% APY
                        </Badge>
                      </div>

                      {/* Position Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Position Type</span>
                          <span className="text-white capitalize">{position.position_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Total Value</span>
                          <span className="text-white font-bold">
                            ${position.total_value_usd?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rewards Earned</span>
                          <span className="text-green-400 font-bold">
                            +${position.rewards_earned?.toFixed(2)}
                          </span>
                        </div>
                        {position.impermanent_loss !== 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Impermanent Loss</span>
                            <span className="text-red-400 font-bold">
                              ${position.impermanent_loss?.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tokens */}
                      <div className="bg-white/5 rounded-lg p-3 mb-4">
                        <p className="text-gray-400 text-xs mb-2">Assets</p>
                        <div className="space-y-1">
                          {position.tokens?.map((token, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-white">{token.symbol}</span>
                              <span className="text-gray-400">
                                {token.amount?.toFixed(4)} (${token.value_usd?.toFixed(2)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* APY History Chart */}
                      {position.apy_history && position.apy_history.length > 1 && (
                        <div className="mt-4">
                          <p className="text-gray-400 text-xs mb-2">APY Trend</p>
                          <ResponsiveContainer width="100%" height={80}>
                            <LineChart data={position.apy_history.slice(-7)}>
                              <Line 
                                type="monotone" 
                                dataKey="apy" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                dot={false}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#1f2937', 
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px'
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Alert Settings */}
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                        <span className="text-gray-400">
                          Alert threshold: ±{position.alert_threshold}% APY change
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Info */}
            <Card className="bg-blue-500/10 border border-blue-500/30">
              <CardContent className="p-4">
                <p className="text-blue-300 text-sm">
                  <strong>💡 DeFi Tip:</strong> Positions are automatically tracked across major protocols. 
                  APY changes are monitored and you'll receive alerts for significant fluctuations.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}