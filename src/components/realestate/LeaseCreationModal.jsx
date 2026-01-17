import React, { useState } from "react";
import { X, FileText, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LeaseCreationModal({ property, onClose, onSuccess }) {
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState(property?.price_per_month || "");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseTermMonths, setLeaseTermMonths] = useState(12);
  const [terms, setTerms] = useState(`RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into between the Landlord and Tenant for the property located at: ${property?.address || property?.location}

1. RENT: Tenant agrees to pay $${property?.price_per_month || 0} per month.

2. SECURITY DEPOSIT: Tenant agrees to pay a security deposit.

3. TERM: This lease begins on the start date and continues for the specified term.

4. UTILITIES: Tenant is responsible for all utilities unless otherwise specified.

5. MAINTENANCE: Tenant agrees to maintain the property in good condition.

6. PETS: No pets allowed without written permission.

7. SUBLETTING: No subletting without written permission.

8. TERMINATION: Either party may terminate with 30 days written notice.`);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tenantEmail || !tenantName || !leaseStartDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const startDate = new Date(leaseStartDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(leaseTermMonths));

      const lease = await base44.entities.Lease.create({
        property_id: property.id,
        property_address: property.address || property.location,
        tenant_email: tenantEmail,
        tenant_name: tenantName,
        landlord_email: property.created_by,
        landlord_name: property.host_name || "Landlord",
        monthly_rent: parseFloat(monthlyRent),
        security_deposit: parseFloat(securityDeposit),
        lease_start_date: startDate.toISOString().split('T')[0],
        lease_end_date: endDate.toISOString().split('T')[0],
        lease_term_months: parseInt(leaseTermMonths),
        terms,
        status: "pending_signatures",
        tenant_signed: false,
        landlord_signed: false
      });

      // Send notification to tenant
      await base44.integrations.Core.SendEmail({
        to: tenantEmail,
        subject: "New Lease Agreement - Action Required",
        body: `Hello ${tenantName},\n\nYou have a new lease agreement for ${property.address || property.location}.\n\nPlease log in to the platform to review and sign the lease.\n\nMonthly Rent: $${monthlyRent}\nLease Term: ${leaseTermMonths} months\nStart Date: ${leaseStartDate}`
      });

      toast.success('Lease agreement created and sent to tenant');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create lease agreement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
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
            <h2 className="text-2xl font-bold text-white">Create Lease Agreement</h2>
            <p className="text-gray-400 text-sm">{property?.address || property?.location}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-white font-semibold mb-2 block">Tenant Email *</label>
              <Input
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                placeholder="tenant@example.com"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Tenant Name *</label>
              <Input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="John Doe"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Monthly Rent ($) *</label>
              <Input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="2000"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Security Deposit ($) *</label>
              <Input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="4000"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Lease Start Date *</label>
              <Input
                type="date"
                value={leaseStartDate}
                onChange={(e) => setLeaseStartDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Lease Term (months) *</label>
              <Input
                type="number"
                value={leaseTermMonths}
                onChange={(e) => setLeaseTermMonths(e.target.value)}
                placeholder="12"
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">Lease Terms & Conditions</label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="bg-white/10 border-white/20 text-white min-h-[300px] font-mono text-sm"
              placeholder="Enter lease terms..."
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'Creating...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Create & Send to Tenant
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}