import React, { useState, useEffect } from "react";
import { MapPin, Home, Briefcase, Star, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SavedAddresses({ onSelectAddress, currentUser }) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "", address: "" });

  useEffect(() => {
    if (currentUser?.saved_addresses) {
      setSavedAddresses(currentUser.saved_addresses);
    }
  }, [currentUser]);

  const saveAddress = async () => {
    if (!newAddress.label || !newAddress.address) {
      toast.error("Please fill in both fields");
      return;
    }

    const updated = [...savedAddresses, { ...newAddress, id: Date.now() }];
    await base44.auth.updateMe({ saved_addresses: updated });
    setSavedAddresses(updated);
    setNewAddress({ label: "", address: "" });
    setShowAdd(false);
    toast.success("Address saved!");
  };

  const deleteAddress = async (id) => {
    const updated = savedAddresses.filter(a => a.id !== id);
    await base44.auth.updateMe({ saved_addresses: updated });
    setSavedAddresses(updated);
    toast.success("Address removed");
  };

  const iconMap = {
    Home: Home,
    Work: Briefcase,
    Favorite: Star
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-sm">Saved Addresses</h4>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-300"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {showAdd && (
        <div className="bg-white/10 rounded-lg p-3 space-y-2 border border-white/20">
          <Input
            placeholder="Label (e.g., Home, Work)"
            value={newAddress.label}
            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
            className="bg-white/10 border-white/20 text-white"
          />
          <Input
            placeholder="Address"
            value={newAddress.address}
            onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
            className="bg-white/10 border-white/20 text-white"
          />
          <div className="flex gap-2">
            <Button onClick={saveAddress} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
              Save
            </Button>
            <Button onClick={() => setShowAdd(false)} size="sm" variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {savedAddresses.map((addr) => {
          const Icon = iconMap[addr.label] || MapPin;
          return (
            <div
              key={addr.id}
              onClick={() => onSelectAddress(addr.address)}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer border border-white/10 flex items-center gap-3 group transition"
            >
              <Icon className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm">{addr.label}</div>
                <div className="text-gray-400 text-xs truncate">{addr.address}</div>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAddress(addr.id);
                }}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}