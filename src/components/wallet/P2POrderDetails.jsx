import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, Shield, MessageCircle, AlertTriangle, Star, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import P2PChat from "./P2PChat";

export default function P2POrderDetails({ order, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [aiDisputeAnalysis, setAiDisputeAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { data: escrow } = useQuery({
    queryKey: ['p2p-escrow', order.escrow_id],
    queryFn: async () => {
      if (!order.escrow_id) return null;
      const escrows = await base44.entities.P2PEscrow.filter({ id: order.escrow_id });
      return escrows[0];
    },
    enabled: !!order.escrow_id
  });

  // Accepting/matching an order, confirming payment, and releasing escrow
  // used to be wired here, but releasing escrow called a Supabase Edge
  // Function (processP2PEscrow) that was never actually deployed (no
  // supabase/functions/ directory exists in this repo -- same shape of bug
  // fixed for self-serve ads), and no step anywhere ever actually locked
  // the seller's crypto_wallets balance when a trade was "matched", so
  // there was nothing real for a release to even move. Building real
  // fund-reservation and settlement is a genuine feature gap, not a small
  // fix; the whole flow is paused (see the banner above) instead of
  // shipping the illusion of an escrow that doesn't hold anything.

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const traderEmail = order.seller_email === currentUser.email 
        ? order.buyer_email 
        : order.seller_email;

      await base44.entities.TraderRating.create({
        trader_email: traderEmail,
        rater_email: currentUser.email,
        order_id: order.id,
        rating,
        review_text: reviewText,
        trade_type: order.order_type
      });
    },
    onSuccess: () => {
      toast.success('Rating submitted!');
      setReviewText('');
    }
  });

  const isMyOrder = order.seller_email === currentUser.email || order.buyer_email === currentUser.email;
  const isSeller = order.seller_email === currentUser.email;

  const getAIDisputeHelp = async () => {
    if (!disputeReason) {
      toast.error('Please describe the dispute first');
      return;
    }

    setLoadingAI(true);
    try {
      const { data } = await base44.functions.invoke('getAIDisputeResolution', {
        orderId: order.id,
        disputeReason,
        userRole: isSeller ? 'seller' : 'buyer'
      });

      if (data.success) {
        setAiDisputeAnalysis(data.analysis);
        toast.success('🤖 AI analysis complete');
      }
    } catch (error) {
      toast.error('Failed to get AI analysis');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <p className="text-green-100">P2P crypto escrow trading — coming soon</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-200 text-sm">
                Escrow release isn't live yet — starting, funding, or releasing a trade is paused until real settlement is built. Nothing here moves any funds.
              </p>
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={order.order_type === 'buy' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}>
                      {order.order_type.toUpperCase()}
                    </Badge>
                    <h3 className="text-white font-bold text-2xl">
                      {order.crypto_amount} {order.crypto_currency}
                    </h3>
                  </div>
                  <p className="text-gray-400">@ ${order.price_per_unit} per unit</p>
                </div>
                <Badge className={
                  order.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  order.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }>
                  {order.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Total Amount</p>
                  <p className="text-white font-bold text-lg">${order.total_amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Limit</p>
                  <p className="text-white font-semibold">${order.min_order_limit} - ${order.max_order_limit}</p>
                </div>
                <div>
                  <p className="text-gray-400">Time Limit</p>
                  <p className="text-white font-semibold">{order.time_limit_minutes} minutes</p>
                </div>
                <div>
                  <p className="text-gray-400">Payment Methods</p>
                  <p className="text-white font-semibold">{order.payment_methods?.join(', ')}</p>
                </div>
              </div>

              {order.terms && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Terms & Conditions:</p>
                  <p className="text-white text-sm">{order.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Escrow Status */}
          {escrow && (
            <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <h4 className="text-white font-bold text-lg">Escrow Status</h4>
                  <Badge className="bg-purple-500/20 text-purple-400">{escrow.status}</Badge>
                </div>

                <div className="space-y-3">
                  {escrow.status === 'pending_payment' && (
                    <div className="flex items-center gap-2 text-yellow-300">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Waiting for buyer to submit payment</span>
                    </div>
                  )}
                  {escrow.status === 'payment_submitted' && (
                    <div className="flex items-center gap-2 text-blue-300">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Payment submitted, waiting for seller confirmation</span>
                    </div>
                  )}
                  {escrow.status === 'released' && (
                    <div className="flex items-center gap-2 text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Escrow released, trade completed successfully!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isMyOrder && order.status === 'active' && (
              <Button
                disabled
                title="P2P crypto trading is coming soon"
                className="flex-1 bg-white/10 text-gray-500 cursor-not-allowed py-6 text-lg"
              >
                Accept & Start Trade (Coming Soon)
              </Button>
            )}

            {order.buyer_email === currentUser.email && escrow?.status === 'pending_payment' && (
              <Button
                disabled
                title="P2P crypto trading is coming soon"
                className="flex-1 bg-white/10 text-gray-500 cursor-not-allowed py-6 text-lg"
              >
                Confirm Payment Sent (Coming Soon)
              </Button>
            )}

            {isSeller && escrow?.status === 'payment_submitted' && (
              <Button
                disabled
                title="Escrow release is coming soon — contact support about this order"
                className="flex-1 bg-white/10 text-gray-500 cursor-not-allowed py-6 text-lg"
              >
                Release Escrow (Coming Soon)
              </Button>
            )}

            {isMyOrder && order.buyer_email && (
              <Button 
                onClick={() => setShowChat(!showChat)}
                variant="outline" 
                className="flex-1 border-blue-500/50 text-blue-400"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {showChat ? 'Hide Chat' : 'Message Trader'}
              </Button>
            )}

            {isMyOrder && order.status !== 'completed' && (
              <Button
                onClick={() => setShowDispute(!showDispute)}
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            )}
          </div>

          {/* Chat Section */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <P2PChat order={order} currentUser={currentUser} escrow={escrow} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dispute Section */}
          {showDispute && (
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-white font-bold">Report Dispute</h4>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue..."
                  className="bg-white/10 border-white/20 text-white h-24"
                />
                
                <Button
                  onClick={getAIDisputeHelp}
                  disabled={loadingAI || !disputeReason}
                  variant="outline"
                  className="w-full border-purple-500/50 text-purple-300"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get AI Resolution Assistance
                    </>
                  )}
                </Button>

                {aiDisputeAnalysis && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-3">
                    <p className="text-purple-300 font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Dispute Analysis
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-400">Severity</p>
                        <p className={`font-semibold ${
                          aiDisputeAnalysis.severity === 'critical' ? 'text-red-400' :
                          aiDisputeAnalysis.severity === 'high' ? 'text-orange-400' :
                          aiDisputeAnalysis.severity === 'medium' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {aiDisputeAnalysis.severity.toUpperCase()}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Likely Cause</p>
                        <p className="text-white">{aiDisputeAnalysis.likely_cause}</p>
                      </div>

                      <div>
                        <p className="text-gray-400">Recommended Steps</p>
                        <ul className="text-purple-200 space-y-1">
                          {aiDisputeAnalysis.recommended_steps.map((step, i) => (
                            <li key={i}>• {step}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-gray-400">Your Action</p>
                        <p className="text-white">
                          {isSeller ? aiDisputeAnalysis.seller_action : aiDisputeAnalysis.buyer_action}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">Estimated Resolution Time</p>
                        <p className="text-white">{aiDisputeAnalysis.resolution_timeline}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={async () => {
                    // Update escrow with dispute
                    if (escrow) {
                      await base44.entities.P2PEscrow.update(escrow.id, {
                        status: 'disputed',
                        dispute_reason: disputeReason
                      });
                    }

                    // Notify other party
                    const otherPartyEmail = isSeller ? order.buyer_email : order.seller_email;
                    await base44.entities.Notification.create({
                      recipient_email: otherPartyEmail,
                      type: 'alert',
                      title: '⚠️ Dispute filed on your P2P trade',
                      message: `A dispute was filed for ${order.crypto_amount} ${order.crypto_currency}. Reason: ${disputeReason}`,
                      read: false,
                      action_url: '/MyP2POrders'
                    });

                    // Notify admins
                    const adminUsers = await base44.entities.User.filter({ role: 'admin' });
                    for (const admin of adminUsers) {
                      await base44.entities.Notification.create({
                        recipient_email: admin.email,
                        type: 'alert',
                        title: '🚨 P2P Dispute - Admin Action Required',
                        message: `Dispute filed on ${order.crypto_currency} order. Amount: ${order.total_amount} USD. Review needed.`,
                        read: false,
                        action_url: '/MyP2POrders'
                      });
                    }

                    queryClient.invalidateQueries(['p2p-escrow']);
                    toast.success('Dispute submitted to admin');
                    setShowDispute(false);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Submit Dispute to Admin
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rating */}
          {order.status === 'completed' && isMyOrder && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h4 className="text-white font-bold mb-4">Rate this trader</h4>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white mb-3"
                  rows={3}
                />
                <Button
                  onClick={() => submitRatingMutation.mutate()}
                  disabled={submitRatingMutation.isPending}
                  className="bg-purple-600"
                >
                  Submit Rating
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}