import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, Shield, AlertTriangle, CheckCircle, Sparkles, Loader2, FileText, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AdminDisputeResolution({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [resolution, setResolution] = useState('');

  const { data: disputes = [] } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const all = await base44.entities.P2PEscrow.filter({
        status: 'disputed'
      });
      return all.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
    }
  });

  const analyzeDispute = async (dispute) => {
    setLoadingAI(true);
    try {
      const orders = await base44.entities.P2POrder.filter({ id: dispute.order_id });
      const order = orders[0];

      const { data } = await base44.functions.invoke('getAIDisputeResolution', {
        orderId: dispute.order_id,
        disputeReason: dispute.dispute_reason,
        userRole: 'admin'
      });

      setAiAnalysis(data.analysis);
      setSelectedDispute({ ...dispute, order });
      toast.success('🤖 AI analysis complete');
    } catch (error) {
      toast.error('Failed to analyze dispute');
    } finally {
      setLoadingAI(false);
    }
  };

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, resolution, outcome }) => {
      await base44.entities.P2PEscrow.update(disputeId, {
        status: outcome === 'buyer_favor' ? 'refunded' : 'released',
        admin_notes: resolution
      });

      // Notify both parties
      const escrow = disputes.find(d => d.id === disputeId);
      await base44.entities.Notification.create({
        recipient_email: escrow.seller_email,
        type: 'alert',
        title: '✅ Dispute Resolved',
        message: `Admin has resolved the dispute. Outcome: ${outcome}. Resolution: ${resolution}`,
        read: false,
        action_url: '/MyP2POrders'
      });

      await base44.entities.Notification.create({
        recipient_email: escrow.buyer_email,
        type: 'alert',
        title: '✅ Dispute Resolved',
        message: `Admin has resolved the dispute. Outcome: ${outcome}. Resolution: ${resolution}`,
        read: false,
        action_url: '/MyP2POrders'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-disputes']);
      toast.success('Dispute resolved successfully');
      setSelectedDispute(null);
      setAiAnalysis(null);
    }
  });

  if (selectedDispute && aiAnalysis) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={() => {
          setSelectedDispute(null);
          setAiAnalysis(null);
        }}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl bg-gray-900 rounded-3xl overflow-hidden my-8"
        >
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Dispute Resolution - AI Analysis
                </h2>
                <p className="text-red-100">Order: {selectedDispute.order?.crypto_amount} {selectedDispute.order?.crypto_currency}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedDispute(null);
                  setAiAnalysis(null);
                }}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Severity & Confidence */}
            <div className="grid grid-cols-2 gap-4">
              <Card className={`border-2 ${
                aiAnalysis.severity === 'critical' ? 'bg-red-500/10 border-red-500/50' :
                aiAnalysis.severity === 'high' ? 'bg-orange-500/10 border-orange-500/50' :
                aiAnalysis.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/50' :
                'bg-green-500/10 border-green-500/50'
              }`}>
                <CardContent className="p-6">
                  <p className="text-gray-400 text-sm mb-2">Severity Level</p>
                  <p className={`text-3xl font-bold ${
                    aiAnalysis.severity === 'critical' ? 'text-red-400' :
                    aiAnalysis.severity === 'high' ? 'text-orange-400' :
                    aiAnalysis.severity === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {aiAnalysis.severity.toUpperCase()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="p-6">
                  <p className="text-gray-400 text-sm mb-2">AI Confidence</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-purple-400">{aiAnalysis.confidence_score}%</p>
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Likely Cause */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Likely Cause
                </h3>
                <p className="text-gray-300">{aiAnalysis.likely_cause}</p>
              </CardContent>
            </Card>

            {/* Credibility Assessment */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Seller Credibility
                    </h4>
                    <Badge className={
                      aiAnalysis.credibility_assessment.seller_credibility === 'high' ? 'bg-green-500/20 text-green-400' :
                      aiAnalysis.credibility_assessment.seller_credibility === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {aiAnalysis.credibility_assessment.seller_credibility}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{selectedDispute.seller_email}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Buyer Credibility
                    </h4>
                    <Badge className={
                      aiAnalysis.credibility_assessment.buyer_credibility === 'high' ? 'bg-green-500/20 text-green-400' :
                      aiAnalysis.credibility_assessment.buyer_credibility === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {aiAnalysis.credibility_assessment.buyer_credibility}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{selectedDispute.buyer_email}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <p className="text-blue-200 text-sm">{aiAnalysis.credibility_assessment.analysis}</p>
              </CardContent>
            </Card>

            {/* Evidence Requirements */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Required Evidence
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-green-400 font-semibold mb-2">From Seller:</p>
                    <ul className="space-y-1">
                      {aiAnalysis.evidence_needed.from_seller.map((item, i) => (
                        <li key={i} className="text-gray-300 text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-blue-400 font-semibold mb-2">From Buyer:</p>
                    <ul className="space-y-1">
                      {aiAnalysis.evidence_needed.from_buyer.map((item, i) => (
                        <li key={i} className="text-gray-300 text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {aiAnalysis.evidence_needed.critical_evidence.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 font-semibold text-sm mb-2">⚠️ Critical Evidence:</p>
                    <ul className="space-y-1">
                      {aiAnalysis.evidence_needed.critical_evidence.map((item, i) => (
                        <li key={i} className="text-yellow-200 text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Red Flags */}
            {aiAnalysis.red_flags.length > 0 && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-6">
                  <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Red Flags Detected
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.red_flags.map((flag, i) => (
                      <li key={i} className="text-red-200 text-sm flex items-start gap-2">
                        <span className="text-red-400 flex-shrink-0">⚠</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Potential Outcomes */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-bold mb-4">Potential Resolution Scenarios</h3>
                <div className="space-y-3">
                  {aiAnalysis.potential_outcomes.map((outcome, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-white font-semibold">{outcome.scenario}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500/20 text-purple-400">{outcome.likelihood}</Badge>
                          {outcome.fair_to_both && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admin Action */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
              <CardContent className="p-6">
                <h3 className="text-white font-bold mb-3">Admin Investigation Required</h3>
                <p className="text-purple-200 text-sm mb-4">{aiAnalysis.admin_action}</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">Resolution Notes</label>
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Explain your decision and reasoning..."
                      className="bg-white/10 border-white/20 text-white h-32"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => resolveDisputeMutation.mutate({
                        disputeId: selectedDispute.id,
                        resolution,
                        outcome: 'buyer_favor'
                      })}
                      disabled={!resolution || resolveDisputeMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Resolve in Buyer's Favor
                    </Button>
                    <Button
                      onClick={() => resolveDisputeMutation.mutate({
                        disputeId: selectedDispute.id,
                        resolution,
                        outcome: 'seller_favor'
                      })}
                      disabled={!resolution || resolveDisputeMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Resolve in Seller's Favor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl bg-gray-900 rounded-3xl overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <Shield className="w-8 h-8" />
                P2P Dispute Management
              </h2>
              <p className="text-red-100">{disputes.length} active disputes requiring attention</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {disputes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-white font-semibold">No active disputes</p>
              <p className="text-gray-400 text-sm">All clear! Check back later.</p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <Card key={dispute.id} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className="bg-red-500/20 text-red-400">DISPUTED</Badge>
                        <p className="text-white font-bold">{dispute.crypto_amount} {dispute.crypto_currency}</p>
                        <p className="text-gray-400">• ${dispute.fiat_amount?.toFixed(2)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-400">Seller</p>
                          <p className="text-white">{dispute.seller_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Buyer</p>
                          <p className="text-white">{dispute.buyer_email}</p>
                        </div>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{dispute.dispute_reason}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => analyzeDispute(dispute)}
                      disabled={loadingAI}
                      className="ml-4 bg-purple-600 hover:bg-purple-700"
                    >
                      {loadingAI ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}