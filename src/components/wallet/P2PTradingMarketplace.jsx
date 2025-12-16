import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRightLeft, Plus, Filter, Star, Shield, Clock, MessageCircle, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CreateP2POrderModal from "./CreateP2POrderModal";
import P2POrderDetails from "./P2POrderDetails";
import P2PAnalyticsDashboard from "./P2PAnalyticsDashboard";
import HelpModal from "../onboarding/HelpModal";

export default function P2PTradingMarketplace({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCrypto, setFilterCrypto] = useState('all');
  const [showHelp, setShowHelp] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ['p2p-orders', filterType, filterCrypto],
    queryFn: async () => {
      let query = { status: 'active' };
      if (filterType !== 'all') {
        query.order_type = filterType;
      }
      if (filterCrypto !== 'all') {
        query.crypto_currency = filterCrypto;
      }
      
      const all = await base44.entities.P2POrder.filter(query);
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-p2p-orders', currentUser.email],
    queryFn: async () => {
      const selling = await base44.entities.P2POrder.filter({
        seller_email: currentUser.email
      });
      const buying = await base44.entities.P2POrder.filter({
        buyer_email: currentUser.email
      });
      return [...selling, ...buying].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: traderStats } = useQuery({
    queryKey: ['trader-stats', currentUser.email],
    queryFn: async () => {
      const ratings = await base44.entities.TraderRating.filter({
        trader_email: currentUser.email
      });
      
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;
      
      const completedOrders = await base44.entities.P2POrder.filter({
        seller_email: currentUser.email,
        status: 'completed'
      });

      return {
        avgRating: avgRating.toFixed(1),
        totalTrades: completedOrders.length,
        totalRatings: ratings.length
      };
    }
  });

  const cryptos = ['all', 'BTC', 'ETH', 'SoFloCoin', 'USDT', 'SOL'];

  if (showHelp) {
    return <HelpModal topic="p2p_trading" onClose={() => setShowHelp(false)} />;
  }

  if (showAnalytics) {
    return <P2PAnalyticsDashboard currentUser={currentUser} onClose={() => setShowAnalytics(false)} />;
  }

  if (showCreateOrder) {
    return <CreateP2POrderModal currentUser={currentUser} onClose={() => setShowCreateOrder(false)} />;
  }

  if (selectedOrder) {
    return (
      <P2POrderDetails
        order={selectedOrder}
        currentUser={currentUser}
        onClose={() => setSelectedOrder(null)}
      />
    );
  }

  return (
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
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-8 h-8" />
                P2P Trading
              </h2>
              <p className="text-green-100">Trade crypto peer-to-peer with escrow protection</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowAnalytics(true)}
                variant="outline"
                className="bg-purple-500/20 border-purple-500/30 text-purple-300"
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={() => setShowHelp(true)}
                variant="outline"
                className="bg-white/10 border-white/20 text-white"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                How P2P Works
              </Button>
              <Button
                onClick={() => setShowCreateOrder(true)}
                className="bg-white text-green-600 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {traderStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-green-100 text-sm">Your Rating</p>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <p className="text-white text-2xl font-bold">{traderStats.avgRating}</p>
                  <p className="text-green-200 text-sm">({traderStats.totalRatings})</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-green-100 text-sm">Total Trades</p>
                <p className="text-white text-2xl font-bold">{traderStats.totalTrades}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-green-100 text-sm">Active Orders</p>
                <p className="text-white text-2xl font-bold">
                  {myOrders.filter(o => o.status === 'active').length}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              <Button
                onClick={() => setFilterType('all')}
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                className={filterType === 'all' ? 'bg-green-600' : ''}
              >
                All
              </Button>
              <Button
                onClick={() => setFilterType('buy')}
                variant={filterType === 'buy' ? 'default' : 'outline'}
                size="sm"
                className={filterType === 'buy' ? 'bg-green-600' : ''}
              >
                Buy Orders
              </Button>
              <Button
                onClick={() => setFilterType('sell')}
                variant={filterType === 'sell' ? 'default' : 'outline'}
                size="sm"
                className={filterType === 'sell' ? 'bg-green-600' : ''}
              >
                Sell Orders
              </Button>
            </div>
            <div className="flex gap-2 ml-auto">
              {cryptos.map(crypto => (
                <button
                  key={crypto}
                  onClick={() => setFilterCrypto(crypto)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    filterCrypto === crypto
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {crypto === 'all' ? 'All' : crypto}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRightLeft className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No orders available</p>
              </div>
            ) : (
              orders.map((order) => (
                <Card
                  key={order.id}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={
                            order.order_type === 'buy'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }>
                            {order.order_type.toUpperCase()}
                          </Badge>
                          <h4 className="text-white font-bold text-lg">
                            {order.crypto_amount} {order.crypto_currency}
                          </h4>
                          <Badge className="bg-green-500/20 text-green-400">
                            @ ${order.price_per_unit}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Total Amount</p>
                            <p className="text-white font-semibold">${order.total_amount?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Limit</p>
                            <p className="text-white font-semibold">
                              ${order.min_order_limit} - ${order.max_order_limit}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Payment Methods</p>
                            <div className="flex gap-1 mt-1">
                              {order.payment_methods?.slice(0, 3).map((method, idx) => (
                                <Badge key={idx} className="bg-gray-500/20 text-gray-300 text-xs">
                                  {method}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400">Time Limit</p>
                            <p className="text-white font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {order.time_limit_minutes} min
                            </p>
                          </div>
                        </div>

                        {order.terms && (
                          <p className="text-gray-400 text-sm mt-3 line-clamp-2">{order.terms}</p>
                        )}
                      </div>

                      <div className="text-right ml-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-semibold">Escrow Protected</span>
                        </div>
                        <Button className="bg-green-600 hover:bg-green-700">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* My Orders Tab */}
          {myOrders.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">My Orders</h3>
              <div className="space-y-3">
                {myOrders.slice(0, 5).map((order) => (
                  <Card
                    key={order.id}
                    className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge className={
                            order.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }>
                            {order.status}
                          </Badge>
                          <div>
                            <p className="text-white font-semibold">
                              {order.crypto_amount} {order.crypto_currency}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {order.order_type} @ ${order.price_per_unit}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">${order.total_amount?.toFixed(2)}</p>
                          <p className="text-gray-400 text-sm">
                            {new Date(order.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}