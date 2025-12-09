import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function ServiceAddOnsManager({ addOns = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newAddOn, setNewAddOn] = useState({
    name: "",
    price: 0,
    description: ""
  });

  const addAddOn = () => {
    if (!newAddOn.name || newAddOn.price <= 0) {
      toast.error("Enter add-on name and price");
      return;
    }
    onChange([...addOns, { ...newAddOn, id: Date.now() }]);
    setNewAddOn({ name: "", price: 0, description: "" });
    setShowAdd(false);
  };

  const removeAddOn = (id) => {
    onChange(addOns.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-white font-medium">Available Add-Ons</label>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          variant="outline"
          className="bg-white/5"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Add-On
        </Button>
      </div>

      {addOns.map((addOn) => (
        <Card key={addOn.id} className="bg-white/5 border-white/10 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-white font-medium">{addOn.name}</h4>
              <p className="text-gray-400 text-sm">{addOn.description}</p>
              <p className="text-green-400 text-sm font-semibold mt-1">
                +${addOn.price}
              </p>
            </div>
            <button
              onClick={() => removeAddOn(addOn.id)}
              className="p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </Card>
      ))}

      {showAdd && (
        <Card className="bg-white/10 border-white/20 p-4 space-y-3">
          <Input
            placeholder="Add-on name (e.g., Priority Support)"
            value={newAddOn.name}
            onChange={(e) => setNewAddOn({...newAddOn, name: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />
          <Input
            placeholder="Description"
            value={newAddOn.description}
            onChange={(e) => setNewAddOn({...newAddOn, description: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />
          <Input
            type="number"
            placeholder="Additional price (USD)"
            value={newAddOn.price}
            onChange={(e) => setNewAddOn({...newAddOn, price: Number(e.target.value)})}
            className="bg-white/10 border-white/20 text-white"
          />
          <div className="flex gap-2">
            <Button onClick={addAddOn} className="flex-1 bg-green-600 hover:bg-green-700">
              Add
            </Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}