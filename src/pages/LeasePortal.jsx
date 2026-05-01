import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Home, DollarSign, Calendar, CheckCircle, Clock, AlertTriangle, Pen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending_signatures: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  expiring_soon: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  terminated: "bg-red-500/20 text-red-400 border-red-500/30",
  payment_overdue: "bg-red-500/20 text-red-400 border-red-500/30",
};

const paymentStatusColors = {
  pending: "bg-yellow-500/20 text-yellow-400",
  paid: "bg-green-500/20 text-green-400",
  late: "bg-red-500/20 text-red-400",
  waived: "bg-blue-500/20 text-blue-400",
};

export default function LeasePortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLease, setSelectedLease] = useState(null);
  const [activeTab, setActiveTab] = useState("leases");
  const [signingLease, setSigningLease] = useState(null);
  const [signatureName, setSignatureName] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: leases = [], isLoading } = useQuery({
    queryKey: ["leases", currentUser?.email],
    queryFn: () => base44.entities.Lease.list("-created_date"),
    enabled: !!currentUser,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["rent-payments", currentUser?.email],
    queryFn: () => base44.entities.RentPayment.list("-due_date"),
    enabled: !!currentUser,
  });

  const signMutation = useMutation({
    mutationFn: async ({ lease, role }) => {
      const now = new Date().toISOString();
      const update = role === "tenant"
        ? { tenant_signed: true, tenant_signature: signatureName, tenant_signed_date: now }
        : { landlord_signed: true, landlord_signature: signatureName, landlord_signed_date: now };

      const updated = { ...lease, ...update };
      if (updated.tenant_signed && updated.landlord_signed) {
        update.status = "active";
      }
      return base44.entities.Lease.update(lease.id, update);
    },
    onSuccess: () => {
      toast.success("Lease signed successfully!");
      setSigningLease(null);
      setSignatureName("");
      queryClient.invalidateQueries(["leases"]);
    },
  });

  const payMutation = useMutation({
    mutationFn: async (payment) => {
      return base44.entities.RentPayment.update(payment.id, {
        status: "paid",
        paid_date: new Date().toISOString(),
        payment_method: "card",
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded!");
      queryClient.invalidateQueries(["rent-payments"]);
    },
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myLeases = leases.filter(
    (l) => l.tenant_email === currentUser.email || l.landlord_email === currentUser.email
  );
  const myPayments = payments.filter(
    (p) => p.tenant_email === currentUser.email || p.landlord_email === currentUser.email
  );
  const pendingPayments = myPayments.filter((p) => p.status === "pending" || p.status === "late");

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Lease Portal
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage your leases and rent payments</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
          {["leases", "payments"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab}
              {tab === "payments" && pendingPayments.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-xs">
                  {pendingPayments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Leases Tab */}
        {activeTab === "leases" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading leases...</div>
            ) : myLeases.length === 0 ? (
              <div className="text-center py-16">
                <Home className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No leases found</p>
              </div>
            ) : (
              myLeases.map((lease) => {
                const isLandlord = lease.landlord_email === currentUser.email;
                const isTenant = lease.tenant_email === currentUser.email;
                const needsMySignature =
                  (isTenant && !lease.tenant_signed) || (isLandlord && !lease.landlord_signed);

                return (
                  <div
                    key={lease.id}
                    className="bg-gray-900 rounded-2xl p-5 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">
                          {lease.property_title || lease.property_address || "Property"}
                        </p>
                        <p className="text-gray-400 text-sm">{lease.property_address}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {isLandlord ? `Tenant: ${lease.tenant_name || lease.tenant_email}` : `Landlord: ${lease.landlord_name || lease.landlord_email}`}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[lease.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {lease.status?.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Monthly Rent</p>
                        <p className="text-white font-semibold">${lease.monthly_rent?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Start Date</p>
                        <p className="text-white">{lease.lease_start_date ? format(new Date(lease.lease_start_date), "MMM d, yyyy") : "—"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">End Date</p>
                        <p className="text-white">{lease.lease_end_date ? format(new Date(lease.lease_end_date), "MMM d, yyyy") : "—"}</p>
                      </div>
                    </div>

                    {/* Signature status */}
                    <div className="flex gap-3 mb-4 text-xs">
                      <div className={`flex items-center gap-1 ${lease.tenant_signed ? "text-green-400" : "text-yellow-400"}`}>
                        {lease.tenant_signed ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Tenant {lease.tenant_signed ? "signed" : "pending"}
                      </div>
                      <div className={`flex items-center gap-1 ${lease.landlord_signed ? "text-green-400" : "text-yellow-400"}`}>
                        {lease.landlord_signed ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Landlord {lease.landlord_signed ? "signed" : "pending"}
                      </div>
                    </div>

                    {needsMySignature && (
                      <Button
                        onClick={() => setSigningLease(lease)}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        size="sm"
                      >
                        <Pen className="w-4 h-4 mr-2" />
                        Sign Lease
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            {myPayments.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No payments found</p>
              </div>
            ) : (
              myPayments.map((payment) => {
                const isTenant = payment.tenant_email === currentUser.email;
                const isOverdue = payment.status === "late";

                return (
                  <div key={payment.id} className="bg-gray-900 rounded-2xl p-5 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">
                          {payment.property_title || "Rent Payment"}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Due: {payment.due_date ? format(new Date(payment.due_date), "MMM d, yyyy") : "—"}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${paymentStatusColors[payment.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {payment.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-lg">${(payment.total_amount_due || payment.amount)?.toLocaleString()}</p>
                        {payment.late_fee_applied > 0 && !payment.late_fee_waived && (
                          <p className="text-red-400 text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Includes ${payment.late_fee_applied} late fee
                          </p>
                        )}
                      </div>
                      {isTenant && (payment.status === "pending" || payment.status === "late") && (
                        <Button
                          onClick={() => payMutation.mutate(payment)}
                          disabled={payMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Sign Lease Modal */}
      {signingLease && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-white font-bold text-lg mb-2">Sign Lease Agreement</h3>
            <p className="text-gray-400 text-sm mb-4">
              Type your full legal name below to digitally sign this lease.
            </p>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Your full legal name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setSigningLease(null); setSignatureName(""); }} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!signatureName.trim()) { toast.error("Please enter your name"); return; }
                  const role = signingLease.tenant_email === currentUser.email ? "tenant" : "landlord";
                  signMutation.mutate({ lease: signingLease, role });
                }}
                disabled={signMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {signMutation.isPending ? "Signing..." : "Confirm & Sign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}