import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AvailabilityOverridesManager({ serviceId, providerEmail }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newOverride, setNewOverride] = useState({
    override_type: "temporary_closure",
    start_date: "",
    end_date: "",
    special_start_time: "",
    special_end_time: "",
    reason: ""
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['service-overrides', serviceId],
    queryFn: () => base44.entities.ServiceAvailabilityOverride.filter({ 
      service_id: serviceId,
      is_active: true 
    }),
    enabled: !!serviceId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceAvailabilityOverride.create({
      ...data,
      service_id: serviceId,
      provider_email: providerEmail
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-overrides', serviceId] });
      setShowAdd(false);
      setNewOverride({
        override_type: "temporary_closure",
        start_date: "",
        end_date: "",
        special_start_time: "",
        special_end_time: "",
        reason: ""
      });
      toast.success("Override added!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceAvailabilityOverride.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-overrides', serviceId] });
      toast.success("Override removed");
    }
  });

  const typeLabels = {
    temporary_closure: "Closed",
    special_hours: "Special Hours",
    holiday_hours: "Holiday Hours",
    limited_capacity: "Limited Capacity"
  };

  const typeColors = {
    temporary_closure: "bg-red-500/20 text-red-300",
    special_hours: "bg-blue-500/20 text-blue-300",
    holiday_hours: "bg-purple-500/20 text-purple-300",
    limited_capacity: "bg-yellow-500/20 text-yellow-300"
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-white font-medium">Availability Overrides</label>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          variant="outline"
          className="bg-white/5"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Override
        </Button>
      </div>

      {overrides.map((override) => (
        <Card key={override.id} className="bg-white/5 border-white/10 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={typeColors[override.override_type]}>
                  {typeLabels[override.override_type]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Calendar className="w-3 h-3" />
                {new Date(override.start_date).toLocaleDateString()} - {new Date(override.end_date).toLocaleDateString()}
              </div>
              {override.special_start_time && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Clock className="w-3 h-3" />
                  {override.special_start_time} - {override.special_end_time}
                </div>
              )}
              {override.reason && (
                <p className="text-gray-400 text-sm mt-1">{override.reason}</p>
              )}
            </div>
            <button
              onClick={() => deleteMutation.mutate(override.id)}
              className="p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </Card>
      ))}

      {showAdd && (
        <Card className="bg-white/10 border-white/20 p-4 space-y-3">
          <Select
            value={newOverride.override_type}
            onValueChange={(v) => setNewOverride({...newOverride, override_type: v})}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temporary_closure">Temporary Closure</SelectItem>
              <SelectItem value="special_hours">Special Hours</SelectItem>
              <SelectItem value="holiday_hours">Holiday Hours</SelectItem>
              <SelectItem value="limited_capacity">Limited Capacity</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
              <Input
                type="date"
                value={newOverride.start_date}
                onChange={(e) => setNewOverride({...newOverride, start_date: e.target.value})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">End Date</label>
              <Input
                type="date"
                value={newOverride.end_date}
                onChange={(e) => setNewOverride({...newOverride, end_date: e.target.value})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {newOverride.override_type === "special_hours" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={newOverride.special_start_time}
                  onChange={(e) => setNewOverride({...newOverride, special_start_time: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={newOverride.special_end_time}
                  onChange={(e) => setNewOverride({...newOverride, special_end_time: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          )}

          <Input
            placeholder="Reason (optional)"
            value={newOverride.reason}
            onChange={(e) => setNewOverride({...newOverride, reason: e.target.value})}
            className="bg-white/10 border-white/20 text-white"
          />

          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate(newOverride)} className="flex-1 bg-green-600 hover:bg-green-700">
              Save Override
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