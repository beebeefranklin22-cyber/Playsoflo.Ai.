import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdditionalFeesManager({ rental, rentalType, onClose }) {
  const qc = useQueryClient();
  const [feeForm, setFeeForm] = useState({
    fee_type: "late_fee",
    amount: 0,
    description: "",
    evidence_urls: []
  });

  const chargeFeeMutation = useMutation({
    mutationFn: async (feeData) => {
      // A provider can't unilaterally debit a renter's wallet -- that's not
      // how wallet_move works anywhere in this app (it always debits the
      // authenticated caller, never a third party), nor should it be: that
      // would let any provider drain any renter's balance at will. This
      // used to insert a bare Payment row with status:'pending' and tell
      // the provider "Fee charged successfully" -- no money ever moved and
      // nothing ever collected it later. The real mechanism this app
      // already has for "I'm owed money by someone else" is a
      // PaymentRequest (same one RequestMoneyModal.jsx uses): the renter
      // sees it and explicitly pays via the existing pay_request action
      // (api/_handlers/wallet.js), which is the only thing that actually
      // moves money.
      const currentUser = await base44.auth.me();
      const payerEmail = rental.renter_email || rental.guest_email;
      const request = await base44.entities.PaymentRequest.create({
        request_type: "money_request",
        requester_email: currentUser.email,
        requester_name: currentUser.full_name || currentUser.email,
        payer_email: payerEmail,
        amount: feeData.amount,
        note: `${feeData.fee_type.replace(/_/g, ' ')}: ${feeData.description}`,
        status: "pending",
      });

      await base44.entities.Notification.create({
        recipient_email: payerEmail,
        type: 'additional_fee_requested',
        title: `Additional Fee Requested: ${feeData.fee_type.replace(/_/g, ' ')}`,
        message: `${currentUser.full_name || currentUser.email} is requesting $${feeData.amount} for ${feeData.description}. Review and pay in your Wallet.`,
        reference_type: 'payment_request',
        reference_id: request.id,
        action_url: '/Wallet',
      });

      return request;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-rentals'] });
      toast.success('Fee request sent. The customer needs to review and pay it from their Wallet.');
      onClose?.();
    },
    onError: (error) => {
      toast.error('Failed to send fee request: ' + error.message);
    }
  });

  const handleUploadEvidence = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFeeForm(prev => ({
      ...prev,
      evidence_urls: [...prev.evidence_urls, file_url]
    }));
  };

  const feeDescriptions = {
    late_fee: `Late return fee for ${rental.car_make || 'property'} - returned after agreed time`,
    cleaning_fee: `Additional cleaning required due to excessive mess or damage`,
    smoking_fee: `Smoking violation fee - evidence of smoking detected`,
    damage_fee: `Damage repair cost for documented issues`,
    missing_items: `Fee for missing or stolen items from property`,
    excess_mileage: `Excess mileage charges beyond agreed limit`
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Charge Additional Fee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <p className="text-yellow-300 text-xs">
              This sends the customer a payment request they'll need to review and pay from
              their Wallet — it isn't charged automatically. Make sure to document the reason
              with photos or evidence.
            </p>
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Fee Type</label>
          <Select
            value={feeForm.fee_type}
            onValueChange={(v) => setFeeForm({
              ...feeForm,
              fee_type: v,
              description: feeDescriptions[v]
            })}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="late_fee">Late Return Fee</SelectItem>
              <SelectItem value="cleaning_fee">Cleaning Fee</SelectItem>
              <SelectItem value="smoking_fee">Smoking Violation</SelectItem>
              <SelectItem value="damage_fee">Damage Repair</SelectItem>
              <SelectItem value="missing_items">Missing Items</SelectItem>
              {rentalType === 'car_rental' && (
                <SelectItem value="excess_mileage">Excess Mileage</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Amount ($)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={feeForm.amount}
            onChange={(e) => setFeeForm({ ...feeForm, amount: parseFloat(e.target.value) || 0 })}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Description</label>
          <Textarea
            placeholder="Detailed reason for the fee..."
            value={feeForm.description}
            onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
            className="bg-white/10 border-white/20 text-white"
            rows={3}
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Evidence (Photos/Documents)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {feeForm.evidence_urls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`evidence-${idx}`}
                className="w-20 h-20 object-cover rounded-lg border border-white/20"
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('evidence-upload').click()}
            className="w-full"
          >
            Upload Evidence
          </Button>
          <input
            id="evidence-upload"
            type="file"
            accept="image/*"
            onChange={(e) => handleUploadEvidence(e.target.files?.[0])}
            className="hidden"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => chargeFeeMutation.mutate(feeForm)}
            disabled={chargeFeeMutation.isLoading || !feeForm.amount || !feeForm.description}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {chargeFeeMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Charge ${feeForm.amount.toFixed(2)}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}