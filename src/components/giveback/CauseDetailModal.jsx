import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Heart, Send, MessageCircle, Users, Globe, Mail, MapPin, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CauseDetailModal({ cause, onClose, onEdit }) {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [message, setMessage] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("story");

  const allPhotos = [cause.image_url, ...(cause.photos || [])].filter(Boolean);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Load messages for this cause
  const { data: messages = [] } = useQuery({
    queryKey: ["cause-messages", cause.id],
    queryFn: () => base44.entities.DirectMessage.filter({ reference_id: cause.id }).catch(() => []),
    initialData: []
  });

  const donateMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(donationAmount);
      if (!amount || amount <= 0) throw new Error("Invalid amount");
      if (!currentUser) throw new Error("Please sign in to donate");

      // Update raised amount on the cause
      await base44.entities.Donation.update(cause.id, {
        raised_usd: (cause.raised_usd || 0) + amount
      });

      // Credit wallet balance for the cause creator
      if (cause.creator_email) {
        const creatorUsers = await base44.entities.User.filter({ email: cause.creator_email });
        if (creatorUsers.length > 0) {
          const creator = creatorUsers[0];
          const currentBalance = creator.wallet_balance || 0;
          await base44.entities.User.update(creator.id, { wallet_balance: currentBalance + amount });
        }
      }

      // Record payment
      await base44.entities.Payment.create({
        amount_usd: amount,
        method: "donation",
        status: "completed",
        reference_type: "other",
        reference_id: String(cause.id),
        memo: `Donation to "${cause.title}" by ${currentUser?.full_name || currentUser?.email}`
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["donations"] });
      toast.success("Thank you for your donation! 🙏");
      setDonationAmount("");
    },
    onError: e => toast.error(e.message)
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !currentUser) return;
      await base44.entities.DirectMessage.create({
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        recipient_email: cause.creator_email || "admin",
        content: message.trim(),
        reference_id: cause.id,
        reference_type: "cause"
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cause-messages", cause.id] });
      toast.success("Message sent!");
      setMessage("");
    },
    onError: () => toast.error("Failed to send message")
  });

  const progress = cause.goal_usd ? Math.min((cause.raised_usd / cause.goal_usd) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl bg-gray-900 border border-white/10 rounded-3xl overflow-hidden my-4"
      >
        {/* Photo Carousel */}
        {allPhotos.length > 0 && (
          <div className="relative h-64 bg-gray-800">
            <img src={allPhotos[photoIdx]} alt="cause" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
            {allPhotos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + allPhotos.length) % allPhotos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % allPhotos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allPhotos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)} className={`w-2 h-2 rounded-full transition ${i === photoIdx ? "bg-white" : "bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold capitalize">
                  {cause.cause_type?.replace(/_/g, " ")}
                </span>
                {cause.community_owned && <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold">Community Owned</span>}
                {cause.long_term_initiative && <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">Ongoing</span>}
              </div>
              <h2 className="text-2xl font-bold text-white">{cause.title}</h2>
              <p className="text-gray-400 text-sm mt-1">by {cause.creator_name || "Community Member"}</p>
            </div>
            {onEdit && currentUser && (currentUser.email === cause.creator_email || currentUser.role === "admin") && (
              <Button size="sm" variant="outline" onClick={onEdit} className="flex-shrink-0 ml-3">Edit</Button>
            )}
          </div>

          {/* Progress */}
          {cause.goal_usd && (
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white font-bold text-lg">${(cause.raised_usd || 0).toLocaleString()} raised</span>
                <span className="text-gray-400">of ${cause.goal_usd.toLocaleString()} goal</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-emerald-400 text-sm mt-1">{Math.round(progress)}% funded</p>
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 mb-5 text-sm text-gray-400">
            {cause.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{cause.location}</span>}
            {cause.beneficiary_count > 0 && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{cause.beneficiary_count.toLocaleString()} helped</span>}
            {cause.website && <a href={cause.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-400 hover:underline"><Globe className="w-4 h-4" />Website</a>}
            {cause.contact_email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{cause.contact_email}</span>}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
            {["story", "donate", "messages"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${activeTab === tab ? "bg-emerald-500/20 text-emerald-300" : "text-gray-400 hover:text-white"}`}>
                {tab === "messages" && <MessageCircle className="w-4 h-4 inline mr-1" />}
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "story" && (
              <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">{cause.description}</p>
                {cause.story && <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{cause.story}</p>}
                {!cause.story && !cause.description && <p className="text-gray-500 italic">No additional details provided.</p>}
              </motion.div>
            )}

            {activeTab === "donate" && (
              <motion.div key="donate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map(a => (
                    <button key={a} onClick={() => setDonationAmount(String(a))} className={`py-2.5 rounded-xl font-semibold text-sm transition border ${donationAmount === String(a) ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white/5 border-white/20 text-gray-300 hover:border-emerald-500"}`}>
                      ${a}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Or enter custom amount"
                  value={donationAmount}
                  onChange={e => setDonationAmount(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={() => donateMutation.mutate()}
                  disabled={!donationAmount || parseFloat(donationAmount) <= 0 || donateMutation.isLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 py-4 text-base font-semibold"
                >
                  {donateMutation.isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : <><Heart className="w-4 h-4 mr-2" />Donate ${donationAmount || "0"}</>}
                </Button>
                <p className="text-gray-500 text-xs text-center">Donations go directly to the cause creator's wallet balance</p>
              </motion.div>
            )}

            {activeTab === "messages" && (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                  {messages.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No messages yet. Be the first to reach out!</p>}
                  {messages.map(msg => (
                    <div key={msg.id} className={`p-3 rounded-xl text-sm ${msg.sender_email === currentUser?.email ? "bg-emerald-500/20 ml-8" : "bg-white/5 mr-8"}`}>
                      <p className="text-gray-300 font-medium text-xs mb-1">{msg.sender_name || msg.sender_email}</p>
                      <p className="text-white">{msg.content}</p>
                    </div>
                  ))}
                </div>
                {currentUser ? (
                  <div className="flex gap-2">
                    <Input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessageMutation.mutate()} placeholder="Send a message of support..." className="bg-white/10 border-white/20 text-white flex-1" />
                    <Button onClick={() => sendMessageMutation.mutate()} disabled={!message.trim() || sendMessageMutation.isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center">Sign in to send a message</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}