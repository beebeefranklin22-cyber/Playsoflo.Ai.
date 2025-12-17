import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Package, Plus, MapPin, Clock, DollarSign, Truck, 
  CheckCircle, ArrowLeft, Search, Filter, TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import CreateDeliveryModal from "../components/delivery/CreateDeliveryModal";
import DeliveryTrackingModal from "../components/delivery/DeliveryTrackingModal";

export default function PackageDelivery() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: myDeliveries = [], refetch } = useQuery({
    queryKey: ['my-deliveries', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const sent = await base44.entities.DeliveryOrder.filter({
        sender_email: currentUser.email
      });
      const received = await base44.entities.DeliveryOrder.filter({
        recipient_email: currentUser.email
      });
      return [...sent, ...received].sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!currentUser
  });

  const filteredDeliveries = filterStatus === 'all' 
    ? myDeliveries 
    : myDeliveries.filter(d => d.status === filterStatus);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      driver_assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      picked_up: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      in_transit: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex items-center gap-2 text-white mb-4 hover:opacity-80 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Package className="w-8 h-8" />
                Package Delivery
              </h1>
              <p className="text-blue-100">Ship packages faster and cheaper than Uber</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Delivery
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <Package className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Deliveries</p>
            <p className="text-white text-3xl font-bold">{myDeliveries.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <Truck className="w-8 h-8 text-cyan-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">In Transit</p>
            <p className="text-white text-3xl font-bold">
              {myDeliveries.filter(d => ['in_transit', 'out_for_delivery'].includes(d.status)).length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Delivered</p>
            <p className="text-white text-3xl font-bold">
              {myDeliveries.filter(d => d.status === 'delivered').length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <TrendingDown className="w-8 h-8 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Avg. Savings</p>
            <p className="text-white text-3xl font-bold">35%</p>
            <p className="text-purple-300 text-xs">vs Uber</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          {['all', 'pending', 'in_transit', 'delivered'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Deliveries List */}
        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <Package className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Deliveries Yet</h3>
            <p className="text-gray-400 mb-6">Start shipping packages at better prices!</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Delivery
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeliveries.map((delivery) => (
              <motion.div
                key={delivery.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition cursor-pointer"
                onClick={() => setSelectedDelivery(delivery)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Order #{delivery.order_number?.substring(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-gray-400 text-sm">{delivery.package_description || delivery.package_type}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${getStatusColor(delivery.status)}`}>
                    {delivery.status.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Pickup</p>
                        <p className="text-white text-sm">{delivery.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">Delivery</p>
                        <p className="text-white text-sm">{delivery.delivery_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Distance</span>
                      <span className="text-white font-semibold">{delivery.distance_miles} mi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Price</span>
                      <span className="text-green-400 font-bold text-lg">${delivery.total_price?.toFixed(2)}</span>
                    </div>
                    {delivery.driver_email && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <Truck className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-400 text-sm">Driver assigned</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateDeliveryModal
          currentUser={currentUser}
          onClose={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}

      {selectedDelivery && (
        <DeliveryTrackingModal
          delivery={selectedDelivery}
          currentUser={currentUser}
          onClose={() => setSelectedDelivery(null)}
        />
      )}
    </div>
  );
}