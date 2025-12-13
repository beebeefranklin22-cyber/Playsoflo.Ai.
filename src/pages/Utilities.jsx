import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Wallet, Building2, PlugZap, Droplets, Wifi, Phone, Landmark, 
  Clock, CheckCircle, AlertCircle, Loader2, Bell, Calendar, Zap 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Utilities() {
  const qc = useQueryClient();
  
  const { data: accounts = [] } = useQuery({
    queryKey: ["utility-accounts"],
    queryFn: () => base44.entities.UtilityAccount.list(),
  });
  
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: billPayments = [] } = useQuery({
    queryKey: ['bill-payments'],
    queryFn: () => base44.entities.BillPayment.list('-created_date', 50),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [newAcc, setNewAcc] = useState({
    provider_name: "",
    service_name: "",
    account_type: "electric",
    account_number: "",
    address: "",
    amount_due: 0,
    next_due_date: "",
    auto_pay_enabled: false,
    is_recurring: true,
    recurrence_interval: "monthly"
  });

  const [newAsset, setNewAsset] = useState({
    asset_type: "property",
    name: "",
    value_usd: 0,
    image_url: ""
  });

  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const createAcc = useMutation({
    mutationFn: (data) => base44.entities.UtilityAccount.create(data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["utility-accounts"] }); 
      setNewAcc({ 
        provider_name: "", 
        service_name: "",
        account_type: "electric", 
        account_number: "", 
        address: "", 
        amount_due: 0,
        next_due_date: "",
        auto_pay_enabled: false,
        is_recurring: true,
        recurrence_interval: "monthly"
      });
      toast.success('Utility account added');
    }
  });

  const createAsset = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["assets"] }); 
      setNewAsset({ asset_type: "property", name: "", value_usd: 0, image_url: "" }); 
      toast.success('Asset added');
    }
  });

  const updateUtilityMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UtilityAccount.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utility-accounts'] });
      toast.success('Settings updated');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ utility_account_id, payment_method }) => {
      const response = await base44.functions.invoke('payUtilityBill', {
        utility_account_id,
        payment_method: payment_method || 'wallet_balance'
      });
      return response.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['utility-accounts'] });
      qc.invalidateQueries({ queryKey: ['bill-payments'] });
      qc.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(`Payment successful! Confirmation: ${data.confirmation_number}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Payment failed');
    },
  });

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusColor = (days) => {
    if (days === null) return 'gray';
    if (days < 0) return 'red';
    if (days <= 3) return 'orange';
    return 'green';
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-7 h-7 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">Utilities & Assets</h1>
        </div>
        <Button
          onClick={() => setShowPaymentHistory(!showPaymentHistory)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white"
        >
          <Clock className="w-4 h-4 mr-2" />
          {showPaymentHistory ? 'Hide' : 'Show'} Payment History
        </Button>
      </div>

      {/* Payment History */}
      <AnimatePresence>
        {showPaymentHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {billPayments.length > 0 ? billPayments.map((payment) => {
                    const account = accounts.find(a => a.id === payment.utility_account_id);
                    return (
                      <div key={payment.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {payment.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : payment.status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-400" />
                          )}
                          <div>
                            <p className="text-white font-semibold">
                              {account?.service_name || account?.provider_name || 'Unknown'}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {new Date(payment.payment_date).toLocaleDateString()}
                              {payment.is_automatic && ' • Auto-pay'}
                            </p>
                            {payment.confirmation_number && (
                              <p className="text-gray-500 text-xs">#{payment.confirmation_number}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">${payment.amount.toFixed(2)}</p>
                          <p className={`text-xs capitalize ${
                            payment.status === 'completed' ? 'text-green-400' :
                            payment.status === 'failed' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {payment.status}
                          </p>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-gray-400 text-center py-8">No payment history yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Add Utility Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input 
                placeholder="Provider (e.g., FPL)" 
                value={newAcc.provider_name} 
                onChange={(e) => setNewAcc({ ...newAcc, provider_name: e.target.value })} 
              />
              <Input 
                placeholder="Service Name (e.g., Home Electric)" 
                value={newAcc.service_name} 
                onChange={(e) => setNewAcc({ ...newAcc, service_name: e.target.value })} 
              />
              <Select value={newAcc.account_type} onValueChange={(v) => setNewAcc({ ...newAcc, account_type: v })}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="internet">Internet</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="cable">Cable/TV</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder="Account number" 
                value={newAcc.account_number} 
                onChange={(e) => setNewAcc({ ...newAcc, account_number: e.target.value })} 
              />
              <Input 
                type="number" 
                placeholder="Amount Due" 
                value={newAcc.amount_due} 
                onChange={(e) => setNewAcc({ ...newAcc, amount_due: parseFloat(e.target.value) || 0 })} 
              />
              <Input 
                type="date" 
                placeholder="Next Due Date" 
                onChange={(e) => setNewAcc({ ...newAcc, next_due_date: e.target.value ? new Date(e.target.value).toISOString() : '' })} 
              />
              <Select value={newAcc.recurrence_interval} onValueChange={(v) => setNewAcc({ ...newAcc, recurrence_interval: v })}>
                <SelectTrigger><SelectValue placeholder="Recurrence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button 
                className="bg-cyan-600 hover:bg-cyan-700" 
                onClick={() => createAcc.mutate(newAcc)}
                disabled={!newAcc.provider_name || createAcc.isPending}
              >
                {createAcc.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Account
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Add Asset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Select value={newAsset.asset_type} onValueChange={(v) => setNewAsset({ ...newAsset, asset_type: v })}>
                <SelectTrigger><SelectValue placeholder="Asset type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="collectible">Collectible</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder="Name / Title" 
                value={newAsset.name} 
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} 
              />
              <Input 
                type="number" 
                placeholder="Value (USD)" 
                value={newAsset.value_usd} 
                onChange={(e) => setNewAsset({ ...newAsset, value_usd: Number(e.target.value) })} 
              />
              <Input 
                placeholder="Image URL" 
                value={newAsset.image_url} 
                onChange={(e) => setNewAsset({ ...newAsset, image_url: e.target.value })} 
              />
            </div>
            <div className="flex justify-end">
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => createAsset.mutate(newAsset)}>
                Save Asset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold text-white mt-8 mb-3">Your Utility Accounts</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {accounts.map(acc => {
          const daysUntilDue = getDaysUntilDue(acc.next_due_date);
          const statusColor = getStatusColor(daysUntilDue);
          const amountDue = acc.amount_due || 0;

          return (
            <Card key={acc.id} className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    {acc.account_type === "electric" && <PlugZap className="w-5 h-5 text-yellow-400" />}
                    {acc.account_type === "water" && <Droplets className="w-5 h-5 text-cyan-400" />}
                    {acc.account_type === "internet" && <Wifi className="w-5 h-5 text-purple-400" />}
                    {acc.account_type === "mobile" && <Phone className="w-5 h-5 text-green-400" />}
                    {acc.account_type === "rent" && <Building2 className="w-5 h-5 text-pink-400" />}
                    {acc.account_type === "insurance" && <Landmark className="w-5 h-5 text-blue-400" />}
                    {acc.service_name || acc.provider_name}
                  </CardTitle>
                  {acc.auto_pay_enabled && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Auto-pay
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm capitalize">{acc.account_type}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Amount Due</span>
                    <span className="text-white font-bold text-lg">${amountDue.toFixed(2)}</span>
                  </div>
                  {acc.next_due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Due Date</span>
                      <span className={`text-${statusColor}-400 text-sm flex items-center gap-1`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(acc.next_due_date).toLocaleDateString()}
                        {daysUntilDue !== null && (
                          <span className="ml-1">
                            ({daysUntilDue < 0 ? 'Overdue' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white text-sm">Auto-pay from Wallet</span>
                  </div>
                  <Switch
                    checked={acc.auto_pay_enabled}
                    onCheckedChange={(checked) => {
                      if (checked && amountDue > (currentUser?.usd_balance || 0)) {
                        toast.error('Insufficient wallet balance for auto-pay');
                        return;
                      }
                      updateUtilityMutation.mutate({
                        id: acc.id,
                        data: { 
                          auto_pay_enabled: checked,
                          auto_pay_method: 'wallet_balance'
                        }
                      });
                    }}
                  />
                </div>

                {amountDue > 0 ? (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      if (amountDue > (currentUser?.usd_balance || 0)) {
                        toast.error(`Insufficient balance. Need $${amountDue.toFixed(2)}, have $${(currentUser?.usd_balance || 0).toFixed(2)}`);
                        return;
                      }
                      paymentMutation.mutate({ 
                        utility_account_id: acc.id,
                        payment_method: 'wallet_balance'
                      });
                    }}
                    disabled={paymentMutation.isPending}
                  >
                    {paymentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wallet className="w-4 h-4 mr-2" />
                    )}
                    Pay ${amountDue.toFixed(2)}
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2">
                    <CheckCircle className="w-4 h-4" />
                    Paid - Next due {acc.next_due_date && new Date(acc.next_due_date).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="text-2xl font-bold text-white mt-8 mb-3">Your Assets</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {assets.map(a => (
          <Card key={a.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              {a.image_url && <img src={a.image_url} alt={a.name} className="w-full h-36 object-cover rounded-lg mb-3" />}
              <div className="text-white font-semibold">{a.name}</div>
              <div className="text-gray-300 text-sm capitalize">{a.asset_type}</div>
              {a.value_usd && <div className="text-white mt-1">${a.value_usd?.toLocaleString()}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}