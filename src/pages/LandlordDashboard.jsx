import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, DollarSign, FileText, CheckCircle, XCircle, AlertTriangle, Shield, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LandlordDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Property.filter({ created_by: user.email });
    }
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['landlord-leases'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Lease.filter({ landlord_email: user.email });
    }
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['lease-applications'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const allApps = await base44.entities.LeaseApplication.list();
      return allApps.filter(app => app.created_by === user.email);
    }
  });

  const { data: rentPayments = [] } = useQuery({
    queryKey: ['rent-payments'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.RentPayment.filter({ landlord_email: user.email });
    }
  });

  const [showCreateLease, setShowCreateLease] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [leaseForm, setLeaseForm] = useState({
    monthly_rent: "", security_deposit: "", move_in_fee: "",
    lease_start_date: "", lease_end_date: "", rent_due_day: 1,
    grace_period_days: 5, late_fee_type: "flat", late_fee_amount: "",
    late_fee_max: "", terms: "", pets_allowed: false, pet_deposit: ""
  });
  const [showWaiveFee, setShowWaiveFee] = useState(null); // payment id

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, status, notes }) => 
      base44.entities.LeaseApplication.update(id, { status, landlord_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['lease-applications']);
      toast.success('Application updated');
    }
  });

  const createLeaseMutation = useMutation({
    mutationFn: async () => {
      const lease = await base44.entities.Lease.create({
        property_id: selectedApp.property_id,
        property_address: selectedApp.property_address,
        tenant_email: selectedApp.applicant_email,
        tenant_name: selectedApp.applicant_name,
        landlord_email: currentUser?.email,
        landlord_name: currentUser?.full_name,
        monthly_rent: parseFloat(leaseForm.monthly_rent),
        security_deposit: parseFloat(leaseForm.security_deposit) || 0,
        move_in_fee: parseFloat(leaseForm.move_in_fee) || 0,
        lease_start_date: leaseForm.lease_start_date,
        lease_end_date: leaseForm.lease_end_date,
        rent_due_day: parseInt(leaseForm.rent_due_day) || 1,
        grace_period_days: parseInt(leaseForm.grace_period_days) || 5,
        late_fee_type: leaseForm.late_fee_type,
        late_fee_amount: parseFloat(leaseForm.late_fee_amount) || 0,
        late_fee_max: parseFloat(leaseForm.late_fee_max) || 0,
        terms: leaseForm.terms,
        pets_allowed: leaseForm.pets_allowed,
        pet_deposit: parseFloat(leaseForm.pet_deposit) || 0,
        status: "pending_signatures",
        application_id: selectedApp.id
      });

      // Create initial payment records: security deposit & move-in fee
      if (leaseForm.security_deposit > 0) {
        await base44.entities.RentPayment.create({
          lease_id: lease.id,
          property_address: selectedApp.property_address,
          tenant_email: selectedApp.applicant_email,
          landlord_email: currentUser?.email,
          amount: parseFloat(leaseForm.security_deposit),
          payment_type: "security_deposit",
          due_date: leaseForm.lease_start_date,
          status: "pending"
        });
      }
      if (leaseForm.move_in_fee > 0) {
        await base44.entities.RentPayment.create({
          lease_id: lease.id,
          property_address: selectedApp.property_address,
          tenant_email: selectedApp.applicant_email,
          landlord_email: currentUser?.email,
          amount: parseFloat(leaseForm.move_in_fee),
          payment_type: "move_in_fee",
          due_date: leaseForm.lease_start_date,
          status: "pending"
        });
      }

      // Notify tenant
      await base44.entities.Notification.create({
        recipient_email: selectedApp.applicant_email,
        type: "lease_created",
        title: "Lease Ready to Sign",
        message: `Your lease for ${selectedApp.property_address} is ready. Please sign it in the Lease Portal.`,
        sender_email: currentUser?.email,
        sender_name: currentUser?.full_name,
        read: false
      }).catch(() => {});

      return lease;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['landlord-leases']);
      queryClient.invalidateQueries(['rent-payments']);
      setShowCreateLease(false);
      setSelectedApp(null);
      toast.success("Lease created! Tenant has been notified to sign.");
    }
  });

  const waivedFeeMutation = useMutation({
    mutationFn: async ({ paymentId, reason }) => {
      await base44.entities.RentPayment.update(paymentId, {
        late_fee_waived: true,
        late_fee_waived_reason: reason,
        late_fee_waived_by: currentUser?.email,
        late_fee_applied: 0,
        total_amount_due: rentPayments.find(p => p.id === paymentId)?.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rent-payments']);
      setShowWaiveFee(null);
      toast.success("Late fee waived.");
    }
  });

  const totalRevenue = rentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = rentPayments.filter(p => p.status === 'pending').length;
  const activeLeases = leases.filter(l => l.status === 'active').length;
  const pendingApplications = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Landlord Dashboard</h1>
            <p className="text-gray-300">Manage properties, leases, and applications</p>
          </div>
          <Button onClick={() => navigate(createPageUrl("RealEstate"))} className="bg-blue-600 hover:bg-blue-700">
            <Building className="w-5 h-5 mr-2" />
            View Properties
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Building className="w-8 h-8 text-blue-400" />
              <span className="text-gray-300">Properties</span>
            </div>
            <p className="text-3xl font-bold text-white">{properties.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-green-400" />
              <span className="text-gray-300">Active Leases</span>
            </div>
            <p className="text-3xl font-bold text-white">{activeLeases}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-gray-300">Total Revenue</span>
            </div>
            <p className="text-3xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-yellow-400" />
              <span className="text-gray-300">Applications</span>
            </div>
            <p className="text-3xl font-bold text-white">{pendingApplications}</p>
          </motion.div>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20 flex-wrap">
            <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
            <TabsTrigger value="leases">Leases ({leases.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({rentPayments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            {applications.length === 0 ? (
              <div className="text-center py-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                <p className="text-gray-400">No applications yet</p>
              </div>
            ) : (
              applications.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{app.applicant_name}</h3>
                      <p className="text-gray-300 mb-1">{app.property_address}</p>
                      <p className="text-gray-400 text-sm">{app.applicant_email}</p>
                    </div>
                    <Badge className={
                      app.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                      app.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }>
                      {app.status}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-sm">Monthly Income</span>
                      <p className="text-white font-medium">${app.monthly_income.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Move-in Date</span>
                      <p className="text-white font-medium">{new Date(app.move_in_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Occupants</span>
                      <p className="text-white font-medium">{app.num_occupants}</p>
                    </div>
                  </div>

                  {/* Extra app details */}
                  <div className="grid md:grid-cols-3 gap-3 mb-3 text-sm">
                    {app.employment_status && <div><span className="text-gray-400">Employment: </span><span className="text-white capitalize">{app.employment_status.replace(/_/g, " ")}</span></div>}
                    {app.credit_score && <div><span className="text-gray-400">Credit Score: </span><span className="text-white">{app.credit_score}</span></div>}
                    {app.num_occupants && <div><span className="text-gray-400">Occupants: </span><span className="text-white">{app.num_occupants}</span></div>}
                    {app.has_pets && <div><span className="text-gray-400">Pets: </span><span className="text-white">{app.pet_details || "Yes"}</span></div>}
                    {app.phone && <div><span className="text-gray-400">Phone: </span><span className="text-white">{app.phone}</span></div>}
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateApplicationMutation.mutate({ id: app.id, status: 'approved' })}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateApplicationMutation.mutate({ id: app.id, status: 'rejected' })}
                        variant="outline"
                        className="flex-1 text-red-400"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {app.status === 'approved' && (
                    <Button
                      onClick={() => { setSelectedApp(app); setShowCreateLease(true); }}
                      className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Lease Agreement
                    </Button>
                  )}
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="leases" className="space-y-4">
            {leases.map((lease) => (
              <motion.div
                key={lease.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
                onClick={() => navigate(createPageUrl("LeaseDetails") + `?id=${lease.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{lease.property_address}</h3>
                    <p className="text-gray-300">{lease.tenant_name}</p>
                  </div>
                  <Badge className={
                    lease.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    lease.status === 'pending_signatures' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }>
                    {lease.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">Monthly Rent</span>
                    <p className="text-white font-bold text-lg">${lease.monthly_rent}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Start Date</span>
                    <p className="text-white">{new Date(lease.lease_start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">End Date</span>
                    <p className="text-white">{new Date(lease.lease_end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            {rentPayments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{payment.property_address}</h3>
                  <p className="text-gray-400 text-sm capitalize">{payment.payment_type?.replace(/_/g, " ")} · Due: {payment.due_date}</p>
                  {payment.late_fee_applied > 0 && !payment.late_fee_waived && (
                    <p className="text-red-400 text-sm mt-1">Late fee: +${payment.late_fee_applied.toFixed(2)}</p>
                  )}
                  {payment.late_fee_waived && (
                    <p className="text-green-400 text-sm mt-1">✓ Late fee waived</p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-2xl font-bold text-white">${payment.amount}</p>
                  <Badge className={
                    payment.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                    payment.status === 'late' ? 'bg-red-500/20 text-red-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }>
                    {payment.status}
                  </Badge>
                  {payment.status !== 'paid' && payment.late_fee_applied > 0 && !payment.late_fee_waived && (
                    <button onClick={() => setShowWaiveFee(payment.id)}
                      className="text-xs text-yellow-400 hover:text-yellow-300 underline transition">
                      Waive Late Fee
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {rentPayments.length === 0 && (
              <div className="text-center py-12 bg-white/10 border border-white/20 rounded-2xl">
                <p className="text-gray-400">No payments yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Lease Modal */}
      <AnimatePresence>
        {showCreateLease && selectedApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowCreateLease(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-white font-bold text-lg">Create Lease — {selectedApp.applicant_name}</h2>
                <button onClick={() => setShowCreateLease(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-sm text-blue-300">
                  Property: {selectedApp.property_address} · Tenant: {selectedApp.applicant_name}
                </div>

                {/* Rent & Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-gray-400 text-sm mb-1 block">Monthly Rent ($) *</label>
                    <Input type="number" value={leaseForm.monthly_rent} onChange={e => setLeaseForm(f => ({...f, monthly_rent: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                  <div><label className="text-gray-400 text-sm mb-1 block">Security Deposit ($)</label>
                    <Input type="number" value={leaseForm.security_deposit} onChange={e => setLeaseForm(f => ({...f, security_deposit: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                  <div><label className="text-gray-400 text-sm mb-1 block">Move-in Fee ($)</label>
                    <Input type="number" value={leaseForm.move_in_fee} onChange={e => setLeaseForm(f => ({...f, move_in_fee: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                  <div><label className="text-gray-400 text-sm mb-1 block">Rent Due Day (1-31)</label>
                    <Input type="number" min="1" max="31" value={leaseForm.rent_due_day} onChange={e => setLeaseForm(f => ({...f, rent_due_day: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                  <div><label className="text-gray-400 text-sm mb-1 block">Lease Start *</label>
                    <Input type="date" value={leaseForm.lease_start_date} onChange={e => setLeaseForm(f => ({...f, lease_start_date: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                  <div><label className="text-gray-400 text-sm mb-1 block">Lease End *</label>
                    <Input type="date" value={leaseForm.lease_end_date} onChange={e => setLeaseForm(f => ({...f, lease_end_date: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                </div>

                {/* Late Fee Settings */}
                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-white font-semibold">Late Fee Policy</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-gray-400 text-sm mb-1 block">Grace Period (days)</label>
                      <Input type="number" value={leaseForm.grace_period_days} onChange={e => setLeaseForm(f => ({...f, grace_period_days: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                    <div><label className="text-gray-400 text-sm mb-1 block">Late Fee Type</label>
                      <select value={leaseForm.late_fee_type} onChange={e => setLeaseForm(f => ({...f, late_fee_type: e.target.value}))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white">
                        <option value="flat">Flat ($)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div><label className="text-gray-400 text-sm mb-1 block">
                      Late Fee Amount ({leaseForm.late_fee_type === "flat" ? "$" : "%"})
                    </label>
                      <Input type="number" value={leaseForm.late_fee_amount} onChange={e => setLeaseForm(f => ({...f, late_fee_amount: e.target.value}))} className="bg-white/10 border-white/20 text-white" placeholder="0 = no late fee" /></div>
                    <div><label className="text-gray-400 text-sm mb-1 block">Max Late Fee Cap ($) <span className="text-gray-500">(optional)</span></label>
                      <Input type="number" value={leaseForm.late_fee_max} onChange={e => setLeaseForm(f => ({...f, late_fee_max: e.target.value}))} className="bg-white/10 border-white/20 text-white" /></div>
                  </div>
                  <p className="text-gray-500 text-xs">Late fees can be waived per payment from the Payments tab.</p>
                </div>

                {/* Pets */}
                <div className="flex items-center gap-3">
                  <button onClick={() => setLeaseForm(f => ({...f, pets_allowed: !f.pets_allowed}))}
                    className={`w-12 h-6 rounded-full transition ${leaseForm.pets_allowed ? "bg-emerald-500" : "bg-gray-600"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transform transition ${leaseForm.pets_allowed ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-gray-300 text-sm">Pets Allowed</span>
                  {leaseForm.pets_allowed && (
                    <div className="flex-1">
                      <Input type="number" value={leaseForm.pet_deposit} onChange={e => setLeaseForm(f => ({...f, pet_deposit: e.target.value}))}
                        placeholder="Pet deposit ($)" className="bg-white/10 border-white/20 text-white" />
                    </div>
                  )}
                </div>

                {/* Terms */}
                <div><label className="text-gray-400 text-sm mb-1 block">Lease Terms & Conditions</label>
                  <textarea value={leaseForm.terms} onChange={e => setLeaseForm(f => ({...f, terms: e.target.value}))}
                    rows={5} placeholder="Enter full lease terms and house rules..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowCreateLease(false)} className="flex-1 border-white/20">Cancel</Button>
                  <Button
                    onClick={() => createLeaseMutation.mutate()}
                    disabled={createLeaseMutation.isPending || !leaseForm.monthly_rent || !leaseForm.lease_start_date || !leaseForm.lease_end_date}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createLeaseMutation.isPending ? "Creating..." : "Create & Send to Tenant"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Waive Fee Modal */}
        {showWaiveFee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowWaiveFee(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-gray-900 rounded-3xl p-6 space-y-4">
              <h2 className="text-white font-bold text-lg">Waive Late Fee</h2>
              <p className="text-gray-400 text-sm">Optionally provide a reason for waiving the late fee:</p>
              <textarea id="waive-reason" rows={3} placeholder="e.g. Tenant paid original amount, first-time waiver..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none" />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowWaiveFee(null)} className="flex-1 border-white/20">Cancel</Button>
                <Button onClick={() => {
                  const reason = document.getElementById('waive-reason')?.value || "";
                  waivedFeeMutation.mutate({ paymentId: showWaiveFee, reason });
                }} className="flex-1 bg-yellow-600 hover:bg-yellow-700">Waive Fee</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}