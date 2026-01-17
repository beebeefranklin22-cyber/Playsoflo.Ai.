import React, { useState } from "react";
import { X, AlertTriangle, FileText, DollarSign, Scale, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LeaseEscalationModal({ lease, onClose, onSuccess }) {
  const [escalationType, setEscalationType] = useState("collections");
  const [reason, setReason] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const escalationTypes = {
    collections: {
      label: "Send to Collections",
      icon: DollarSign,
      color: "text-yellow-400",
      description: "Refer unpaid rent to a collections agency"
    },
    eviction: {
      label: "Initiate Eviction",
      icon: AlertTriangle,
      color: "text-red-400",
      description: "Start the legal eviction process"
    },
    lawsuit: {
      label: "File Lawsuit",
      icon: Scale,
      color: "text-orange-400",
      description: "File a lawsuit for damages or breach of contract"
    },
    mediation: {
      label: "Request Mediation",
      icon: Users,
      color: "text-blue-400",
      description: "Seek professional mediation to resolve disputes"
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Create dispute record
      await base44.entities.Dispute.create({
        dispute_type: "lease_escalation",
        lease_id: lease.id,
        property_id: lease.property_id,
        initiator_email: lease.landlord_email,
        initiator_name: lease.landlord_name,
        respondent_email: lease.tenant_email,
        respondent_name: lease.tenant_name,
        escalation_type: escalationType,
        reason,
        description,
        amount_disputed: amountOwed ? Number(amountOwed) : null,
        status: "pending",
        severity: escalationType === 'eviction' ? 'high' : 
                  escalationType === 'lawsuit' ? 'high' : 'medium'
      });

      // Update lease status
      await base44.entities.Lease.update(lease.id, {
        status: escalationType === 'eviction' ? 'eviction_pending' : 
                escalationType === 'lawsuit' ? 'legal_dispute' : 
                'dispute_pending'
      });

      // Notify tenant
      await base44.entities.Notification.create({
        recipient_email: lease.tenant_email,
        type: "lease_escalation",
        title: `Lease Escalation: ${escalationTypes[escalationType].label}`,
        message: `Your landlord has initiated ${escalationTypes[escalationType].label.toLowerCase()} for ${lease.property_address}. Please contact them immediately.`,
        reference_type: "lease",
        reference_id: lease.id,
        sender_email: lease.landlord_email,
        sender_name: lease.landlord_name,
        action_url: `/landlord-tenant-portal`,
        read: false,
        priority: "high"
      });

      toast.success('Escalation initiated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Failed to initiate escalation');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const SelectedIcon = escalationTypes[escalationType].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Escalate Lease Issue</h2>
              <p className="text-gray-400 text-sm">{lease.property_address}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold text-sm">Important Legal Notice</p>
                <p className="text-red-200 text-xs mt-1">
                  Escalating this matter may have serious legal consequences. Ensure you have documented evidence 
                  and have attempted to resolve the issue directly with the tenant. Consider consulting with a 
                  lawyer before proceeding with eviction or lawsuit options.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-3 block">Escalation Type *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(escalationTypes).map(([key, type]) => {
                const Icon = type.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEscalationType(key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      escalationType === key
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${type.color} flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-white font-semibold text-sm">{type.label}</p>
                        <p className="text-gray-400 text-xs mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">Reason for Escalation *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_payment">Non-payment of Rent</SelectItem>
                <SelectItem value="late_payment">Chronic Late Payments</SelectItem>
                <SelectItem value="property_damage">Excessive Property Damage</SelectItem>
                <SelectItem value="lease_violation">Lease Agreement Violation</SelectItem>
                <SelectItem value="illegal_activity">Illegal Activity</SelectItem>
                <SelectItem value="noise_complaints">Excessive Noise Complaints</SelectItem>
                <SelectItem value="unauthorized_occupants">Unauthorized Occupants</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(reason === 'non_payment' || reason === 'late_payment' || reason === 'property_damage') && (
            <div>
              <label className="text-white font-semibold mb-2 block">Amount Owed/Claimed ($)</label>
              <Input
                type="number"
                value={amountOwed}
                onChange={(e) => setAmountOwed(e.target.value)}
                placeholder="Enter amount"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          )}

          <div>
            <label className="text-white font-semibold mb-2 block">Detailed Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the issue, including dates, incidents, and any attempts to resolve the matter..."
              className="bg-white/10 border-white/20 text-white min-h-[150px]"
              required
            />
            <p className="text-gray-500 text-xs mt-1">
              Include all relevant details and documentation. This will be part of the official record.
            </p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm mb-1">Tenant Information</p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">Name: <span className="text-white">{lease.tenant_name}</span></p>
                  <p className="text-gray-400">Email: <span className="text-white">{lease.tenant_email}</span></p>
                  <p className="text-gray-400">Monthly Rent: <span className="text-white">${lease.monthly_rent?.toLocaleString()}</span></p>
                  <p className="text-gray-400">Lease Period: <span className="text-white">
                    {new Date(lease.lease_start_date).toLocaleDateString()} - {new Date(lease.lease_end_date).toLocaleDateString()}
                  </span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !reason || !description}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Processing...' : `Initiate ${escalationTypes[escalationType].label}`}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}