import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Armchair, Plus, X, Grid3x3 } from "lucide-react";
import { toast } from "sonner";

export default function SeatingChartManager({ zones, onChange }) {
  const [newZone, setNewZone] = useState({
    zone_name: "",
    zone_type: "general",
    capacity: 0,
    price: 0,
    seats: []
  });

  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null);
  const [seatGenerator, setSeatGenerator] = useState({ rows: 0, seatsPerRow: 0, startRow: "A" });

  const addZone = () => {
    if (!newZone.zone_name || newZone.capacity <= 0 || newZone.price < 0) {
      toast.error('Please fill in all zone details');
      return;
    }

    onChange([...(zones || []), newZone]);
    setNewZone({
      zone_name: "",
      zone_type: "general",
      capacity: 0,
      price: 0,
      seats: []
    });
    toast.success('Zone added');
  };

  const removeZone = (index) => {
    onChange(zones.filter((_, i) => i !== index));
    toast.success('Zone removed');
  };

  const generateSeats = (zoneIndex) => {
    const zone = zones[zoneIndex];
    const { rows, seatsPerRow, startRow } = seatGenerator;
    
    if (rows <= 0 || seatsPerRow <= 0) {
      toast.error('Invalid seat configuration');
      return;
    }

    const generatedSeats = [];
    const startCharCode = startRow.charCodeAt(0);

    for (let r = 0; r < rows; r++) {
      const rowLetter = String.fromCharCode(startCharCode + r);
      for (let s = 1; s <= seatsPerRow; s++) {
        generatedSeats.push({
          row: rowLetter,
          number: String(s),
          status: "available"
        });
      }
    }

    const updatedZones = [...zones];
    updatedZones[zoneIndex] = {
      ...zone,
      seats: generatedSeats,
      capacity: generatedSeats.length
    };
    onChange(updatedZones);
    toast.success(`Generated ${generatedSeats.length} seats`);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Armchair className="w-5 h-5" />
          Seating Chart & Zones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">Add New Zone</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="Zone Name (e.g., VIP Section A)"
              value={newZone.zone_name}
              onChange={(e) => setNewZone({ ...newZone, zone_name: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Select value={newZone.zone_type} onValueChange={(v) => setNewZone({ ...newZone, zone_type: v })}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Admission</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="standing">Standing Room</SelectItem>
                <SelectItem value="table">Table Seating</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Capacity"
              value={newZone.capacity || ""}
              onChange={(e) => setNewZone({ ...newZone, capacity: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              type="number"
              placeholder="Price per ticket"
              value={newZone.price || ""}
              onChange={(e) => setNewZone({ ...newZone, price: Number(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <Button onClick={addZone} className="w-full bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
        </div>

        {zones?.length > 0 && (
          <div className="space-y-3">
            {zones.map((zone, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-bold">{zone.zone_name}</h4>
                    <div className="flex gap-3 text-sm text-gray-400 mt-1">
                      <span>{zone.zone_type}</span>
                      <span>•</span>
                      <span>{zone.capacity} capacity</span>
                      <span>•</span>
                      <span>${zone.price} each</span>
                      {zone.seats?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{zone.seats.length} seats mapped</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeZone(idx)}>
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>

                {selectedZoneIndex === idx ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-3">
                    <p className="text-blue-300 text-sm font-semibold mb-2">Generate Seat Map</p>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <Input
                        type="number"
                        placeholder="Rows"
                        value={seatGenerator.rows || ""}
                        onChange={(e) => setSeatGenerator({ ...seatGenerator, rows: Number(e.target.value) })}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Seats/Row"
                        value={seatGenerator.seatsPerRow || ""}
                        onChange={(e) => setSeatGenerator({ ...seatGenerator, seatsPerRow: Number(e.target.value) })}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                      <Input
                        placeholder="Start Row"
                        value={seatGenerator.startRow}
                        onChange={(e) => setSeatGenerator({ ...seatGenerator, startRow: e.target.value.toUpperCase() })}
                        maxLength={1}
                        className="bg-white/10 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => generateSeats(idx)} size="sm" className="flex-1 bg-green-600">
                        <Grid3x3 className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                      <Button onClick={() => setSelectedZoneIndex(null)} size="sm" variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setSelectedZoneIndex(idx)} size="sm" variant="outline" className="w-full mt-2">
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    {zone.seats?.length > 0 ? 'Regenerate Seats' : 'Generate Seat Map'}
                  </Button>
                )}

                {zone.seats?.length > 0 && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg max-h-32 overflow-auto">
                    <p className="text-gray-400 text-xs mb-2">Seat Preview:</p>
                    <div className="flex flex-wrap gap-1">
                      {zone.seats.slice(0, 50).map((seat, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-500/20 rounded text-green-300 text-xs">
                          {seat.row}{seat.number}
                        </span>
                      ))}
                      {zone.seats.length > 50 && (
                        <span className="px-2 py-0.5 text-gray-400 text-xs">
                          +{zone.seats.length - 50} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}