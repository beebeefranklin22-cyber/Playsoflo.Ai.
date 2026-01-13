import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Plus, X, Clock, Repeat } from "lucide-react";
import { toast } from "sonner";

export default function RecurringEventScheduler({ schedule, onChange }) {
  const [showExceptionPicker, setShowExceptionPicker] = useState(false);
  const [selectedExceptionDate, setSelectedExceptionDate] = useState(null);

  const daysOfWeek = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" }
  ];

  const toggleDay = (day) => {
    const currentDays = schedule?.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    onChange({ ...schedule, days_of_week: newDays });
  };

  const addException = () => {
    if (!selectedExceptionDate) return;
    const dateStr = selectedExceptionDate.toISOString().split('T')[0];
    const currentExceptions = schedule?.exceptions || [];
    if (!currentExceptions.includes(dateStr)) {
      onChange({ ...schedule, exceptions: [...currentExceptions, dateStr] });
      toast.success('Exception date added');
    }
    setSelectedExceptionDate(null);
    setShowExceptionPicker(false);
  };

  const removeException = (date) => {
    const currentExceptions = schedule?.exceptions || [];
    onChange({ ...schedule, exceptions: currentExceptions.filter(d => d !== date) });
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Repeat className="w-5 h-5" />
          Recurring Schedule Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-white text-sm mb-2 block">Frequency</label>
          <Select 
            value={schedule?.frequency || "weekly"} 
            onValueChange={(v) => onChange({ ...schedule, frequency: v })}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Days of Week</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {daysOfWeek.map((day) => {
              const isSelected = schedule?.days_of_week?.includes(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`p-3 rounded-lg border transition ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/50'
                  }`}
                >
                  {day.label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-white text-sm mb-2 block">Start Time</label>
            <Input
              type="time"
              value={schedule?.start_time || ""}
              onChange={(e) => onChange({ ...schedule, start_time: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label className="text-white text-sm mb-2 block">End Time</label>
            <Input
              type="time"
              value={schedule?.end_time || ""}
              onChange={(e) => onChange({ ...schedule, end_time: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Exception Dates (Skip These Days)</label>
          <div className="space-y-2">
            {schedule?.exceptions?.map((date, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="text-white text-sm">{new Date(date).toLocaleDateString()}</span>
                <button onClick={() => removeException(date)}>
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
          
          {showExceptionPicker ? (
            <div className="mt-3 bg-white/10 rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedExceptionDate}
                onSelect={setSelectedExceptionDate}
                className="rounded-md border-0"
              />
              <div className="flex gap-2 mt-3">
                <Button onClick={addException} size="sm" className="flex-1 bg-red-600">
                  Add Exception
                </Button>
                <Button onClick={() => setShowExceptionPicker(false)} size="sm" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowExceptionPicker(true)} size="sm" variant="outline" className="w-full mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Add Exception Date
            </Button>
          )}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-blue-300 text-xs">
            <strong>Preview:</strong> Events will occur {schedule?.frequency || 'weekly'} on {schedule?.days_of_week?.join(', ') || 'selected days'} from {schedule?.start_time || '--:--'} to {schedule?.end_time || '--:--'}
            {schedule?.exceptions?.length > 0 && `, excluding ${schedule.exceptions.length} exception date(s)`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}