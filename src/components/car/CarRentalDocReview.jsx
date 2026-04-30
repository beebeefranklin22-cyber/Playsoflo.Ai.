import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Shield, Clock, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const STATUS_BADGE = {
  not_submitted: { label: "Not Submitted", class: "bg-gray-500/20 text-gray-400" },
  pending_review: { label: "Pending Review", class: "bg-yellow-500/20 text-yellow-400" },
  verified: { label: "Verified", class: "bg-green-500/20 text-green-400" },
  rejected: { label: "Rejected", class: "bg-red-500/20 text-red-400" },
};

export default function CarRentalDocReview({ providerEmail, onClose }) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRental, setSelectedRental] = useState(null);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["provider-car-rentals", providerEmail],
    queryFn: () => base44.entities.CarRental.filter({ provider_email: providerEmail }),
  });

  const pendingReview = rentals.filter((r) => r.doc_verification_status === "pending_review");
  const others = rentals.filter((r) => r.doc_verification_status !== "pending_review");

  const handleVerdict = async (rental, verdict) => {
    if (verdict === "rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.CarRental.update(rental.id, {
        doc_verification_status: verdict,
        doc_verified_at: now,
        doc_verified_by: providerEmail,
        doc_rejection_reason: verdict === "rejected" ? rejectionReason : null,
        status: verdict === "verified" ? "approved" : "rejected",
      });

      // Notify customer
      await base44.entities.Notification.create({
        recipient_email: rental.customer_email,
        type: "booking_update",
        title: verdict === "verified" ? "✅ Documents Verified!" : "❌ Documents Rejected",
        message: verdict === "verified"
          ? `Your documents for renting ${rental.car_make} ${rental.car_model} have been verified. Your booking is confirmed!`
          : `Your documents for renting ${rental.car_make} ${rental.car_model} were rejected. Reason: ${rejectionReason}`,
        read: false,
      });

      toast.success(verdict === "verified" ? "Documents verified & booking approved!" : "Booking rejected — customer notified.");
      setSelectedRental(null);
      setRejectionReason("");
      queryClient.invalidateQueries(["provider-car-rentals", providerEmail]);
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img src={url} alt={label} className="w-full h-36 object-cover rounded-xl border border-white/10 hover:opacity-90 transition" />
          <p className="text-blue-400 text-xs mt-1 flex items-center gap-1"><Eye className="w-3 h-3" /> Click to view full size</p>
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
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-purple-700 p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Document Review</h2>
              <p className="text-blue-100 text-sm">{pendingReview.length} pending · {rentals.length} total bookings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-5 h-5 text-white" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {isLoading && <p className="text-gray-400 text-center py-8">Loading bookings...</p>}

          {!isLoading && rentals.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No rental bookings yet.</p>
            </div>
          )}

          {/* Detail View */}
          {selectedRental && (
            <div className="bg-gray-800 rounded-2xl p-5 space-y-5 border border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{selectedRental.customer_name || selectedRental.customer_email}</h3>
                <button onClick={() => { setSelectedRental(null); setRejectionReason(""); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-400">Car</p><p className="text-white">{selectedRental.car_make} {selectedRental.car_model}</p></div>
                <div><p className="text-gray-400">License Expiry</p><p className={`font-semibold ${new Date(selectedRental.license_expiry_date) < new Date() ? "text-red-400" : "text-green-400"}`}>{selectedRental.license_expiry_date || "Not provided"}</p></div>
                <div><p className="text-gray-400">License # (last 4)</p><p className="text-white">{selectedRental.license_number || "—"}</p></div>
                <div><p className="text-gray-400">Pickup</p><p className="text-white">{selectedRental.pickup_date}</p></div>
              </div>

              {/* License Expired Warning */}
              {selectedRental.license_expiry_date && new Date(selectedRental.license_expiry_date) < new Date() && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300 text-sm font-semibold">⚠️ Customer's license may be expired!</p>
                </div>
              )}

              {/* Document Images */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DocImage url={selectedRental.drivers_license_url} label="License (Front)" />
                <DocImage url={selectedRental.drivers_license_back_url} label="License (Back)" />
                <DocImage url={selectedRental.insurance_card_url} label="Insurance Card" />
              </div>

              {/* Actions */}
              {selectedRental.doc_verification_status === "pending_review" && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason (required only if rejecting)..."
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 text-sm resize-none h-20"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleVerdict(selectedRental, "rejected")}
                      disabled={processing}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                    <Button
                      onClick={() => handleVerdict(selectedRental, "verified")}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Verify & Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending List */}
          {pendingReview.length > 0 && (
            <div>
              <p className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Needs Review ({pendingReview.length})</p>
              <div className="space-y-2">
                {pendingReview.map((r) => (
                  <button key={r.id} onClick={() => setSelectedRental(r)} className="w-full flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 transition text-left">
                    <div>
                      <p className="text-white font-medium">{r.customer_name || r.customer_email}</p>
                      <p className="text-gray-400 text-sm">{r.car_make} {r.car_model} · {r.pickup_date}</p>
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
                {others.map((r) => {
                  const badge = STATUS_BADGE[r.doc_verification_status] || STATUS_BADGE.not_submitted;
                  return (
                    <button key={r.id} onClick={() => setSelectedRental(r)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition text-left">
                      <div>
                        <p className="text-white font-medium">{r.customer_name || r.customer_email}</p>
                        <p className="text-gray-400 text-sm">{r.car_make} {r.car_model} · {r.pickup_date}</p>
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