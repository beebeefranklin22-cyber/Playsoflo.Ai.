import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, DollarSign, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

export default function LeaseDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const leaseId = new URLSearchParams(location.search).get('id');
  const [showSignature, setShowSignature] = useState(false);
  const signaturePad = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', leaseId],
    queryFn: async () => {
      const leases = await base44.entities.Lease.list();
      return leases.find(l => l.id === leaseId);
    },
    enabled: !!leaseId
  });

  const signLeaseMutation = useMutation({
    mutationFn: async () => {
      const signature = signaturePad.current.toDataURL();
      const isLandlord = currentUser.email === lease.landlord_email;
      
      return base44.entities.Lease.update(leaseId, {
        [isLandlord ? 'landlord_signed' : 'tenant_signed']: true,
        [isLandlord ? 'landlord_signature' : 'tenant_signature']: signature,
        [isLandlord ? 'landlord_signed_date' : 'tenant_signed_date']: new Date().toISOString(),
        status: (lease.landlord_signed || isLandlord) && (lease.tenant_signed || !isLandlord) ? 'active' : 'pending_signatures'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lease', leaseId]);
      setShowSignature(false);
      toast.success('Lease signed successfully');
    }
  });

  if (isLoading) {
    return <div className="p-6 text-white text-center">Loading lease...</div>;
  }

  if (!lease) {
    return <div className="p-6 text-white text-center">Lease not found</div>;
  }

  const isLandlord = currentUser?.email === lease.landlord_email;
  const isTenant = currentUser?.email === lease.tenant_email;
  const canSign = (isLandlord && !lease.landlord_signed) || (isTenant && !lease.tenant_signed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(createPageUrl("LandlordDashboard"))}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">Lease Agreement</h1>
            <p className="text-gray-300">{lease.property_address}</p>
          </div>
          <Badge className={
            lease.status === 'active' ? 'bg-green-500/20 text-green-300 text-lg px-4 py-2' :
            lease.status === 'pending_signatures' ? 'bg-yellow-500/20 text-yellow-300 text-lg px-4 py-2' :
            'bg-gray-500/20 text-gray-300 text-lg px-4 py-2'
          }>
            {lease.status.replace('_', ' ')}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Lease Details
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Lease Term</span>
                <p className="text-white font-medium">{lease.lease_term_months} months</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Start Date</span>
                <p className="text-white font-medium">{new Date(lease.lease_start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">End Date</span>
                <p className="text-white font-medium">{new Date(lease.lease_end_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Details
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-sm">Monthly Rent</span>
                <p className="text-white font-bold text-2xl">${lease.monthly_rent}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Security Deposit</span>
                <p className="text-white font-medium">${lease.security_deposit}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Parties</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Landlord</h4>
              <p className="text-white font-medium mb-1">{lease.landlord_name}</p>
              <p className="text-gray-300 text-sm">{lease.landlord_email}</p>
              {lease.landlord_signed && (
                <Badge className="mt-2 bg-green-500/20 text-green-300">✓ Signed</Badge>
              )}
            </div>
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Tenant</h4>
              <p className="text-white font-medium mb-1">{lease.tenant_name}</p>
              <p className="text-gray-300 text-sm">{lease.tenant_email}</p>
              {lease.tenant_signed && (
                <Badge className="mt-2 bg-green-500/20 text-green-300">✓ Signed</Badge>
              )}
            </div>
          </div>
        </div>

        {lease.terms && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Terms & Conditions</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{lease.terms}</p>
          </div>
        )}

        {showSignature && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Sign Lease</h3>
            <div className="bg-white rounded-xl p-4 mb-4">
              <SignatureCanvas
                ref={signaturePad}
                canvasProps={{
                  className: 'w-full h-48 border-2 border-gray-300 rounded'
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => signaturePad.current.clear()}
                variant="outline"
              >
                Clear
              </Button>
              <Button
                onClick={() => signLeaseMutation.mutate()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Confirm Signature
              </Button>
              <Button
                onClick={() => setShowSignature(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {canSign && !showSignature && (
          <Button
            onClick={() => setShowSignature(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg mb-4"
          >
            <Pencil className="w-5 h-5 mr-2" />
            Sign Lease Agreement
          </Button>
        )}

        {lease.status === 'active' && (
          <Button
            onClick={() => navigate(createPageUrl("RentPayments") + `?lease=${leaseId}`)}
            className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
          >
            <DollarSign className="w-5 h-5 mr-2" />
            View Rent Payments
          </Button>
        )}
      </div>
    </div>
  );
}