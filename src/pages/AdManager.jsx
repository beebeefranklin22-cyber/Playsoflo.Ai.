import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Loader2, X, ExternalLink,
  Eye, MousePointerClick, TrendingUp, Calendar, CheckCircle, PauseCircle, AlertCircle, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import AdFormModal from "../components/ads/AdFormModal";
import AIAssistPanel from "../components/ads/AIAssistPanel";

export default function AdManager() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("campaigns");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-ad-campaigns"],
    queryFn: () => base44.entities.AdCampaign.list("-created_date"),
    enabled: !!currentUser && currentUser.role === "admin",
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      toast.success("Ad deleted");
      setDeletingId(null);
    },
    onError: () => toast.error("Failed to delete ad"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.AdCampaign.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-ad-campaigns"] }),
    onError: () => toast.error("Failed to update status"),
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400">This page is for platform admins only.</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    active:   { color: "bg-green-500/20 text-green-400",  icon: CheckCircle,  label: "Active" },
    paused:   { color: "bg-yellow-500/20 text-yellow-400", icon: PauseCircle,  label: "Paused" },
    draft:    { color: "bg-gray-500/20 text-gray-400",     icon: AlertCircle,  label: "Draft" },
    completed:{ color: "bg-blue-500/20 text-blue-400",    icon: CheckCircle,  label: "Completed" },
    rejected: { color: "bg-red-500/20 text-red-400",      icon: AlertCircle,  label: "Rejected" },
  };

  const placementLabels = { feed: "Feed", stories: "Stories", banner: "Banner" };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Ad Manager</h1>
            <p className="text-gray-400 mt-1">Manage sponsored content shown to all users</p>
          </div>
          <Button
            onClick={() => { setEditingAd(null); setShowForm(true); }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> New Ad
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 rounded-2xl p-1 w-fit">
          {[
            { id: "campaigns", label: "Campaigns", icon: TrendingUp },
            { id: "ai", label: "AI-Assist", icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "ai" && campaigns.filter(c => c.ai_optimized).length > 0 && (
                <span className="w-5 h-5 bg-purple-500 rounded-full text-xs flex items-center justify-center">
                  {campaigns.filter(c => c.ai_optimized).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* AI-Assist Tab */}
        {activeTab === "ai" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <AIAssistPanel
              campaigns={campaigns}
              onCampaignsChange={() => queryClient.invalidateQueries({ queryKey: ["admin-ad-campaigns"] })}
            />
          </div>
        )}

        {activeTab === "campaigns" && <>
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Ads", value: campaigns.length, icon: TrendingUp },
            { label: "Active", value: campaigns.filter(c => c.status === "active").length, icon: CheckCircle },
            { label: "Total Impressions", value: campaigns.reduce((s, c) => s + (c.impressions || 0), 0).toLocaleString(), icon: Eye },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <stat.icon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">{stat.label}</p>
                <p className="text-white font-bold text-xl">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/20 rounded-2xl">
            <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No ads yet. Create your first sponsored post.</p>
            <Button onClick={() => { setEditingAd(null); setShowForm(true); }} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Ad
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(campaign => {
              const status = statusConfig[campaign.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              return (
                <motion.div
                  key={campaign.id}
                  layout
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start"
                >
                  {/* Image */}
                  <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-white/10">
                    {campaign.media_urls?.[0] ? (
                      <img src={campaign.media_urls[0]} alt={campaign.headline} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight">{campaign.campaign_name}</h3>
                        {campaign.headline && <p className="text-gray-300 text-sm mt-0.5">{campaign.headline}</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />{status.label}
                      </span>
                    </div>

                    {/* Placements */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(campaign.placements || []).map(p => (
                        <span key={p} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                          {placementLabels[p] || p}
                        </span>
                      ))}
                    </div>

                    {/* Dates & metrics */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                      {campaign.schedule?.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(campaign.schedule.start_date), "MMM d, yyyy")}
                          {campaign.schedule.end_date && ` → ${format(new Date(campaign.schedule.end_date), "MMM d, yyyy")}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{(campaign.impressions || 0).toLocaleString()} impressions</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" />{(campaign.clicks || 0).toLocaleString()} clicks</span>
                    </div>

                    {campaign.destination_url && (
                      <a href={campaign.destination_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-2">
                        <ExternalLink className="w-3 h-3" /> {campaign.destination_url.substring(0, 50)}...
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingAd(campaign); setShowForm(true); }}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatusMutation.mutate({
                        id: campaign.id,
                        status: campaign.status === "active" ? "paused" : "active"
                      })}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {campaign.status === "active" ? <PauseCircle className="w-3.5 h-3.5 text-yellow-400" /> : <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                    </Button>
                    {deletingId === campaign.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(campaign.id)} disabled={deleteMutation.isPending}>
                          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="border-white/20 text-white">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(campaign.id)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        </>}
      </div>

      {/* Form Modal */}
      <AdFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingAd(null); }}
        editingAd={editingAd}
        currentUser={currentUser}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-ad-campaigns"] })}
      />
    </div>
  );
}