import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Shield, Clock, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const STATUS_BADGE = {
  not_submitted: { label: "Not Submitted", class: "bg-gray-500/20 text-gray-400" },
  pending_review: { label: "Pending Review", class: "bg-yellow-500/20 text-yellow-400" },
  verified: { label: "Verified", class: "bg-green-500/20 text-green-400" },
  rejected: { label: "Rejected", class: "bg-red-500/20 text-red-400" },
};

const ID_TYPE_LABELS = {
  drivers_license: "Driver's License",
  passport: "Passport",
  national_id: "National ID",
  state_id: "State ID",
};

export default function PropertyDocReview({ hostEmail, onClose }) {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["host-property-bookings", hostEmail],
    queryFn: () => base44.entities.PropertyBooking.filter({ host_email: hostEmail }),
  });

  const pendingReview = bookings.filter((b) => b.doc_verification_status === "pending_review");
  const others = bookings.filter((b) => b.doc_verification_status !== "pending_review");

  const handleVerdict = async (booking, verdict) => {
    if (verdict === "rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setProcessing(true);
    try {
      await base44.entities.PropertyBooking.update(booking.id, {
        doc_verification_status: verdict,
        doc_verified_at: new Date().toISOString(),
        doc_verified_by: hostEmail,
        doc_rejection_reason: verdict === "rejected" ? rejectionReason : null,
        status: verdict === "verified" ? "approved" : "rejected",
      });

      await base44.entities.Notification.create({
        recipient_email: booking.customer_email,
        type: "booking_update",
        title: verdict === "verified" ? "✅ Identity Verified — Booking Confirmed!" : "❌ Booking Not Approved",
        message: verdict === "verified"
          ? `Your identity has been verified for ${booking.property_name}. Enjoy your stay!`
          : `Your booking for ${booking.property_name} was not approved. Reason: ${rejectionReason}`,
        read: false,
      });

      toast.success(verdict === "verified" ? "Identity verified & booking confirmed!" : "Booking rejected — guest notified.");
      setSelectedBooking(null);
      setRejectionReason("");
      queryClient.invalidateQueries(["host-property-bookings", hostEmail]);
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const DocImage = ({ url, label }) => (
    <div className="space-y-1">
      <p className="text-gray-400 text-xs">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} className="w-full h-36 object-cover rounded-xl border border-white/10 hover:opacity-90 transition" />
          <p className="text-blue-400 text-xs mt-1 flex items-center gap-1"><Eye className="w-3 h-3" /> View full size</p>
        </a>
      ) : (
        <div className="w-full h-36 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <p className="text-gray-500 text-xs">Not provided</p>
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Guest ID Review</h2>
              <p className="text-emerald-100 text-sm">{pendingReview.length} pending · {bookings.length} total</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-5 h-5 text-white" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {isLoading && <p className="text-gray-400 text-center py-8">Loading bookings...</p>}

          {!isLoading && bookings.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No property bookings yet.</p>
            </div>
          )}

          {/* Detail View */}
          {selectedBooking && (
            <div className="bg-gray-800 rounded-2xl p-5 space-y-5 border border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{selectedBooking.customer_name || selectedBooking.customer_email}</h3>
                <button onClick={() => { setSelectedBooking(null); setRejectionReason(""); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-400">Property</p><p className="text-white">{selectedBooking.property_name}</p></div>
                <div><p className="text-gray-400">ID Type</p><p className="text-white">{ID_TYPE_LABELS[selectedBooking.id_type] || "—"}</p></div>
                <div><p className="text-gray-400">Check-in</p><p className="text-white">{selectedBooking.check_in_date}</p></div>
                <div><p className="text-gray-400">Check-out</p><p className="text-white">{selectedBooking.check_out_date}</p></div>
                <div><p className="text-gray-400">Guests</p><p className="text-white">{selectedBooking.guests}</p></div>
                <div><p className="text-gray-400">House Rules</p><p className={selectedBooking.house_rules_accepted ? "text-green-400" : "text-red-400"}>{selectedBooking.house_rules_accepted ? "Accepted ✓" : "Not accepted"}</p></div>
              </div>

              {/* Document Images */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DocImage url={selectedBooking.id_front_url} label="ID Front" />
                <DocImage url={selectedBooking.id_back_url} label="ID Back" />
                <DocImage url={selectedBooking.selfie_url} label="Selfie with ID" />
              </div>

              {/* Actions */}
              {selectedBooking.doc_verification_status === "pending_review" && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required only if rejecting)..."
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm resize-none h-20"
                  />
                  <div className="flex gap-3">
                    <Button onClick={() => handleVerdict(selectedBooking, "rejected")} disabled={processing} className="flex-1 bg-red-600 hover:bg-red-700">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button onClick={() => handleVerdict(selectedBooking, "verified")} disabled={processing} className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Verify & Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending */}
          {pendingReview.length > 0 && (
            <div>
              <p className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Needs Review ({pendingReview.length})</p>
              <div className="space-y-2">
                {pendingReview.map((b) => (
                  <button key={b.id} onClick={() => setSelectedBooking(b)} className="w-full flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 transition text-left">
                    <div>
                      <p className="text-white font-medium">{b.customer_name || b.customer_email}</p>
                      <p className="text-gray-400 text-sm">{b.property_name} · {b.check_in_date} → {b.check_out_date}</p>
                      <p className="text-gray-500 text-xs">{ID_TYPE_LABELS[b.id_type] || "ID not specified"}</p>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 flex-shrink-0">Review</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Others */}
          {others.length > 0 && (
            <div>
              <p className="text-gray-400 font-semibold text-sm mb-3">All Bookings</p>
              <div className="space-y-2">
                {others.map((b) => {
                  const badge = STATUS_BADGE[b.doc_verification_status] || STATUS_BADGE.not_submitted;
                  return (
                    <button key={b.id} onClick={() => setSelectedBooking(b)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-left">
                      <div>
                        <p className="text-white font-medium">{b.customer_name || b.customer_email}</p>
                        <p className="text-gray-400 text-sm">{b.property_name} · {b.check_in_date}</p>
                      </div>
                      <Badge className={`${badge.class} flex-shrink-0`}>{badge.label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}