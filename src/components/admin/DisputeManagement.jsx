import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function DisputeManagement() {
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolution, setResolution] = useState("");
  const queryClient = useQueryClient();

  const { data: disputes = [] } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      return await base44.asServiceRole.entities.Dispute.list('-created_date', 100);
    }
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, status, adminNotes }) => {
      await base44.asServiceRole.entities.Dispute.update(disputeId, {
        status,
        resolution_notes: adminNotes,
        resolved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-disputes']);
      setSelectedDispute(null);
      setResolution("");
      toast.success('Dispute resolved');
    }
  });

  const pendingDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{pendingDisputes.length}</div>
            <div className="text-gray-400 text-sm">Pending Disputes</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{resolvedDisputes.length}</div>
            <div className="text-gray-400 text-sm">Resolved</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{disputes.length}</div>
            <div className="text-gray-400 text-sm">Total Disputes</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Disputes */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Pending Disputes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingDisputes.map((dispute) => (
              <div key={dispute.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        dispute.priority === 'urgent' ? 'bg-red-500' :
                        dispute.priority === 'high' ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }>
                        {dispute.priority}
                      </Badge>
                      <Badge className="bg-blue-500">{dispute.dispute_type}</Badge>
                    </div>
                    <div className="text-white font-semibold mb-1">{dispute.subject}</div>
                    <div className="text-gray-400 text-sm">{dispute.description}</div>
                    <div className="text-gray-500 text-xs mt-2">
                      Filed by {dispute.created_by} • {new Date(dispute.created_date).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedDispute(dispute)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Review
                  </Button>
                </div>

                {selectedDispute?.id === dispute.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Enter resolution notes..."
                      className="bg-white/10 border-white/20 text-white mb-3"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => resolveDisputeMutation.mutate({
                          disputeId: dispute.id,
                          status: 'resolved',
                          adminNotes: resolution
                        })}
                        disabled={!resolution || resolveDisputeMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedDispute(null);
                          setResolution("");
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {pendingDisputes.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No pending disputes
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Resolved */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recently Resolved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {resolvedDisputes.slice(0, 5).map((dispute) => (
              <div key={dispute.id} className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{dispute.subject}</div>
                  <div className="text-gray-400 text-xs">
                    Resolved {new Date(dispute.resolved_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">Resolved</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}