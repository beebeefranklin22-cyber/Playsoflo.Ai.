import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  AlertTriangle, CheckCircle, X, FileText, 
  DollarSign, Image, Send, Download, Brain, 
  Loader2, TrendingUp, Shield 
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function FleetDisputeResolution({ rentals, cars }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolving, setResolving] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: disputes = [] } = useQuery({
    queryKey: ['fleet-disputes', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Get disputes where I'm the respondent (fleet owner)
      const myDisputes = await base44.entities.Dispute.filter({
        respondent_email: currentUser.email
      });

      // Get damage settlements
      const settlements = await base44.entities.DamageSettlement.filter({
        owner_email: currentUser.email
      });

      return [...myDisputes, ...settlements.map(s => ({
        ...s,
        type: 'damage_settlement',
        reference_type: 'rental',
        status: s.status
      }))];
    },
    enabled: !!currentUser,
    initialData: []
  });

  const analyzeDisputeMutation = useMutation({
    mutationFn: async (dispute) => {
      const rental = rentals.find(r => r.id === dispute.reference_id);
      const car = cars.find(c => c.id === rental?.car_id);

      // Gather comprehensive data
      const renterHistory = await base44.entities.CarRental.filter({
        renter_email: rental?.renter_email
      });

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI dispute resolution specialist for a car rental fleet.

DISPUTE TYPE: ${dispute.type || 'general'}
SEVERITY: ${dispute.severity || 'medium'}

RENTAL DETAILS:
- Car: ${car?.title}
- Rental Period: ${rental?.start_date} to ${rental?.end_date}
- Total Cost: $${rental?.total_amount}
- Pre-rental inspection: ${rental?.pre_rental_inspection ? 'Complete' : 'Missing'}
- Post-rental inspection: ${rental?.post_rental_inspection ? 'Complete' : 'Missing'}
- Photos comparison: ${rental?.photo_comparison ? 'Available' : 'Not available'}
- New damages detected: ${rental?.new_damages_detected ? 'Yes' : 'No'}

RENTER PROFILE:
- Total rentals: ${renterHistory.length}
- Completed rentals: ${renterHistory.filter(r => r.status === 'completed').length}
- Disputes: ${disputes.filter(d => d.disputer_email === rental?.renter_email).length}

DISPUTE DESCRIPTION:
${dispute.description || dispute.damage_description || 'N/A'}

EVIDENCE:
- Photos: ${dispute.evidence_urls?.length || dispute.photos?.length || 0} files
- AI photo analysis: ${rental?.photo_comparison ? 'Available' : 'Not available'}
${rental?.photo_comparison ? `
  - New damages: ${rental.photo_comparison.new_damages_count}
  - Confidence score: ${rental.photo_comparison.comparison_confidence}%
  - Estimated repair cost: ${rental.photo_comparison.estimated_repair_cost}
` : ''}

Analyze this dispute and provide:
1. Dispute validity assessment
2. Recommended resolution
3. Fair compensation/deduction amount
4. Evidence-based justification
5. Risk assessment for legal escalation
6. Automated resolution recommendation (approve/reject/negotiate)

Return comprehensive JSON analysis.`,
        response_json_schema: {
          type: "object",
          properties: {
            validity_score: { type: "number" },
            validity_assessment: { type: "string" },
            recommended_action: { type: "string" },
            compensation_amount: { type: "number" },
            justification: { type: "string" },
            supporting_evidence: { 
              type: "array", 
              items: { type: "string" } 
            },
            risk_level: { type: "string" },
            legal_escalation_risk: { type: "number" },
            auto_resolve: { type: "boolean" },
            resolution_statement: { type: "string" },
            timeline_days: { type: "number" },
            renter_reputation_impact: { type: "string" },
            owner_liability: { type: "string" }
          }
        }
      });

      return analysis;
    },
    onSuccess: (analysis, dispute) => {
      setSelectedDispute({ ...dispute, ai_analysis: analysis });
      toast.success("AI analysis complete");
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze dispute");
    }
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ dispute, resolution, compensationAmount }) => {
      // Update dispute status
      if (dispute.type === 'damage_settlement') {
        await base44.entities.DamageSettlement.update(dispute.id, {
          status: resolution,
          settlement_amount: compensationAmount,
          owner_response: selectedDispute.ai_analysis?.resolution_statement,
          resolved_at: new Date().toISOString()
        });
      } else {
        await base44.entities.Dispute.update(dispute.id, {
          status: resolution,
          resolution: selectedDispute.ai_analysis?.resolution_statement,
          resolved_at: new Date().toISOString(),
          resolved_by: currentUser.email
        });
      }

      // Create payment if needed
      if (compensationAmount > 0) {
        await base44.entities.Payment.create({
          amount_usd: compensationAmount,
          amount_rri: 0,
          method: "deduction",
          status: "completed",
          reference_type: dispute.type === 'damage_settlement' ? 'damage' : 'dispute',
          reference_id: dispute.id,
          memo: `Dispute resolution - ${resolution}`
        });
      }

      // Notify renter
      await base44.entities.Notification.create({
        recipient_email: dispute.disputer_email || dispute.renter_email,
        type: "dispute_resolved",
        title: "Dispute Resolved",
        message: `Your dispute has been ${resolution}. ${compensationAmount > 0 ? `Amount: $${compensationAmount}` : ''}`,
        reference_type: "dispute",
        reference_id: dispute.id
      });

      return { dispute, resolution };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fleet-disputes']);
      setSelectedDispute(null);
      toast.success("Dispute resolved");
    },
    onError: (error) => {
      console.error("Resolution error:", error);
      toast.error("Failed to resolve dispute");
    }
  });

  const exportDispute = (dispute) => {
    const exportData = {
      dispute_id: dispute.id,
      type: dispute.type || 'general',
      status: dispute.status,
      ai_analysis: selectedDispute?.ai_analysis,
      evidence: dispute.evidence_urls || dispute.photos,
      created_at: dispute.created_date,
      rental_details: rentals.find(r => r.id === dispute.reference_id)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-${dispute.id}-${Date.now()}.json`;
    a.click();
    toast.success("Dispute exported for external escalation");
  };

  const pendingDisputes = disputes.filter(d => d.status === 'pending');
  const resolvedDisputes = disputes.filter(d => ['resolved', 'approved', 'rejected'].includes(d.status));

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-400" />
          AI Dispute Resolution Center
          {pendingDisputes.length > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              {pendingDisputes.length} Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger value="pending">
              Pending ({pendingDisputes.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedDisputes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingDisputes.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-400">No pending disputes</p>
              </div>
            ) : (
              pendingDisputes.map(dispute => (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className="text-white font-semibold">
                          {dispute.type === 'damage_settlement' ? 'Damage Claim' : 'Booking Dispute'}
                        </span>
                        <Badge className="bg-red-500/20 text-red-300">
                          {dispute.severity || 'medium'}
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm">
                        {dispute.description || dispute.damage_description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Filed: {new Date(dispute.created_date).toLocaleDateString()}</span>
                        {(dispute.evidence_urls?.length || dispute.photos?.length) > 0 && (
                          <span className="flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            {dispute.evidence_urls?.length || dispute.photos?.length} files
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => analyzeDisputeMutation.mutate(dispute)}
                      disabled={analyzeDisputeMutation.isPending}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {analyzeDisputeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          AI Analyze
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => exportDispute(dispute)}
                      size="sm"
                      variant="outline"
                      className="bg-white/5 border-white/20"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  {/* AI Analysis Results */}
                  {selectedDispute?.id === dispute.id && selectedDispute.ai_analysis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-3 border-t border-white/10 pt-4"
                    >
                      {/* Validity Score */}
                      <div className={`rounded-lg p-3 ${
                        selectedDispute.ai_analysis.validity_score >= 70 
                          ? 'bg-green-500/10 border border-green-500/30'
                          : selectedDispute.ai_analysis.validity_score >= 40
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">Validity Assessment</span>
                          <Badge className="bg-white/20">
                            {selectedDispute.ai_analysis.validity_score}% Valid
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm">
                          {selectedDispute.ai_analysis.validity_assessment}
                        </p>
                      </div>

                      {/* Recommended Action */}
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <h4 className="text-blue-300 font-semibold mb-2">Recommended Action</h4>
                        <p className="text-white mb-2">{selectedDispute.ai_analysis.recommended_action}</p>
                        {selectedDispute.ai_analysis.compensation_amount > 0 && (
                          <div className="flex items-center gap-2 text-green-400">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-bold">
                              ${selectedDispute.ai_analysis.compensation_amount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Supporting Evidence */}
                      <div className="bg-white/5 rounded-lg p-3">
                        <h4 className="text-white font-semibold mb-2">Evidence Analysis</h4>
                        <ul className="space-y-1">
                          {selectedDispute.ai_analysis.supporting_evidence?.map((evidence, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              {evidence}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Resolution Actions */}
                      <div className="flex gap-2">
                        {selectedDispute.ai_analysis.auto_resolve && (
                          <Button
                            onClick={() => resolveDisputeMutation.mutate({
                              dispute,
                              resolution: 'resolved',
                              compensationAmount: selectedDispute.ai_analysis.compensation_amount
                            })}
                            disabled={resolveDisputeMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Auto-Resolve
                          </Button>
                        )}
                        <Button
                          onClick={() => resolveDisputeMutation.mutate({
                            dispute,
                            resolution: 'approved',
                            compensationAmount: selectedDispute.ai_analysis.compensation_amount
                          })}
                          disabled={resolveDisputeMutation.isPending}
                          variant="outline"
                          className="flex-1 bg-green-500/10 border-green-500/30 text-green-300"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => resolveDisputeMutation.mutate({
                            dispute,
                            resolution: 'rejected',
                            compensationAmount: 0
                          })}
                          disabled={resolveDisputeMutation.isPending}
                          variant="outline"
                          className="flex-1 bg-red-500/10 border-red-500/30 text-red-300"
                        >
                          Reject
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4 mt-4">
            {resolvedDisputes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No resolved disputes</p>
              </div>
            ) : (
              resolvedDisputes.map(dispute => (
                <div
                  key={dispute.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-white font-medium">
                          {dispute.type === 'damage_settlement' ? 'Damage Claim' : 'Dispute'}
                        </span>
                        <Badge className="bg-green-500/20 text-green-300">
                          {dispute.status}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Resolved: {new Date(dispute.resolved_at || dispute.updated_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => exportDispute(dispute)}
                      size="sm"
                      variant="outline"
                      className="bg-white/5 border-white/20"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}