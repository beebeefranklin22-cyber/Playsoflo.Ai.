import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wallet, Building2, PlugZap, Droplets, Wifi, Phone, Landmark } from "lucide-react";

export default function Utilities() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({
    queryKey: ["utility-accounts"],
    queryFn: () => base44.entities.UtilityAccount.list(),
    initialData: []
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list(),
    initialData: []
  });

  const [newAcc, setNewAcc] = React.useState({
    provider_name: "",
    account_type: "electric",
    account_number: "",
    address: "",
    balance_due: 0
  });

  const [newAsset, setNewAsset] = React.useState({
    asset_type: "property",
    name: "",
    value_usd: 0,
    image_url: ""
  });

  const createAcc = useMutation({
    mutationFn: (data) => base44.entities.UtilityAccount.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["utility-accounts"] }); setNewAcc({ provider_name: "", account_type: "electric", account_number: "", address: "", balance_due: 0 }); }
  });

  const createAsset = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); setNewAsset({ asset_type: "property", name: "", value_usd: 0, image_url: "" }); }
  });

  const payMutation = useMutation({
    mutationFn: ({ account }) => base44.entities.Payment.create({
      amount_usd: account.balance_due,
      method: "rri",
      status: "completed",
      reference_type: "utility",
      reference_id: String(account.id),
      memo: `Utility payment to ${account.provider_name}`
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["utility-accounts"] })
  });

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-7 h-7 text-cyan-400" />
        <h1 className="text-3xl font-bold text-white">Utilities & Assets</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Add Utility Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Provider name" value={newAcc.provider_name} onChange={(e) => setNewAcc({ ...newAcc, provider_name: e.target.value })} />
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Account number" value={newAcc.account_number} onChange={(e) => setNewAcc({ ...newAcc, account_number: e.target.value })} />
              <Input placeholder="Service address" value={newAcc.address} onChange={(e) => setNewAcc({ ...newAcc, address: e.target.value })} />
              <Input type="number" placeholder="Balance due (USD)" value={newAcc.balance_due} onChange={(e) => setNewAcc({ ...newAcc, balance_due: Number(e.target.value) })} />
              <Input type="date" placeholder="Due date" onChange={(e) => setNewAcc({ ...newAcc, due_date: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => createAcc.mutate(newAcc)}>Save Account</Button>
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
              <Input placeholder="Name / Title" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} />
              <Input type="number" placeholder="Value (USD)" value={newAsset.value_usd} onChange={(e) => setNewAsset({ ...newAsset, value_usd: Number(e.target.value) })} />
              <Input placeholder="Image URL" value={newAsset.image_url} onChange={(e) => setNewAsset({ ...newAsset, image_url: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => createAsset.mutate(newAsset)}>Save Asset</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold text-white mt-8 mb-3">Your Utility Accounts</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map(acc => (
          <Card key={acc.id} className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {acc.account_type === "electric" && <PlugZap className="w-5 h-5 text-yellow-400" />}
                {acc.account_type === "water" && <Droplets className="w-5 h-5 text-cyan-400" />}
                {acc.account_type === "internet" && <Wifi className="w-5 h-5 text-purple-400" />}
                {acc.account_type === "mobile" && <Phone className="w-5 h-5 text-green-400" />}
                {acc.account_type === "rent" && <Building2 className="w-5 h-5 text-pink-400" />}
                {acc.account_type === "insurance" && <Landmark className="w-5 h-5 text-blue-400" />}
                {acc.provider_name} • {acc.account_type}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-gray-300">
                <div>Due: ${acc.balance_due?.toFixed(2) || 0}</div>
                {acc.due_date && <div className="text-sm text-gray-400">by {new Date(acc.due_date).toLocaleDateString()}</div>}
              </div>
              <Button disabled={!acc.balance_due || acc.balance_due <= 0} onClick={() => payMutation.mutate({ account: acc })}>
                Pay with RRI
              </Button>
            </CardContent>
          </Card>
        ))}
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