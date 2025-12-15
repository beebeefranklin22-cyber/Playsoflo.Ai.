import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, Clock, CheckCircle, XCircle, AlertCircle, Star, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import P2POrderDetails from "../components/wallet/P2POrderDetails";
import P2PRatingModal from "../components/wallet/P2PRatingModal";

export default function MyP2POrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: myOrders = [] } = useQuery({
    queryKey: ['my-p2p-orders', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const orders = await base44.entities.P2POrder.filter({
        "$or": [
          { seller_email: currentUser.email },
          { buyer_email: currentUser.email }
        ]
      });
      return orders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser,
    refetchInterval: 10000
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      return await base44.entities.P2POrder.update(orderId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-p2p-orders']);
      toast.success('Order completed! Please rate your trading partner.');
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      return await base44.entities.P2POrder.update(orderId, {
        status: 'cancelled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-p2p-orders']);
      toast.success('Order cancelled');
    }
  });

  const filteredOrders = myOrders.filter(order => 
    filterStatus === 'all' || order.status === filterStatus
  );

  const statusConfig = {
    active: { icon: Clock, color: "bg-blue-500", text: "Active" },
    matched: { icon: ArrowUpRight, color: "bg-purple-500", text: "Matched" },
    in_escrow: { icon: Clock, color: "bg-yellow-500", text: "In Escrow" },
    completed: { icon: CheckCircle, color: "bg-green-500", text: "Completed" },
    cancelled: { icon: XCircle, color: "bg-red-500", text: "Cancelled" },
    disputed: { icon: AlertCircle, color: "bg-orange-500", text: "Disputed" }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 sm:p-3 bg-white/10 rounded-full hover:bg-white/20 transition flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My P2P Orders</h1>
              <p className="text-gray-400 text-sm sm:text-base">Track and manage your peer-to-peer trades</p>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {['all', 'active', 'matched', 'in_escrow', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap flex-shrink-0 ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="grid gap-4">
          {filteredOrders.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowUpRight className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400">No {filterStatus !== 'all' ? filterStatus : ''} orders found</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.active;
              const StatusIcon = status.icon;
              const isSeller = order.seller_email === currentUser.email;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${status.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <StatusIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-base sm:text-lg">
                              {order.order_type === 'sell' ? 'Sell' : 'Buy'} {order.crypto_amount} {order.crypto_currency}
                            </h3>
                            <p className="text-gray-400 text-xs sm:text-sm">
                              {isSeller ? 'You are selling' : 'You are buying'}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${status.color} text-white flex-shrink-0`}>
                          {status.text}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Amount</p>
                          <p className="text-white font-semibold">{order.crypto_amount} {order.crypto_currency}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Price per Unit</p>
                          <p className="text-white font-semibold">${order.price_per_unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Total Value</p>
                          <p className="text-white font-semibold">${order.total_amount?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Created</p>
                          <p className="text-white font-semibold">
                            {new Date(order.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => setSelectedOrder(order)}
                          className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none"
                          size="sm"
                        >
                          View Details
                        </Button>

                        {order.status === 'in_escrow' && (
                          <Button
                            onClick={() => completeOrderMutation.mutate(order.id)}
                            disabled={completeOrderMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            size="sm"
                          >
                            Complete
                          </Button>
                        )}

                        {order.status === 'completed' && !order.rated && (
                          <Button
                            onClick={() => setRatingOrder(order)}
                            className="bg-yellow-600 hover:bg-yellow-700 flex-1 sm:flex-none"
                            size="sm"
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Rate
                          </Button>
                        )}

                        {order.status === 'active' && isSeller && (
                          <Button
                            onClick={() => cancelOrderMutation.mutate(order.id)}
                            disabled={cancelOrderMutation.isPending}
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/20 flex-1 sm:flex-none"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {selectedOrder && (
        <P2POrderDetails
          order={selectedOrder}
          currentUser={currentUser}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {ratingOrder && (
        <P2PRatingModal
          order={ratingOrder}
          currentUser={currentUser}
          onClose={() => setRatingOrder(null)}
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}