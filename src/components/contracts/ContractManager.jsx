import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Send, Eye, PenLine, Download, Plus, X,
  CheckCircle, XCircle, Clock, AlertTriangle, Shield
} from "lucide-react";
import { toast } from "sonner";

const DISCLAIMER = `IMPORTANT LEGAL NOTICE: By signing this contract, you acknowledge that you are entering into a legally binding agreement. You represent that you have the legal capacity to enter into this agreement. PlaySoFlo / Playsoflo.com is NOT a party to this contract and is NOT responsible for any breach, violation, or dispute arising from this agreement. Each individual party is solely responsible for upholding all contract terms and clauses. PlaySoFlo provides this platform as a communication and document tool only.`;

function StatusBadge({ status }) {
  const config = {
    draft: { color: "bg-gray-500/20 text-gray-400", icon: Clock, label: "Draft" },
    sent: { color: "bg-blue-500/20 text-blue-400", icon: Send, label: "Sent" },
    viewed: { color: "bg-yellow-500/20 text-yellow-400", icon: Eye, label: "Viewed" },
    signed: { color: "bg-green-500/20 text-green-400", icon: CheckCircle, label: "Signed" },
    declined: { color: "bg-red-500/20 text-red-400", icon: XCircle, label: "Declined" },
    expired: { color: "bg-orange-500/20 text-orange-400", icon: AlertTriangle, label: "Expired" },
  };
  const { color, icon: Icon, label } = config[status] || config.draft;
  return (
    <Badge className={`${color} flex items-center gap-1 text-xs`}>
      <Icon className="w-3 h-3" />{label}
    </Badge>
  );
}

function CreateContractModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    recipient_email: "",
    recipient_name: "",
    service_description: "",
    body: "",
    amount: "",
    start_date: "",
    end_date: "",
    delivery_method: "in_app"
  });
  const [mySignature, setMySignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = async () => {
    if (!form.title.trim() || !form.recipient_email.trim() || !form.body.trim()) {
      toast.error("Fill in title, recipient email, and contract terms");
      return;
    }
    if (!agreed) { toast.error("You must acknowledge the disclaimer"); return; }
    if (!mySignature.trim()) { toast.error("Sign your name to send the contract"); return; }

    setSaving(true);
    try {
      const contract = await base44.entities.ServiceContract.create({
        title: form.title.trim(),
        creator_email: currentUser.email,
        creator_name: currentUser.full_name || currentUser.email,
        recipient_email: form.recipient_email.trim().toLowerCase(),
        recipient_name: form.recipient_name.trim(),
        service_description: form.service_description.trim(),
        body: form.body.trim(),
        amount: form.amount ? parseFloat(form.amount) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        delivery_method: form.delivery_method,
        creator_signature: mySignature.trim(),
        creator_signed_at: new Date().toISOString(),
        status: "sent"
      });

      // Notify recipient in-app
      if (form.delivery_method === "in_app") {
        base44.entities.Notification.create({
          recipient_email: form.recipient_email.trim().toLowerCase(),
          type: "message",
          title: `📄 Contract Request from ${currentUser.full_name || currentUser.email}`,
          message: `You have received a contract: "${form.title}". Open the app to review and sign.`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          reference_id: contract.id,
          reference_type: "message",
          read: false
        }).catch(() => {});
      }

      if (form.delivery_method === "email") {
        base44.integrations.Core.SendEmail({
          to: form.recipient_email.trim(),
          subject: `Contract Request: ${form.title}`,
          body: `Hello ${form.recipient_name || ""},\n\n${currentUser.full_name || currentUser.email} has sent you a contract to review and sign on PlaySoFlo.\n\nContract: "${form.title}"\n\nPlease log in to PlaySoFlo to review and sign this contract.\n\nPlaySoFlo is not liable for any breach or violation — by signing, each party is personally responsible.\n\n— PlaySoFlo Team`
        }).catch(() => {});
      }

      toast.success("Contract sent successfully!");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error("Failed to send contract: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Create & Send Contract</h2>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-white" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Contract Title *</label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="e.g. Photography Services Agreement" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Contract Value (USD)</label>
              <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="500.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Recipient Email *</label>
              <Input value={form.recipient_email} onChange={e => set("recipient_email", e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="client@email.com" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Recipient Name</label>
              <Input value={form.recipient_name} onChange={e => set("recipient_name", e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="John Doe" />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Service Description</label>
            <Input value={form.service_description} onChange={e => set("service_description", e.target.value)} className="bg-white/10 border-white/20 text-white" placeholder="Brief description of services" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">End Date</label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Contract Terms & Clauses *</label>
            <textarea
              value={form.body}
              onChange={e => set("body", e.target.value)}
              rows={8}
              placeholder="Write your full contract terms, clauses, obligations, deliverables, payment terms, etc..."
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600 resize-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Send Via</label>
            <div className="flex gap-3">
              {["in_app", "email"].map(m => (
                <button key={m} onClick={() => set("delivery_method", m)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition ${form.delivery_method === m ? "bg-purple-600 border-purple-500 text-white" : "bg-white/5 border-white/10 text-gray-300"}`}
                >
                  {m === "in_app" ? "📱 In-App Notification" : "📧 Email"}
                </button>
              ))}
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-300 text-xs leading-relaxed">{DISCLAIMER}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
              <span className="text-yellow-300 text-sm font-semibold">I understand and acknowledge the above disclaimer</span>
            </label>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Your Signature (type your full name) *</label>
            <Input value={mySignature} onChange={e => setMySignature(e.target.value)} className="bg-white/10 border-white/20 text-white font-serif text-lg italic" placeholder="Sign here by typing your name..." />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white">Cancel</Button>
          <Button onClick={handleSend} disabled={saving} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600">
            {saving ? "Sending..." : <><Send className="w-4 h-4 mr-2" />Send Contract</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SignContractModal({ contract, currentUser, onClose, onSigned }) {
  const queryClient = useQueryClient();
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  React.useEffect(() => {
    // Mark as viewed
    if (contract.status === "sent") {
      base44.entities.ServiceContract.update(contract.id, { status: "viewed", viewed_at: new Date().toISOString() }).catch(() => {});
    }
  }, [contract.id, contract.status]);

  const handleSign = async () => {
    if (!signature.trim()) { toast.error("Enter your signature"); return; }
    if (!agreed) { toast.error("You must accept the disclaimer to sign"); return; }
    setSigning(true);
    try {
      await base44.entities.ServiceContract.update(contract.id, {
        status: "signed",
        recipient_signature: signature.trim(),
        recipient_signed_at: new Date().toISOString(),
        liability_disclaimer_accepted: true
      });
      // Notify creator
      base44.entities.Notification.create({
        recipient_email: contract.creator_email,
        type: "message",
        title: `✅ Contract Signed`,
        message: `${currentUser.full_name || currentUser.email} has signed "${contract.title}"`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reference_id: contract.id,
        reference_type: "message",
        read: false
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["my-contracts"] });
      toast.success("Contract signed successfully!");
      onSigned?.();
      onClose();
    } catch (err) {
      toast.error("Failed to sign: " + err.message);
    } finally {
      setSigning(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this contract?")) return;
    await base44.entities.ServiceContract.update(contract.id, { status: "declined" });
    queryClient.invalidateQueries({ queryKey: ["my-contracts"] });
    toast.info("Contract declined");
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-green-700 to-teal-700 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{contract.title}</h2>
            <p className="text-green-200 text-sm">From: {contract.creator_name || contract.creator_email}</p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-white" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {contract.amount && (
            <div className="bg-white/5 rounded-xl p-3 flex justify-between">
              <span className="text-gray-400">Contract Value</span>
              <span className="text-white font-bold">${contract.amount.toLocaleString()}</span>
            </div>
          )}
          {(contract.start_date || contract.end_date) && (
            <div className="bg-white/5 rounded-xl p-3 flex justify-between">
              <span className="text-gray-400">Period</span>
              <span className="text-white">{contract.start_date || "TBD"} → {contract.end_date || "TBD"}</span>
            </div>
          )}
          {contract.service_description && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-1">Services</p>
              <p className="text-white text-sm">{contract.service_description}</p>
            </div>
          )}

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">Contract Terms</p>
            <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{contract.body}</p>
          </div>

          {contract.creator_signature && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-1">Creator Signature</p>
              <p className="text-purple-300 font-serif text-lg italic">{contract.creator_signature}</p>
              <p className="text-gray-500 text-xs">{new Date(contract.creator_signed_at).toLocaleString()}</p>
            </div>
          )}

          {contract.status !== "signed" && contract.status !== "declined" && (
            <>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-xs leading-relaxed">{DISCLAIMER}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4 accent-red-500" />
                  <span className="text-red-300 text-sm font-semibold">I acknowledge and accept the above terms</span>
                </label>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Your Signature (type your full name) *</label>
                <Input value={signature} onChange={e => setSignature(e.target.value)} className="bg-white/10 border-white/20 text-white font-serif text-lg italic" placeholder="Sign here..." />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDecline} className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10">
                  <XCircle className="w-4 h-4 mr-2" />Decline
                </Button>
                <Button onClick={handleSign} disabled={signing} className="flex-1 bg-gradient-to-r from-green-600 to-teal-600">
                  <PenLine className="w-4 h-4 mr-2" />{signing ? "Signing..." : "Sign Contract"}
                </Button>
              </div>
            </>
          )}

          {contract.status === "signed" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-bold">Contract Fully Executed</p>
              <p className="text-green-400 font-serif italic mt-1">{contract.recipient_signature}</p>
              <p className="text-gray-500 text-xs">{new Date(contract.recipient_signed_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ContractManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [tab, setTab] = useState("sent"); // sent | received

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["my-contracts", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const sent = await base44.entities.ServiceContract.filter({ creator_email: currentUser.email });
      const received = await base44.entities.ServiceContract.filter({ recipient_email: currentUser.email });
      // merge deduped
      const all = [...sent, ...received.filter(r => !sent.find(s => s.id === r.id))];
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser?.email
  });

  const sentContracts = contracts.filter(c => c.creator_email === currentUser?.email);
  const receivedContracts = contracts.filter(c => c.recipient_email === currentUser?.email);
  const displayed = tab === "sent" ? sentContracts : receivedContracts;

  const pendingReceived = receivedContracts.filter(c => ["sent", "viewed"].includes(c.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Contracts
          </h2>
          <p className="text-gray-400 text-sm">Send, sign, and manage service agreements</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600">
          <Plus className="w-4 h-4 mr-2" />New Contract
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("sent")} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === "sent" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          Sent ({sentContracts.length})
        </button>
        <button onClick={() => setTab("received")} className={`relative px-4 py-2 rounded-full text-sm font-semibold transition ${tab === "received" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
          Received ({receivedContracts.length})
          {pendingReceived > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">{pendingReceived}</span>}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading contracts...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{tab === "sent" ? "No contracts sent yet" : "No contracts received"}</p>
          {tab === "sent" && <p className="text-gray-500 text-sm mt-1">Click "New Contract" to send your first agreement</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(contract => (
            <motion.div key={contract.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition cursor-pointer"
              onClick={() => setViewingContract(contract)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{contract.title}</h3>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {tab === "sent" ? `To: ${contract.recipient_name || contract.recipient_email}` : `From: ${contract.creator_name || contract.creator_email}`}
                  </p>
                  {contract.amount && <p className="text-green-400 text-sm font-semibold">${contract.amount.toLocaleString()}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={contract.status} />
                  <p className="text-gray-500 text-xs">{new Date(contract.created_date).toLocaleDateString()}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateContractModal
            currentUser={currentUser}
            onClose={() => setShowCreate(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["my-contracts"] })}
          />
        )}
        {viewingContract && (
          viewingContract.recipient_email === currentUser?.email && ["sent", "viewed"].includes(viewingContract.status) ? (
            <SignContractModal
              contract={viewingContract}
              currentUser={currentUser}
              onClose={() => setViewingContract(null)}
              onSigned={() => queryClient.invalidateQueries({ queryKey: ["my-contracts"] })}
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
              onClick={() => setViewingContract(null)}
            >
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{viewingContract.title}</h2>
                  <button onClick={() => setViewingContract(null)}><X className="w-6 h-6 text-white" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Recipient</p>
                      <p className="text-white">{viewingContract.recipient_name || viewingContract.recipient_email}</p>
                    </div>
                    <StatusBadge status={viewingContract.status} />
                  </div>
                  {viewingContract.amount && (
                    <div className="bg-white/5 rounded-xl p-3 flex justify-between">
                      <span className="text-gray-400">Value</span>
                      <span className="text-green-400 font-bold">${viewingContract.amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2 uppercase font-semibold">Terms</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{viewingContract.body}</p>
                  </div>
                  {viewingContract.creator_signature && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">Your Signature</p>
                      <p className="text-purple-300 font-serif text-lg italic">{viewingContract.creator_signature}</p>
                    </div>
                  )}
                  {viewingContract.recipient_signature && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-1">Recipient Signature</p>
                      <p className="text-green-300 font-serif text-lg italic">{viewingContract.recipient_signature}</p>
                      <p className="text-gray-500 text-xs">{new Date(viewingContract.recipient_signed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}