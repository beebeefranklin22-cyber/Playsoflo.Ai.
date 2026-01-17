import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, Home, DollarSign, FileText, MessageCircle,
  Calendar, Check, X, AlertCircle, Clock, Bell, Download,
  Upload, Users, Settings, TrendingUp, Mail, Wrench, Image
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceRequestModal from "../components/realestate/MaintenanceRequestModal";
import PropertyAnalytics from "../components/realestate/PropertyAnalytics";

export default function LandlordTenantPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLease, setSelectedLease] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceLeaseId, setMaintenanceLeaseId] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  // Fetch user's leases (as tenant or landlord)
  const { data: leases = [] } = useQuery({
    queryKey: ['leases', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const asLandlord = await base44.entities.Lease.filter({ landlord_email: currentUser.email });
      const asTenant = await base44.entities.Lease.filter({ tenant_email: currentUser.email });
      return [...asLandlord, ...asTenant];
    },
    enabled: !!currentUser
  });

  // Fetch rent payments
  const { data: payments = [] } = useQuery({
    queryKey: ['rent-payments', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RentPayment.list();
    },
    enabled: !!currentUser
  });

  // Fetch maintenance requests
  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['maintenance-requests', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const asLandlord = await base44.entities.MaintenanceRequest.filter({ landlord_email: currentUser.email });
      const asTenant = await base44.entities.MaintenanceRequest.filter({ tenant_email: currentUser.email });
      return [...asLandlord, ...asTenant];
    },
    enabled: !!currentUser
  });

  // Fetch properties user owns
  const { data: properties = [] } = useQuery({
    queryKey: ['my-properties', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Property.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  const payRentMutation = useMutation({
    mutationFn: async ({ leaseId, amount }) => {
      const lease = leases.find(l => l.id === leaseId);
      return await base44.entities.RentPayment.create({
        lease_id: leaseId,
        property_id: lease.property_id,
        tenant_email: currentUser.email,
        landlord_email: lease.landlord_email,
        amount: Number(amount),
        payment_date: new Date().toISOString(),
        payment_method: "wallet",
        status: "completed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      toast.success('Rent payment submitted successfully');
      setShowPaymentModal(false);
      setPaymentAmount("");
    }
  });

  const activeLeasesAsLandlord = leases.filter(l => 
    l.landlord_email === currentUser?.email && l.status === 'active'
  );
  
  const activeLeasesAsTenant = leases.filter(l => 
    l.tenant_email === currentUser?.email && l.status === 'active'
  );

  const totalMonthlyIncome = activeLeasesAsLandlord.reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="relative h-48 flex items-end bg-gradient-to-b from-emerald-900/50 to-transparent">
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-6 pb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Property Management</h1>
          <p className="text-gray-300">Manage your properties, leases, and payments</p>
        </div>
      </div>

      <div className="px-6 -mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <Home className="w-8 h-8 text-white/80" />
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-white/80 text-sm">Properties Owned</p>
            <p className="text-4xl font-bold text-white">{properties.length}</p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-gray-400 text-sm">Active Leases</p>
            <p className="text-4xl font-bold text-white">
              {activeLeasesAsLandlord.length + activeLeasesAsTenant.length}
            </p>
          </div>

          <div className="p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm">Monthly Income</p>
            <p className="text-4xl font-bold text-white">
              ${totalMonthlyIncome.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Analytics */}
        {activeLeasesAsLandlord.length > 0 && (
          <div className="mb-8">
            <PropertyAnalytics 
              leases={leases}
              payments={payments}
              maintenanceRequests={maintenanceRequests.filter(r => r.landlord_email === currentUser?.email)}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leases">Leases</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* As Landlord */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-400" />
                  As Landlord
                </h3>
                <div className="space-y-3">
                  {activeLeasesAsLandlord.length === 0 ? (
                    <p className="text-gray-400 text-sm">No active leases</p>
                  ) : (
                    activeLeasesAsLandlord.map(lease => (
                      <div key={lease.id} className="p-4 bg-white/5 rounded-xl">
                        <p className="text-white font-semibold mb-1">{lease.property_address}</p>
                        <p className="text-gray-400 text-sm">Tenant: {lease.tenant_name}</p>
                        <p className="text-emerald-400 font-bold mt-2">
                          ${lease.monthly_rent?.toLocaleString()}/mo
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* As Tenant */}
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  As Tenant
                </h3>
                <div className="space-y-3">
                  {activeLeasesAsTenant.length === 0 ? (
                    <p className="text-gray-400 text-sm">No active leases</p>
                  ) : (
                    activeLeasesAsTenant.map(lease => (
                      <div key={lease.id} className="p-4 bg-white/5 rounded-xl">
                        <p className="text-white font-semibold mb-1">{lease.property_address}</p>
                        <p className="text-gray-400 text-sm">Landlord: {lease.landlord_name}</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p className="text-white font-bold">
                            ${lease.monthly_rent?.toLocaleString()}/mo
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setMaintenanceLeaseId(lease.id);
                                setShowMaintenanceModal(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-yellow-500 text-yellow-400"
                            >
                              <Wrench className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedLease(lease);
                                setPaymentAmount(lease.monthly_rent?.toString() || "");
                                setShowPaymentModal(true);
                              }}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Pay Rent
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Leases Tab */}
          <TabsContent value="leases" className="space-y-4">
            {leases.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No leases found</p>
              </div>
            ) : (
              leases.map(lease => (
                <div key={lease.id} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{lease.property_address}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Start: {new Date(lease.lease_start_date).toLocaleDateString()}</span>
                        <span>End: {new Date(lease.lease_end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      lease.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      lease.status === 'expiring_soon' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {lease.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Monthly Rent</p>
                      <p className="text-white font-bold">${lease.monthly_rent?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Security Deposit</p>
                      <p className="text-white font-bold">${lease.security_deposit?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">
                        {lease.tenant_email === currentUser.email ? 'Landlord' : 'Tenant'}
                      </p>
                      <p className="text-white font-semibold text-sm">
                        {lease.tenant_email === currentUser.email ? lease.landlord_name : lease.tenant_name}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => navigate(createPageUrl("Messages") + `?contact=${
                          lease.tenant_email === currentUser.email ? lease.landlord_email : lease.tenant_email
                        }`)}
                        variant="outline"
                        size="sm"
                        className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-20">
                <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No payments yet</p>
              </div>
            ) : (
              payments.map(payment => (
                <div key={payment.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold mb-1">
                      ${payment.amount?.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {payment.tenant_email === currentUser.email ? 
                        `To: ${payment.landlord_email}` : 
                        `From: ${payment.tenant_email}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              ))
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Maintenance Requests</h3>
              {activeLeasesAsTenant.length > 0 && (
                <Button
                  onClick={() => {
                    if (activeLeasesAsTenant.length === 1) {
                      setMaintenanceLeaseId(activeLeasesAsTenant[0].id);
                      setShowMaintenanceModal(true);
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              )}
            </div>

            {maintenanceRequests.length === 0 ? (
              <div className="text-center py-20">
                <Wrench className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No maintenance requests</p>
              </div>
            ) : (
              maintenanceRequests.map(request => (
                <div key={request.id} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-1">{request.issue_title}</h4>
                      <p className="text-gray-400 text-sm mb-2">{request.property_address}</p>
                      <p className="text-gray-300 text-sm">{request.issue_description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        request.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        request.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        request.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {request.status.replace('_', ' ')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        request.priority === 'emergency' ? 'bg-red-500/20 text-red-400' :
                        request.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {request.priority}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-xs">Category</p>
                      <p className="text-white font-semibold text-sm capitalize">
                        {request.category.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Submitted</p>
                      <p className="text-white font-semibold text-sm">
                        {new Date(request.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    {request.scheduled_date && (
                      <div>
                        <p className="text-gray-400 text-xs">Scheduled</p>
                        <p className="text-white font-semibold text-sm">
                          {new Date(request.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {request.estimated_cost && (
                      <div>
                        <p className="text-gray-400 text-xs">Est. Cost</p>
                        <p className="text-white font-semibold text-sm">
                          ${request.estimated_cost.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.photos?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-2">Photos</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {request.photos.map((photo, idx) => (
                          <div key={idx} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.landlord_notes && (
                    <div className="p-3 bg-white/5 rounded-xl">
                      <p className="text-gray-400 text-xs mb-1">Landlord Notes</p>
                      <p className="text-white text-sm">{request.landlord_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">My Properties</h3>
              <Button
                onClick={() => navigate(createPageUrl("RealEstate"))}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Home className="w-4 h-4 mr-2" />
                List New Property
              </Button>
            </div>

            {properties.length === 0 ? (
              <div className="text-center py-20">
                <Home className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No properties listed</p>
                <Button
                  onClick={() => navigate(createPageUrl("RealEstate"))}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  List Your First Property
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {properties.map(property => (
                  <div key={property.id} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div className="relative h-48 rounded-xl overflow-hidden mb-4">
                      <img 
                        src={property.main_image} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">{property.title}</h4>
                    <p className="text-gray-400 text-sm mb-3">{property.location}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        {property.listing_type === 'for_rent' && (
                          <p className="text-emerald-400 font-bold">
                            ${property.price_per_month?.toLocaleString()}/mo
                          </p>
                        )}
                        {property.listing_type === 'for_sale' && (
                          <p className="text-emerald-400 font-bold">
                            ${property.sale_price?.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => navigate(createPageUrl("RealEstate"))}
                        variant="outline"
                        size="sm"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedLease && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-4">Pay Rent</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Property</label>
                  <p className="text-white font-semibold">{selectedLease.property_address}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Amount</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPaymentModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => payRentMutation.mutate({ 
                      leaseId: selectedLease.id, 
                      amount: paymentAmount 
                    })}
                    disabled={payRentMutation.isPending || !paymentAmount}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {payRentMutation.isPending ? 'Processing...' : 'Pay Now'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maintenance Request Modal */}
      <AnimatePresence>
        {showMaintenanceModal && maintenanceLeaseId && (
          <MaintenanceRequestModal
            lease={leases.find(l => l.id === maintenanceLeaseId)}
            onClose={() => {
              setShowMaintenanceModal(false);
              setMaintenanceLeaseId(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}