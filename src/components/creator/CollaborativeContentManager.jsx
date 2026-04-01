import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HandshakeIcon, DollarSign, Users, TrendingUp, Edit, Plus, BarChart3, Wallet, Eye, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CollaborativeContentManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [editingContent, setEditingContent] = useState(null);
  const [shareForm, setShareForm] = useState({});
  const [viewingRevenue, setViewingRevenue] = useState(null);

  // Get all content where user is a collaborator
  const { data: myCollabContent = [] } = useQuery({
    queryKey: ['collab-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Get PPV content where user is creator or co-creator
      const ppvContent = await base44.entities.PPVContent.filter({
        creator_email: currentUser.email
      });

      // Get revenue shares where user is receiving
      const myShares = await base44.entities.RevenueShare.filter({
        creator_email: currentUser.email
      });

      return {
        owned: ppvContent,
        shared: myShares
      };
    },
    enabled: !!currentUser,
    initialData: { owned: [], shared: [] }
  });

  const { data: revenueShares = [] } = useQuery({
    queryKey: ['content-revenue-shares', editingContent?.id],
    queryFn: async () => {
      if (!editingContent) return [];
      return await base44.entities.RevenueShare.filter({
        content_id: editingContent.id
      });
    },
    enabled: !!editingContent,
    initialData: []
  });

  const addRevenueShareMutation = useMutation({
    mutationFn: (data) => base44.entities.RevenueShare.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-revenue-shares'] });
      setShareForm({});
      toast.success('Collaborator added!');
    }
  });

  const removeRevenueShareMutation = useMutation({
    mutationFn: (id) => base44.entities.RevenueShare.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-revenue-shares'] });
      toast.success('Collaborator removed');
    }
  });

  const totalShares = revenueShares.reduce((sum, s) => sum + (s.share_percent || 0), 0);
  const myShare = 100 - totalShares;

  const updateShareMutation = useMutation({
    mutationFn: ({ id, percent }) => base44.entities.RevenueShare.update(id, {
      share_percent: percent
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-revenue-shares'] });
      toast.success('Share updated');
    }
  });

  const calculateEarnings = (share, contentRevenue) => {
    return ((contentRevenue || 0) * (share.share_percent / 100)).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HandshakeIcon className="w-5 h-5" />
            Collaborative Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* My Content */}
          <div>
            <h3 className="text-white font-semibold mb-3">Your Content</h3>
            {myCollabContent.owned.length === 0 ? (
              <p className="text-gray-400 text-sm">No collaborative content yet</p>
            ) : (
              <div className="space-y-2">
                {myCollabContent.owned.map(content => (
                  <div key={content.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{content.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                            {content.content_type}
                          </Badge>
                          <span className="text-green-400 text-sm">${content.price_usd}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => setEditingContent(content)}
                        size="sm"
                        variant="outline"
                        className="bg-white/5"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Manage Splits
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content I'm Collaborating On */}
          <div>
            <h3 className="text-white font-semibold mb-3">Collaborations</h3>
            {myCollabContent.shared.length === 0 ? (
              <p className="text-gray-400 text-sm">You're not collaborating on any content yet</p>
            ) : (
              <div className="space-y-2">
                {myCollabContent.shared.map(share => (
                  <div key={share.id} className="p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="bg-indigo-500/20 text-indigo-300 text-xs capitalize mb-1">
                          {share.content_type}
                        </Badge>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-400">Your Share:</span>
                          <span className="text-purple-400 font-bold">{share.share_percent}%</span>
                          <span className="text-gray-400">Earned:</span>
                          <span className="text-green-400 font-bold">${(share.total_earned || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Share Editor Modal */}
      <AnimatePresence>
        {editingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setEditingContent(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-white/20 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-7 h-7 text-green-400" />
                  Revenue Splits Manager
                </h3>
                <button onClick={() => setEditingContent(null)}>
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>

              <div className="mb-6 p-5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
                <h4 className="text-white font-bold text-lg mb-3">{editingContent.title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Total Revenue</div>
                    <div className="text-green-400 font-bold text-xl">
                      ${(editingContent.revenue_generated || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Your Share</div>
                    <div className="text-purple-400 font-bold text-xl">{myShare}%</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Your Earnings</div>
                    <div className="text-blue-400 font-bold text-xl">
                      ${((editingContent.revenue_generated || 0) * myShare / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Collaborators</div>
                    <div className="text-white font-bold text-xl">{revenueShares.length}</div>
                  </div>
                </div>
              </div>

              {/* Add Collaborator */}
              <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Collaborator
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Collaborator Email"
                    value={shareForm.creator_email || ""}
                    onChange={(e) => setShareForm({...shareForm, creator_email: e.target.value})}
                    className="bg-white/10 border-white/20 text-white flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    max={myShare}
                    placeholder="Share %"
                    value={shareForm.share_percent || ""}
                    onChange={(e) => setShareForm({...shareForm, share_percent: Number(e.target.value)})}
                    className="bg-white/10 border-white/20 text-white w-28"
                  />
                  <Button
                    onClick={() => {
                      if (shareForm.share_percent > myShare) {
                        toast.error(`Cannot allocate more than ${myShare}% (your remaining share)`);
                        return;
                      }
                      addRevenueShareMutation.mutate({
                        content_id: editingContent.id,
                        content_type: 'ppv',
                        creator_email: shareForm.creator_email,
                        share_percent: shareForm.share_percent
                      });
                    }}
                    disabled={!shareForm.creator_email || !shareForm.share_percent || shareForm.share_percent > myShare}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Available to allocate: {myShare}%
                </p>
              </div>

              {/* Existing Shares */}
              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Current Revenue Splits
                </h4>
                
                {/* Owner's share */}
                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold flex items-center gap-2">
                        {currentUser.full_name || currentUser.email}
                        <Badge className="bg-blue-500/20 text-blue-300 text-xs">Owner</Badge>
                      </div>
                      <div className="text-gray-400 text-xs mt-1">{currentUser.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400 font-bold text-2xl">{myShare}%</div>
                      <div className="text-green-400 text-sm">
                        ${((editingContent.revenue_generated || 0) * myShare / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collaborator shares */}
                {revenueShares.map(share => (
                  <div key={share.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-medium">{share.creator_email}</div>
                        <div className="flex items-center gap-4 text-sm mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Share:</span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={share.share_percent}
                              onChange={(e) => updateShareMutation.mutate({
                                id: share.id,
                                percent: Number(e.target.value)
                              })}
                              className="w-16 h-7 text-center bg-white/10 border-white/20 text-purple-400 font-bold"
                            />
                            <span className="text-purple-400">%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400">Earned:</span>
                            <span className="text-green-400 font-bold">
                              ${calculateEarnings(share, editingContent.revenue_generated)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          if (confirm(`Remove ${share.creator_email} from this collaboration?`)) {
                            removeRevenueShareMutation.mutate(share.id);
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {revenueShares.length === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No collaborators yet. Add someone above!</p>
                  </div>
                )}

                {/* Total validation */}
                <div className="mt-4 p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Allocated:</span>
                    <span className={`font-bold ${100 - myShare === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {100 - myShare}% / 100%
                    </span>
                  </div>
                  {myShare < 0 && (
                    <p className="text-red-400 text-xs mt-2">⚠️ Over-allocated! Reduce shares.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}