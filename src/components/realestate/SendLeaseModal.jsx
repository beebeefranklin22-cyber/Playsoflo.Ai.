import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { X, Send, Mail, FileText, ClipboardCopy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

/**
 * SendLeaseModal
 * Allows a landlord/realtor to:
 *  - Send a lease-signing link directly to a tenant by email
 *  - OR send a rental application link to a prospective tenant
 */
export default function SendLeaseModal({ onClose, currentUser, leases = [], properties = [] }) {
  const [mode, setMode] = useState("lease"); // "lease" | "application"
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  // Build a shareable deep-link (just a URL the tenant can visit)
  const leasePortalUrl = `${window.location.origin}/LeasePortal`;
  const applicationUrl = selectedProperty
    ? `${window.location.origin}/RealEstate?apply=${selectedProperty.id}`
    : `${window.location.origin}/RealEstate`;

  const shareUrl = mode === "lease" ? leasePortalUrl : applicationUrl;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!recipientEmail.trim()) throw new Error("Please enter recipient email");

      // 1. Create in-app notification
      await base44.entities.Notification.create({
        recipient_email: recipientEmail.trim().toLowerCase(),
        type: mode === "lease" ? "lease_sent" : "application_invite",
        title: mode === "lease"
          ? `${currentUser?.full_name || "Your landlord"} sent you a lease to sign`
          : `${currentUser?.full_name || "A landlord"} invited you to apply`,
        message: message.trim() ||
          (mode === "lease"
            ? `Please review and sign your lease for ${selectedLease?.property_address || "the property"}.`
            : `You've been invited to apply for ${selectedProperty?.title || "a property"}.`),
        sender_email: currentUser?.email,
        sender_name: currentUser?.full_name,
        reference_id: mode === "lease" ? selectedLeaseId : selectedPropertyId,
        reference_type: mode === "lease" ? "lease" : "property",
        action_url: shareUrl,
        read: false,
      });

      // 2. Also send an email via Core integration
      await base44.integrations.Core.SendEmail({
        to: recipientEmail.trim().toLowerCase(),
        subject: mode === "lease"
          ? `Lease Agreement Ready to Sign — ${selectedLease?.property_address || "Property"}`
          : `You've been invited to apply for a rental`,
        body: `
Hello,

${message.trim() || (mode === "lease"
  ? `${currentUser?.full_name || "Your landlord"} has created a lease agreement for ${selectedLease?.property_address || "the property"} and is ready for your signature.`
  : `${currentUser?.full_name || "A landlord"} has invited you to apply for ${selectedProperty?.title || "a property"} at ${selectedProperty?.location || ""}.`
)}

Click the link below to get started:
${shareUrl}

${mode === "lease" ? "You will be able to review all terms and sign digitally in the Lease Portal." : "Complete your application and the landlord will review it."}

— Sent via PlaySoFlo Real Estate
        `.trim(),
      });
    },
    onSuccess: () => {
      toast.success(`${mode === "lease" ? "Lease" : "Application invite"} sent to ${recipientEmail}!`);
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send");
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" />
            Send to Prospective Tenant
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-white transition" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("lease")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                mode === "lease" ? "bg-blue-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <FileText className="w-4 h-4" />
              Send Lease to Sign
            </button>
            <button
              onClick={() => setMode("application")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                mode === "application" ? "bg-emerald-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <Mail className="w-4 h-4" />
              Invite to Apply
            </button>
          </div>

          {/* Select lease or property */}
          {mode === "lease" ? (
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Select Lease</label>
              <select
                value={selectedLeaseId}
                onChange={(e) => setSelectedLeaseId(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
              >
                <option value="">— Choose a lease —</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.property_address || l.property_title || l.id} · {l.tenant_name || l.tenant_email}
                  </option>
                ))}
              </select>
              {leases.length === 0 && (
                <p className="text-gray-500 text-xs mt-1">No leases found. Create one from an approved application first.</p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Select Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
              >
                <option value="">— Choose a property —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.location}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient email */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Recipient Email *</label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="tenant@email.com"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Optional message */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Personal Message <span className="text-gray-500">(optional)</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Hi! Please review and sign your lease..."
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none text-sm"
            />
          </div>

          {/* Share link */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-gray-400 text-xs truncate flex-1">{shareUrl}</span>
            <button onClick={handleCopy} className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <ClipboardCopy className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20">
              Cancel
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !recipientEmail.trim()}
              className={`flex-1 ${mode === "lease" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {sendMutation.isPending ? "Sending..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send {mode === "lease" ? "Lease" : "Invite"}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}