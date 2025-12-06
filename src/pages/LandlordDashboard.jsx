import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, DollarSign, FileText, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
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

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, status, notes }) => 
      base44.entities.LeaseApplication.update(id, { status, landlord_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['lease-applications']);
      toast.success('Application updated');
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
          <TabsList className="bg-white/10 border border-white/20">
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
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{payment.property_address}</h3>
                  <p className="text-gray-400 text-sm">Due: {new Date(payment.due_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white mb-1">${payment.amount}</p>
                  <Badge className={
                    payment.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                    payment.status === 'late' ? 'bg-red-500/20 text-red-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }>
                    {payment.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}