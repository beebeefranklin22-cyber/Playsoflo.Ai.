import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { payMoneyRequest } from "@/functions/payMoneyRequest";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, HandCoins, Undo2 } from "lucide-react";
import { playPaymentSound, playSuccessSound } from "./notificationSounds";

// Listens for incoming PaymentRequests where the current user is the payer.
// Shows a real-time popup + toast. User can Pay (instant transfer) or Decline.
export default function PaymentRequestHandler({ currentUser }) {
  const queryClient = useQueryClient();
  const [activeRequest, setActiveRequest] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Load any pending requests on mount (so they don't get missed)
  useEffect(() => {
    if (!currentUser?.email) return;
    let cancelled = false;
    (async () => {
      const pending = await base44.entities.PaymentRequest.filter({
        payer_email: currentUser.email,
        status: "pending"
      });
      if (!cancelled && pending.length > 0) {
        setActiveRequest(pending.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  // Real-time subscription for new incoming requests
  useEffect(() => {
    if (!currentUser?.email) return;
    const unsubscribe = base44.entities.PaymentRequest.subscribe((event) => {
      const pr = event.data;
      if (!pr || pr.payer_email !== currentUser.email) return;

      if ((event.type === "create" || event.type === "update") && pr.status === "pending") {
        setActiveRequest(pr);
        playPaymentSound();
        const isRefund = pr.request_type === "refund_request";
        toast(isRefund ? "↩️ Refund Requested" : "💸 Money Requested", {
          description: `${pr.requester_name || pr.requester_email} requested $${Number(pr.amount).toFixed(2)}`,
          duration: 6000,
        });
        if ("vibrate" in navigator) navigator.vibrate([150, 80, 150]);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.email]);

  const handlePay = async () => {
    if (!activeRequest) return;
    setProcessing(true);
    try {
      const { data } = await payMoneyRequest({ request_id: activeRequest.id });
      if (data?.success) {
        playSuccessSound();
        toast.success("Payment sent!", {
          description: `$${Number(activeRequest.amount).toFixed(2)} sent to ${activeRequest.requester_name || activeRequest.requester_email}.`,
          duration: 5000,
        });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        setActiveRequest(null);
      } else {
        toast.error(data?.error || "Payment failed");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "";
      if (msg.toLowerCase().includes("insufficient")) {
        toast.error("Insufficient funds", { description: "You don't have enough balance to pay this request." });
      } else {
        toast.error("Payment failed", { description: msg || "Please try again." });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!activeRequest) return;
    setProcessing(true);
    try {
      await base44.entities.PaymentRequest.update(activeRequest.id, {
        status: "declined",
        responded_at: new Date().toISOString()
      });
      await base44.entities.Notification.create({
        recipient_email: activeRequest.requester_email,
        type: "payment_received",
        title: "Request Declined",
        message: `${currentUser.full_name || currentUser.email} declined your $${Number(activeRequest.amount).toFixed(2)} request.`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        read: false
      });
      toast.info("Request declined");
      setActiveRequest(null);
    } catch {
      toast.error("Couldn't decline. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!activeRequest) return null;
  const isRefund = activeRequest.request_type === "refund_request";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className={`p-6 ${isRefund ? "bg-gradient-to-r from-amber-600 to-orange-600" : "bg-gradient-to-r from-emerald-600 to-teal-600"} flex items-center justify-between`}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {isRefund ? <Undo2 className="w-5 h-5" /> : <HandCoins className="w-5 h-5" />}
              {isRefund ? "Refund Requested" : "Payment Requested"}
            </h2>
            <button onClick={() => setActiveRequest(null)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              {(activeRequest.requester_name || activeRequest.requester_email)?.[0]?.toUpperCase()}
            </div>
            <p className="text-white font-semibold text-lg">{activeRequest.requester_name || activeRequest.requester_email}</p>
            <p className="text-gray-400 text-sm">is requesting</p>
            <p className="text-4xl font-bold text-white my-3">${Number(activeRequest.amount).toFixed(2)}</p>
            {activeRequest.note && (
              <p className="text-gray-300 text-sm bg-white/5 rounded-xl p-3 mb-2">"{activeRequest.note}"</p>
            )}
          </div>

          <div className="p-6 pt-0 flex gap-3">
            <Button
              onClick={handleDecline}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              Decline
            </Button>
            <Button
              onClick={handlePay}
              disabled={processing}
              className={`flex-1 ${isRefund ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {processing ? "Processing..." : `Pay $${Number(activeRequest.amount).toFixed(2)}`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}