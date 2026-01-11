import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CalendarSync({ 
  title,
  description,
  startTime,
  endTime,
  location,
  attendees = [],
  eventType = "booking",
  autoSync = false
}) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [eventLink, setEventLink] = useState(null);

  const syncToCalendar = async () => {
    setSyncing(true);
    try {
      const { data } = await base44.functions.invoke('syncToGoogleCalendar', {
        event_type: eventType,
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        location,
        attendees
      });

      setSynced(true);
      setEventLink(data.event_link);
      toast.success('Event added to Google Calendar!');
    } catch (error) {
      toast.error('Calendar sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  React.useEffect(() => {
    if (autoSync && !synced && !syncing) {
      syncToCalendar();
    }
  }, [autoSync]);

  if (synced) {
    return (
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Synced to Calendar</p>
                <p className="text-gray-300 text-sm">Event added to Google Calendar</p>
              </div>
            </div>
            {eventLink && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(eventLink, '_blank')}
                className="bg-white/5 border-white/20"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Add to Calendar</p>
              <p className="text-gray-300 text-sm">Sync with Google Calendar</p>
            </div>
          </div>
          <Button
            onClick={syncToCalendar}
            disabled={syncing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Sync
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}