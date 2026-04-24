import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Truck, MapPin, Package, Save, Settings } from "lucide-react";

const CARRIERS = ["UPS", "FedEx", "USPS", "DHL", "Amazon", "Other"];

export default function StoreFulfillmentSettings({ currentUser }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [fulfillment, setFulfillment] = useState({
    pickup_enabled: true,
    shipping_enabled: true,
    local_delivery_enabled: false,
    pickup_address: "",
    pickup_instructions: "",
    shipping_fee: 0,
    handling_fee: 0,
    free_shipping_threshold: 0,
    accepted_carriers: ["UPS", "FedEx", "USPS", "DHL"],
    local_delivery_radius_miles: 10,
    local_delivery_fee: 5,
  });

  const { data: storeSettingsList = [] } = useQuery({
    queryKey: ["store-settings", currentUser?.email],
    queryFn: () => base44.entities.StoreSettings.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (storeSettingsList.length > 0) {
      const s = storeSettingsList[0];
      setSettings(s);
      if (s.fulfillment_options) {
        setFulfillment({ ...fulfillment, ...s.fulfillment_options });
      }
    }
  }, [storeSettingsList]);

  const toggleCarrier = (carrier) => {
    setFulfillment(f => ({
      ...f,
      accepted_carriers: f.accepted_carriers.includes(carrier)
        ? f.accepted_carriers.filter(c => c !== carrier)
        : [...f.accepted_carriers, carrier],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { fulfillment_options: fulfillment };
    if (settings?.id) {
      await base44.entities.StoreSettings.update(settings.id, data);
    } else {
      await base44.entities.StoreSettings.create({
        owner_email: currentUser.email,
        store_name: currentUser.full_name + "'s Store",
        ...data,
      });
    }
    queryClient.invalidateQueries(["store-settings"]);
    toast.success("Fulfillment settings saved!");
    setSaving(false);
  };

  const toggle = (key) => setFulfillment(f => ({ ...f, [key]: !f[key] }));
  const num = (key, val) => setFulfillment(f => ({ ...f, [key]: parseFloat(val) || 0 }));
  const str = (key, val) => setFulfillment(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Fulfillment Settings</h2>
          <p className="text-gray-400 text-sm">Configure how your customers can receive their orders</p>
        </div>
      </div>

      {/* Pickup */}
      <div className={`rounded-2xl border p-5 space-y-4 transition ${fulfillment.pickup_enabled ? "bg-teal-500/10 border-teal-500/30" : "bg-white/5 border-white/10"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-400" />
            <p className="text-white font-semibold">In-Store Pickup</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={fulfillment.pickup_enabled} onChange={() => toggle("pickup_enabled")} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {fulfillment.pickup_enabled && (
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Pickup Address</label>
              <Input value={fulfillment.pickup_address} onChange={e => str("pickup_address", e.target.value)}
                placeholder="123 Main St, City, State, ZIP"
                className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Pickup Instructions (shown to customer)</label>
              <Input value={fulfillment.pickup_instructions} onChange={e => str("pickup_instructions", e.target.value)}
                placeholder="e.g. Park in rear lot, ring doorbell"
                className="bg-white/10 border-white/20 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Shipping */}
      <div className={`rounded-2xl border p-5 space-y-4 transition ${fulfillment.shipping_enabled ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <p className="text-white font-semibold">Shipping</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={fulfillment.shipping_enabled} onChange={() => toggle("shipping_enabled")} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {fulfillment.shipping_enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Shipping Fee ($)</label>
                <Input type="number" step="0.01" value={fulfillment.shipping_fee} onChange={e => num("shipping_fee", e.target.value)}
                  placeholder="0.00" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Handling Fee ($)</label>
                <Input type="number" step="0.01" value={fulfillment.handling_fee} onChange={e => num("handling_fee", e.target.value)}
                  placeholder="0.00" className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Free Shipping on Orders Over ($, 0 = never free)</label>
              <Input type="number" step="0.01" value={fulfillment.free_shipping_threshold} onChange={e => num("free_shipping_threshold", e.target.value)}
                placeholder="0" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-3 block">Accepted Carriers (customer will choose from these)</label>
              <div className="flex flex-wrap gap-2">
                {CARRIERS.map(c => (
                  <button key={c} onClick={() => toggleCarrier(c)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${fulfillment.accepted_carriers.includes(c) ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/20 text-gray-400 hover:border-blue-500/50"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Local Delivery */}
      <div className={`rounded-2xl border p-5 space-y-4 transition ${fulfillment.local_delivery_enabled ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-white font-semibold">Local Delivery</p>
              <p className="text-gray-500 text-xs">Orders matched with platform drivers who earn their fare</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={fulfillment.local_delivery_enabled} onChange={() => toggle("local_delivery_enabled")} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {fulfillment.local_delivery_enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Delivery Radius (miles)</label>
              <Input type="number" value={fulfillment.local_delivery_radius_miles} onChange={e => num("local_delivery_radius_miles", e.target.value)}
                placeholder="10" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Delivery Fee Charged to Customer ($)</label>
              <Input type="number" step="0.01" value={fulfillment.local_delivery_fee} onChange={e => num("local_delivery_fee", e.target.value)}
                placeholder="5.00" className="bg-white/10 border-white/20 text-white" />
              <p className="text-gray-600 text-xs mt-1">Driver earns 85% = ${(fulfillment.local_delivery_fee * 0.85).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Fulfillment Settings"}
      </Button>
    </div>
  );
}