import React, { useState, useRef } from "react";
import { X, Check, Pen } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DigitalSignatureModal({ lease, currentUser, onClose, onSuccess }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signing, setSigning] = useState(false);

  const isLandlord = currentUser.email === lease.landlord_email;
  const isTenant = currentUser.email === lease.tenant_email;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature) {
      toast.error('Please provide your signature');
      return;
    }

    setSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL();

      const updateData = {
        ...(isLandlord && {
          landlord_signed: true,
          landlord_signature: signatureData,
          landlord_signed_date: new Date().toISOString()
        }),
        ...(isTenant && {
          tenant_signed: true,
          tenant_signature: signatureData,
          tenant_signed_date: new Date().toISOString()
        })
      };

      // Check if both parties have signed
      const bothSigned = 
        (isLandlord && lease.tenant_signed) || 
        (isTenant && lease.landlord_signed);

      if (bothSigned) {
        updateData.status = 'active';
      }

      await base44.entities.Lease.update(lease.id, updateData);

      // Send notification
      if (bothSigned) {
        const notifyEmail = isLandlord ? lease.tenant_email : lease.landlord_email;
        await base44.integrations.Core.SendEmail({
          to: notifyEmail,
          subject: "Lease Agreement Fully Executed",
          body: `The lease agreement for ${lease.property_address} has been fully executed. Both parties have signed.\n\nThe lease is now active.`
        });
      } else {
        const notifyEmail = isLandlord ? lease.tenant_email : lease.landlord_email;
        await base44.integrations.Core.SendEmail({
          to: notifyEmail,
          subject: "Lease Agreement - Signature Required",
          body: `${currentUser.full_name} has signed the lease agreement for ${lease.property_address}.\n\nPlease log in to review and sign the lease.`
        });
      }

      toast.success('Lease signed successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign lease');
    } finally {
      setSigning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl my-8"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Sign Lease Agreement</h2>
            <p className="text-gray-400 text-sm">{lease.property_address}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Lease Preview */}
          <div className="p-6 bg-white/5 rounded-xl border border-white/10 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Lease Terms</h3>
            <div className="space-y-4 text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {lease.terms}
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-gray-400 text-xs">Monthly Rent</p>
                <p className="text-white font-bold">${lease.monthly_rent?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Security Deposit</p>
                <p className="text-white font-bold">${lease.security_deposit?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Start Date</p>
                <p className="text-white font-bold">{new Date(lease.lease_start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">End Date</p>
                <p className="text-white font-bold">{new Date(lease.lease_end_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Signature Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${lease.landlord_signed ? 'bg-green-500/10 border-green-500/50' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                {lease.landlord_signed ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                )}
                <span className="text-white font-semibold">Landlord</span>
              </div>
              <p className="text-gray-400 text-sm">{lease.landlord_name}</p>
              {lease.landlord_signed && (
                <p className="text-green-400 text-xs mt-1">
                  Signed {new Date(lease.landlord_signed_date).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className={`p-4 rounded-xl border ${lease.tenant_signed ? 'bg-green-500/10 border-green-500/50' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                {lease.tenant_signed ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                )}
                <span className="text-white font-semibold">Tenant</span>
              </div>
              <p className="text-gray-400 text-sm">{lease.tenant_name}</p>
              {lease.tenant_signed && (
                <p className="text-green-400 text-xs mt-1">
                  Signed {new Date(lease.tenant_signed_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Signature Pad */}
          {((isLandlord && !lease.landlord_signed) || (isTenant && !lease.tenant_signed)) && (
            <div>
              <label className="text-white font-semibold mb-2 block flex items-center gap-2">
                <Pen className="w-4 h-4 text-emerald-400" />
                Your Signature
              </label>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full border-2 border-dashed border-white/20 rounded-lg cursor-crosshair bg-white/5"
                />
                <Button
                  type="button"
                  onClick={clearSignature}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Clear Signature
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            {((isLandlord && !lease.landlord_signed) || (isTenant && !lease.tenant_signed)) && (
              <Button
                onClick={handleSign}
                disabled={signing || !hasSignature}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {signing ? 'Signing...' : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Sign Lease
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}