import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ChevronLeft, Home, DollarSign, FileText, MessageCircle,
  Calendar, Check, X, AlertCircle, Clock, Bell, Download,
  Upload, Users, Settings, TrendingUp, Mail, Wrench, Image, 
  Pen, FolderOpen, CheckCircle, BarChart3, Activity, Edit, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaintenanceRequestModal from "../components/realestate/MaintenanceRequestModal";
import PropertyAnalytics from "../components/realestate/PropertyAnalytics";
import LeaseCreationModal from "../components/realestate/LeaseCreationModal";
import DigitalSignatureModal from "../components/realestate/DigitalSignatureModal";
import DocumentStorage from "../components/realestate/DocumentStorage";
import LeaseEscalationModal from "../components/realestate/LeaseEscalationModal";

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
  const [showLeaseCreation, setShowLeaseCreation] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedLeaseForSigning, setSelectedLeaseForSigning] = useState(null);
  const [viewingDocuments, setViewingDocuments] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [landlordNotes, setLandlordNotes] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [escalatingLease, setEscalatingLease] = useState(null);

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

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.MaintenanceRequest.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast.success('Request updated successfully');
      setEditingRequest(null);
      setLandlordNotes("");
      setEstimatedCost("");
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
                <p className="text-gray-400 mb-4">No leases found</p>
                {properties.length > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedProperty(properties[0]);
                      setShowLeaseCreation(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Lease Agreement
                  </Button>
                )}
              </div>
            ) : (
              leases.map(lease => (
                <div key={lease.id} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{lease.property_address}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                        <span>Start: {new Date(lease.lease_start_date).toLocaleDateString()}</span>
                        <span>End: {new Date(lease.lease_end_date).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Signature Status */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className={`flex items-center gap-1 text-xs ${lease.landlord_signed ? 'text-green-400' : 'text-gray-400'}`}>
                          {lease.landlord_signed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>Landlord {lease.landlord_signed ? 'Signed' : 'Pending'}</span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${lease.tenant_signed ? 'text-green-400' : 'text-gray-400'}`}>
                          {lease.tenant_signed ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>Tenant {lease.tenant_signed ? 'Signed' : 'Pending'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                      lease.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      lease.status === 'expiring_soon' ? 'bg-yellow-500/20 text-yellow-400' :
                      lease.status === 'pending_signatures' ? 'bg-blue-500/20 text-blue-400' :
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
                    <div className="flex items-end gap-2 flex-wrap">
                      {!lease.landlord_signed || !lease.tenant_signed ? (
                        <Button
                          onClick={() => {
                            setSelectedLeaseForSigning(lease);
                            setShowSignatureModal(true);
                          }}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Pen className="w-4 h-4 mr-2" />
                          {lease.landlord_email === currentUser.email && !lease.landlord_signed ? 'Sign Lease' :
                           lease.tenant_email === currentUser.email && !lease.tenant_signed ? 'Sign Lease' : 'View Signatures'}
                        </Button>
                      ) : null}
                      
                      {/* Escalation button for landlords */}
                      {lease.landlord_email === currentUser.email && lease.status === 'active' && (
                        <Button
                          onClick={() => setEscalatingLease(lease)}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Escalate Issue
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => setViewingDocuments(lease)}
                        variant="outline"
                        size="sm"
                        className="border-purple-500 text-purple-400"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Documents
                      </Button>
                      
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

                  {/* Progress Tracker for Tenants */}
                  {request.tenant_email === currentUser?.email && (
                    <div className="mb-4 p-4 bg-white/5 rounded-xl">
                      <p className="text-gray-400 text-xs mb-3">Request Progress</p>
                      <div className="flex items-center justify-between relative">
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
                        <div 
                          className="absolute top-4 left-0 h-0.5 bg-emerald-500 transition-all duration-500"
                          style={{
                            width: request.status === 'submitted' ? '0%' :
                                   request.status === 'acknowledged' ? '33%' :
                                   request.status === 'in_progress' ? '66%' :
                                   request.status === 'completed' ? '100%' : '0%'
                          }}
                        />
                        {['submitted', 'acknowledged', 'in_progress', 'completed'].map((step, idx) => (
                          <div key={step} className="flex flex-col items-center relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              request.status === step || 
                              (step === 'acknowledged' && ['in_progress', 'completed'].includes(request.status)) ||
                              (step === 'in_progress' && request.status === 'completed')
                                ? 'bg-emerald-500 border-emerald-500' 
                                : 'bg-gray-800 border-white/20'
                            }`}>
                              {(request.status === step || 
                                (step === 'acknowledged' && ['in_progress', 'completed'].includes(request.status)) ||
                                (step === 'in_progress' && request.status === 'completed')) && (
                                <CheckCircle className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 text-center max-w-[60px]">
                              {step.replace('_', ' ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      <p className="text-gray-400 text-xs mb-2">Photos ({request.photos.length})</p>
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
                    <div className="p-3 bg-white/5 rounded-xl mb-3">
                      <p className="text-gray-400 text-xs mb-1">Landlord Notes</p>
                      <p className="text-white text-sm">{request.landlord_notes}</p>
                    </div>
                  )}

                  {/* Landlord Actions */}
                  {request.landlord_email === currentUser?.email && editingRequest?.id !== request.id && (
                    <Button
                      onClick={() => {
                        setEditingRequest(request);
                        setLandlordNotes(request.landlord_notes || "");
                        setEstimatedCost(request.estimated_cost?.toString() || "");
                      }}
                      variant="outline"
                      size="sm"
                      className="border-blue-500 text-blue-400"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {request.landlord_notes ? 'Edit Notes & Cost' : 'Add Notes & Cost'}
                    </Button>
                  )}

                  {/* Edit Form for Landlords */}
                  {request.landlord_email === currentUser?.email && editingRequest?.id === request.id && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl space-y-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Landlord Notes</label>
                        <Textarea
                          value={landlordNotes}
                          onChange={(e) => setLandlordNotes(e.target.value)}
                          placeholder="Add notes about the repair, contractor details, etc."
                          className="bg-white/10 border-white/20 text-white"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Estimated Cost ($)</label>
                        <Input
                          type="number"
                          value={estimatedCost}
                          onChange={(e) => setEstimatedCost(e.target.value)}
                          placeholder="Enter estimated repair cost"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Status</label>
                        <Select
                          value={request.status}
                          onValueChange={(value) => {
                            updateRequestMutation.mutate({
                              id: request.id,
                              data: {
                                status: value,
                                landlord_notes: landlordNotes,
                                estimated_cost: estimatedCost ? Number(estimatedCost) : null
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="acknowledged">Acknowledged</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setEditingRequest(null);
                            setLandlordNotes("");
                            setEstimatedCost("");
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            updateRequestMutation.mutate({
                              id: request.id,
                              data: {
                                landlord_notes: landlordNotes,
                                estimated_cost: estimatedCost ? Number(estimatedCost) : null
                              }
                            });
                          }}
                          disabled={updateRequestMutation.isPending}
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          {updateRequestMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <h3 className="text-xl font-bold text-white">My Properties</h3>
              <div className="flex gap-2">
                {properties.length > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedProperty(properties[0]);
                      setShowLeaseCreation(true);
                    }}
                    variant="outline"
                    className="border-blue-500 text-blue-400"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Create Lease
                  </Button>
                )}
                <Button
                  onClick={() => navigate(createPageUrl("RealEstate"))}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  List New Property
                </Button>
              </div>
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
              <div className="space-y-6">
                {properties.map(property => {
                  const propertyLeases = leases.filter(l => l.property_id === property.id);
                  const activeLeases = propertyLeases.filter(l => l.status === 'active');
                  const occupancyRate = property.listing_type === 'for_rent' && activeLeases.length > 0 ? 100 : 0;
                  
                  const propertyPayments = payments.filter(p => p.property_id === property.id);
                  const last6Months = Array.from({length: 6}, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    return date;
                  }).reverse();
                  
                  const monthlyData = last6Months.map(month => {
                    const monthPayments = propertyPayments.filter(p => {
                      const paymentDate = new Date(p.payment_date);
                      return paymentDate.getMonth() === month.getMonth() && 
                             paymentDate.getFullYear() === month.getFullYear();
                    });
                    return {
                      month: month.toLocaleDateString('en-US', { month: 'short' }),
                      amount: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                    };
                  });
                  
                  const avgMonthlyRent = propertyPayments.length > 0 
                    ? propertyPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / Math.max(propertyPayments.length, 1)
                    : property.price_per_month || 0;
                  
                  const propertyMaintenance = maintenanceRequests.filter(r => r.property_id === property.id && r.status !== 'completed');
                  
                  return (
                    <div key={property.id} className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <div className="grid md:grid-cols-3 gap-6 mb-6">
                        <div className="relative h-48 rounded-xl overflow-hidden">
                          <img 
                            src={property.main_image} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-xl font-bold text-white mb-2">{property.title}</h4>
                          <p className="text-gray-400 text-sm mb-4">{property.location}</p>
                          
                          {/* Analytics Cards */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl border border-emerald-500/30">
                              <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                <p className="text-gray-400 text-xs">Occupancy</p>
                              </div>
                              <p className="text-2xl font-bold text-white">{occupancyRate}%</p>
                            </div>
                            
                            <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/30">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-blue-400" />
                                <p className="text-gray-400 text-xs">Avg Rent</p>
                              </div>
                              <p className="text-2xl font-bold text-white">${Math.round(avgMonthlyRent).toLocaleString()}</p>
                            </div>
                            
                            <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl border border-orange-500/30">
                              <div className="flex items-center gap-2 mb-1">
                                <Wrench className="w-4 h-4 text-orange-400" />
                                <p className="text-gray-400 text-xs">Active Issues</p>
                              </div>
                              <p className="text-2xl font-bold text-white">{propertyMaintenance.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rent Collection Trend Chart */}
                      <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="w-5 h-5 text-emerald-400" />
                          <h5 className="text-white font-semibold">6-Month Rent Collection</h5>
                        </div>
                        <div className="flex items-end justify-between gap-2 h-32">
                          {monthlyData.map((data, idx) => {
                            const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1);
                            const heightPercent = (data.amount / maxAmount) * 100;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                                  <div 
                                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg relative group cursor-pointer"
                                    style={{ height: `${heightPercent}%`, minHeight: data.amount > 0 ? '4px' : '0' }}
                                  >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                      ${data.amount.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-gray-400 text-[10px]">{data.month}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
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
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
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

      {/* Lease Creation Modal */}
      <AnimatePresence>
        {showLeaseCreation && selectedProperty && (
          <LeaseCreationModal
            property={selectedProperty}
            onClose={() => {
              setShowLeaseCreation(false);
              setSelectedProperty(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['leases'] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Digital Signature Modal */}
      <AnimatePresence>
        {showSignatureModal && selectedLeaseForSigning && (
          <DigitalSignatureModal
            lease={selectedLeaseForSigning}
            currentUser={currentUser}
            onClose={() => {
              setShowSignatureModal(false);
              setSelectedLeaseForSigning(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['leases'] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Lease Escalation Modal */}
      <AnimatePresence>
        {escalatingLease && (
          <LeaseEscalationModal
            lease={escalatingLease}
            onClose={() => setEscalatingLease(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['leases'] });
              setEscalatingLease(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Document Storage Modal */}
      <AnimatePresence>
        {viewingDocuments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
            onClick={() => setViewingDocuments(null)}
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
                  <h2 className="text-2xl font-bold text-white">Property Documents</h2>
                  <p className="text-gray-400 text-sm">{viewingDocuments.property_address}</p>
                </div>
                <button onClick={() => setViewingDocuments(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <DocumentStorage 
                  propertyId={viewingDocuments.property_id} 
                  leaseId={viewingDocuments.id}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}