import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, X, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function ServiceVariationsManager({ variations = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newVariation, setNewVariation] = useState({
    name: "",
    price_modifier: 0,
    description: ""
  });

  const addVariation = () => {
    if (!newVariation.name) {
      toast.error("Enter variation name");
      return;
    }
    onChange([...variations, { ...newVariation, id: Date.now() }]);
    setNewVariation({ name: "", price_modifier: 0, description: "" });
    setShowAdd(false);
  };

  const removeVariation = (id) => {
    onChange(variations.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-white font-medium">Service Variations</label>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          variant="outline"
          className="bg-white/5"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Variation
        </Button>
      </div>

      {variations.map((variation) => (
        <Card key={variation.id} className="bg-white/5 border-white/10 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-white font-medium">{variation.name}</h4>
              <p className="text-gray-400 text-sm">{variation.description}</p>
              <p className="text-purple-400 text-sm font-semibold mt-1">
                {variation.price_modifier >= 0 ? '+' : ''}{variation.price_modifier}%
              </p>
            </div>
            <button
              onClick={() => removeVariation(variation.id)}
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
            placeholder="Variation name (e.g., Express Service)"
            value={newVariation.name}
            onChange={(e) => setNewVariation({...newVariation, name: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />
          <Input
            placeholder="Description"
            value={newVariation.description}
            onChange={(e) => setNewVariation({...newVariation, description: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />
          <Input
            type="number"
            placeholder="Price modifier % (e.g., +20 or -10)"
            value={newVariation.price_modifier}
            onChange={(e) => setNewVariation({...newVariation, price_modifier: Number(e.target.value)})}
            className="bg-white/10 border-white/20 text-white"
          />
          <div className="flex gap-2">
            <Button onClick={addVariation} className="flex-1 bg-green-600 hover:bg-green-700">
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