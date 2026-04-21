import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, BarChart3, DollarSign, Eye, Film, Trash2, Edit3, Gift,
  TrendingUp, Users, Wallet, Download, ToggleLeft, ToggleRight,
  Star, Clock, Settings, Play, CheckCircle, AlertCircle, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const TABS = ["overview", "videos", "earnings", "tips"];

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingVideo, setEditingVideo] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => navigate(createPageUrl("Streaming")));
  }, []);

  const { data: myVideos = [], refetch: refetchVideos } = useQuery({
    queryKey: ["my-channel-videos", currentUser?.email],
    queryFn: () => base44.entities.StreamingContent.filter({ creator_email: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: tips = [] } = useQuery({
    queryKey: ["my-tips", currentUser?.email],
    queryFn: () => base44.entities.TipTransaction.filter({ creator_email: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-sales", currentUser?.email],
    queryFn: () => base44.entities.ContentPurchase.filter({ creator_email: currentUser.email }),
    enabled: !!currentUser?.email
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["my-followers", currentUser?.email],
    queryFn: () => base44.entities.Follow.filter({ following_email: currentUser.email }),
    enabled: !!currentUser?.email
  });

  // Metrics
  const totalViews = myVideos.reduce((s, v) => s + (v.views || 0), 0);
  const totalTips = tips.reduce((s, t) => s + (t.amount_usd || 0), 0);
  const totalSales = purchases.reduce((s, p) => s + (p.creator_earnings || 0), 0);
  const totalEarnings = totalTips + totalSales;
  const balance = currentUser?.balance_usd || 0;

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.StreamingContent.delete(id),
    onSuccess: () => { toast.success("Video deleted"); refetchVideos(); }
  });

  const toggleMonetizationMutation = useMutation({
    mutationFn: async (video) => {
      await base44.entities.StreamingContent.update(video.id, { is_monetized: !video.is_monetized });
    },
    onSuccess: () => { toast.success("Monetization updated"); refetchVideos(); }
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price_usd, rental_price_usd }) => {
      await base44.entities.StreamingContent.update(id, {
        price_usd: parseFloat(price_usd) || 0,
        rental_price_usd: parseFloat(rental_price_usd) || 0,
        is_monetized: true
      });
    },
    onSuccess: () => { toast.success("Pricing updated!"); setEditingVideo(null); refetchVideos(); }
  });

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > balance) { toast.error("Insufficient balance"); return; }
    setWithdrawing(true);
    try {
      await base44.auth.updateMe({ balance_usd: balance - amount });
      await base44.entities.Payment.create({
        amount_usd: amount, method: "wallet", status: "completed",
        reference_type: "other", sender_email: currentUser.email,
        recipient_email: currentUser.email, memo: "Creator withdrawal"
      });
      toast.success(`$${amount.toFixed(2)} withdrawal initiated!`);
      setWithdrawAmount("");
      setCurrentUser(u => ({ ...u, balance_usd: balance - amount }));
    } catch (e) {
      toast.error("Withdrawal failed: " + e.message);
    } finally {
      setWithdrawing(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0e0e10]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold">Creator Dashboard</p>
          <p className="text-gray-500 text-xs">@{currentUser.username || currentUser.full_name}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/20 text-gray-300"
          onClick={() => navigate(createPageUrl("CreatorChannel") + `?email=${currentUser.email}`)}
        >
          <Play className="w-3.5 h-3.5 mr-1" /> View Channel
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-2 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold capitalize transition ${activeTab === tab ? "text-white border-b-2 border-purple-500" : "text-gray-500 hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-purple-900/60 to-violet-900/60 border border-purple-500/30 rounded-2xl p-5">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-4xl font-extrabold text-white">${balance.toFixed(2)}</p>
              <p className="text-purple-300 text-xs mt-1">${totalEarnings.toFixed(2)} total earned all time</p>
              <div className="flex gap-2 mt-4">
                <Input
                  type="number"
                  placeholder="Amount to withdraw"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  min="0"
                  step="0.01"
                />
                <Button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount} className="bg-green-600 hover:bg-green-700 font-bold">
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-1" /> Withdraw</>}
                </Button>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
                { label: "Followers", value: followers.length, icon: Users, color: "text-purple-400" },
                { label: "Videos", value: myVideos.length, icon: Film, color: "text-orange-400" },
                { label: "Tips Received", value: `$${totalTips.toFixed(2)}`, icon: Gift, color: "text-pink-400" },
                { label: "Sales Earnings", value: `$${totalSales.toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
                { label: "Total Earnings", value: `$${totalEarnings.toFixed(2)}`, icon: TrendingUp, color: "text-yellow-400" },
              ].map(m => (
                <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-gray-500 text-xs">{m.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => navigate(createPageUrl("Streaming"))} className="bg-blue-600 hover:bg-blue-700 h-12">
                <Film className="w-4 h-4 mr-2" /> Upload Video
              </Button>
              <Button onClick={() => setActiveTab("videos")} variant="outline" className="border-white/20 text-gray-300 h-12">
                <Settings className="w-4 h-4 mr-2" /> Manage Content
              </Button>
            </div>
          </div>
        )}

        {/* VIDEOS */}
        {activeTab === "videos" && (
          <div className="space-y-3">
            {myVideos.length === 0 ? (
              <div className="text-center py-16">
                <Film className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No videos uploaded yet</p>
                <Button onClick={() => navigate(createPageUrl("Streaming"))} className="bg-purple-600 hover:bg-purple-700">Upload Your First Video</Button>
              </div>
            ) : (
              myVideos.map(v => (
                <div key={v.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="w-24 h-16 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden">
                      {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <Film className="w-5 h-5 text-gray-600 m-auto mt-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm line-clamp-1">{v.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(v.views || 0).toLocaleString()}</span>
                        <Badge className={`text-[10px] capitalize ${v.status === "published" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400"}`}>
                          {v.status}
                        </Badge>
                        {v.is_monetized && <span className="text-green-400 font-semibold">${v.price_usd || v.rental_price_usd}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleMonetizationMutation.mutate(v)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${v.is_monetized ? "bg-green-500/20 text-green-400" : "bg-white/8 text-gray-400"}`}
                        title={v.is_monetized ? "Disable monetization" : "Enable monetization"}
                      >
                        {v.is_monetized ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        ${v.is_monetized ? "ON" : "OFF"}
                      </button>
                      <button
                        onClick={() => setEditingVideo(editingVideo?.id === v.id ? null : { ...v })}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-white/8 text-gray-400 hover:text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this video?")) deleteVideoMutation.mutate(v.id); }}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Edit Panel */}
                  <AnimatePresence>
                    {editingVideo?.id === v.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 p-3 space-y-3 bg-white/3"
                      >
                        <p className="text-white text-sm font-semibold">Pricing & Monetization</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-500 text-xs mb-1 block">Buy Price ($)</label>
                            <Input
                              type="number" min="0" step="0.01"
                              value={editingVideo.price_usd || ""}
                              onChange={e => setEditingVideo(p => ({ ...p, price_usd: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white h-8 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 text-xs mb-1 block">Rent Price ($)</label>
                            <Input
                              type="number" min="0" step="0.01"
                              value={editingVideo.rental_price_usd || ""}
                              onChange={e => setEditingVideo(p => ({ ...p, rental_price_usd: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white h-8 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-blue-300 text-xs">
                          You earn 85% per sale — platform takes 15%
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updatePriceMutation.mutate({ id: v.id, price_usd: editingVideo.price_usd, rental_price_usd: editingVideo.rental_price_usd })}
                            disabled={updatePriceMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 flex-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Save Pricing
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingVideo(null)} className="border-white/20 text-gray-400">
                            Cancel
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        )}

        {/* EARNINGS */}
        {activeTab === "earnings" && (
          <div className="space-y-4">
            {/* Withdraw */}
            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Wallet Balance</p>
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">${balance.toFixed(2)}</p>
              <div className="flex gap-2 mt-4">
                <Input
                  type="number" placeholder="Withdraw amount" value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  min="0" step="0.01"
                />
                <Button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount} className="bg-green-600 hover:bg-green-700">
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-1" />Withdraw</>}
                </Button>
              </div>
            </div>

            {/* Earnings breakdown */}
            <div>
              <p className="text-white font-bold mb-3">Sales History</p>
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <DollarSign className="w-10 h-10 mx-auto mb-2" />
                  <p>No sales yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchases.slice(0, 20).map(p => (
                    <div key={p.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.purchase_type === "rent" ? "Rental" : "Sale"}</p>
                        <p className="text-gray-500 text-xs">{new Date(p.created_date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-green-400 font-bold">${(p.creator_earnings || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIPS */}
        {activeTab === "tips" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gradient-to-br from-pink-900/40 to-rose-900/40 border border-pink-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5 text-pink-400" />
                <p className="text-gray-400 text-sm">Total Tips Received</p>
              </div>
              <p className="text-3xl font-extrabold text-white">${totalTips.toFixed(2)}</p>
              <p className="text-pink-300 text-xs mt-1">From {tips.length} tip{tips.length !== 1 ? "s" : ""}</p>
            </div>

            {tips.length === 0 ? (
              <div className="text-center py-10 text-gray-600">
                <Gift className="w-12 h-12 mx-auto mb-2" />
                <p>No tips yet — keep creating!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...tips].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(t => (
                  <div key={t.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 text-pink-400 font-bold text-sm">
                      {t.tipper_name?.[0] || t.tipper_email?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{t.tipper_name || t.tipper_username || "Anonymous"}</p>
                      {t.message && <p className="text-gray-400 text-xs truncate">"{t.message}"</p>}
                      <p className="text-gray-600 text-xs">{new Date(t.created_date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-pink-400 font-bold text-lg">${(t.amount_usd || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}