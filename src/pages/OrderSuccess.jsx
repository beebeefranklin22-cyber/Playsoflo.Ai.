import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const processOrder = async () => {
      if (sessionId && orderId) {
        try {
          await base44.functions.invoke('processShopifyOrder', {
            session_id: sessionId,
            order_id: orderId
          });
        } catch (error) {
          console.error('Order processing error:', error);
        }
      }
      setTimeout(() => setLoading(false), 1000);
    };
    processOrder();
  }, [sessionId, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-purple-900">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">Order Confirmed!</h1>
          <p className="text-gray-300 mb-6">
            Your order has been successfully placed. We'll start processing it right away.
          </p>

          <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-purple-400" />
              <div className="text-left">
                <p className="text-gray-400 text-sm">Order Number</p>
                <p className="text-white font-mono font-bold">#{orderId?.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-left">
              You'll receive a confirmation email with tracking information once your order ships.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(createPageUrl("Marketplace"))}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}