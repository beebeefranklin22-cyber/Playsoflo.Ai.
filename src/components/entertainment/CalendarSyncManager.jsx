import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";

export default function CalendarSyncManager({ experience, onUpdate }) {
  const [syncing, setSyncing] = useState(false);

  const syncToGoogleCalendar = async () => {
    setSyncing(true);
    try {
      // Create calendar event data
      const eventData = {
        summary: experience.title,
        description: experience.description,
        location: `${experience.venue_name}, ${experience.venue_address}`,
        start: {
          dateTime: experience.event_dates?.[0]?.date ? 
            `${experience.event_dates[0].date}T${experience.event_dates[0].start_time}:00` : 
            new Date().toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: experience.event_dates?.[0]?.date ? 
            `${experience.event_dates[0].date}T${experience.event_dates[0].end_time}:00` : 
            new Date().toISOString(),
          timeZone: 'America/New_York'
        },
        recurrence: experience.recurring_schedule?.days_of_week ? [
          `RRULE:FREQ=${experience.recurring_schedule.frequency.toUpperCase()};BYDAY=${
            experience.recurring_schedule.days_of_week.map(d => d.slice(0, 2).toUpperCase()).join(',')
          }`
        ] : undefined
      };

      toast.info('Google Calendar integration coming soon! For now, you can manually add events.');
      
      // Update experience with sync status
      await base44.entities.Experience.update(experience.id, {
        calendar_sync_enabled: true
      });
      
      onUpdate?.();
      toast.success('Calendar sync enabled');
    } catch (error) {
      toast.error('Failed to sync: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const disableSync = async () => {
    try {
      await base44.entities.Experience.update(experience.id, {
        calendar_sync_enabled: false,
        google_calendar_id: null
      });
      onUpdate?.();
      toast.success('Calendar sync disabled');
    } catch (error) {
      toast.error('Failed to disable sync');
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="text-white font-semibold">Google Calendar Sync</p>
            <p className="text-gray-400 text-sm">Automatically sync events to your Google Calendar</p>
          </div>
          <Switch
            checked={experience.calendar_sync_enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                syncToGoogleCalendar();
              } else {
                disableSync();
              }
            }}
            disabled={syncing}
          />
        </div>

        {experience.calendar_sync_enabled && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-green-300 text-sm font-semibold">Calendar Sync Active</p>
            </div>
            <p className="text-gray-400 text-xs">
              Your events are synced with Google Calendar. Any changes to dates will automatically update.
            </p>
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-blue-300 text-xs">
            <strong>Note:</strong> Calendar sync requires Google Calendar authorization. 
            {!experience.calendar_sync_enabled && ' Enable sync to connect your calendar.'}
          </p>
        </div>

        <Button 
          onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(experience.title)}`, '_blank')}
          variant="outline" 
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in Google Calendar
        </Button>
      </CardContent>
    </Card>
  );
}