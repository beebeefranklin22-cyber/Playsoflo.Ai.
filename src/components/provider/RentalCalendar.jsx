import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, X, Plus } from "lucide-react";

export default function RentalCalendar({ blockedDates = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newBlock, setNewBlock] = useState({
    start_date: "",
    end_date: "",
    reason: ""
  });

  const addBlockedDate = () => {
    if (!newBlock.start_date || !newBlock.end_date) {
      return;
    }
    onChange([...blockedDates, { ...newBlock, id: Date.now() }]);
    setNewBlock({ start_date: "", end_date: "", reason: "" });
    setShowAdd(false);
  };

  const removeBlockedDate = (id) => {
    onChange(blockedDates.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          <label className="text-white font-medium">Blocked Dates</label>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          variant="outline"
          className="bg-white/5"
        >
          <Plus className="w-4 h-4 mr-1" />
          Block Dates
        </Button>
      </div>

      {blockedDates.map((block) => (
        <Card key={block.id} className="bg-white/5 border-white/10 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-red-500/20 text-red-300">
                  Unavailable
                </Badge>
              </div>
              <p className="text-white text-sm">
                {new Date(block.start_date).toLocaleDateString()} - {new Date(block.end_date).toLocaleDateString()}
              </p>
              {block.reason && (
                <p className="text-gray-400 text-xs mt-1">{block.reason}</p>
              )}
            </div>
            <button
              onClick={() => removeBlockedDate(block.id)}
              className="p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </Card>
      ))}

      {showAdd && (
        <Card className="bg-white/10 border-white/20 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
              <Input
                type="date"
                value={newBlock.start_date}
                onChange={(e) => setNewBlock({...newBlock, start_date: e.target.value})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">End Date</label>
              <Input
                type="date"
                value={newBlock.end_date}
                onChange={(e) => setNewBlock({...newBlock, end_date: e.target.value})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <Input
            placeholder="Reason (e.g., Maintenance, Personal use)"
            value={newBlock.reason}
            onChange={(e) => setNewBlock({...newBlock, reason: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />

          <div className="flex gap-2">
            <Button onClick={addBlockedDate} className="flex-1 bg-red-600 hover:bg-red-700">
              Block Dates
            </Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {blockedDates.length === 0 && !showAdd && (
        <p className="text-gray-500 text-sm text-center py-4">
          No blocked dates. Your rental is available year-round.
        </p>
      )}
    </div>
  );
}