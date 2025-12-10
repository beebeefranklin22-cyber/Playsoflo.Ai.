import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StreamCalendarView({ currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: scheduledStreams = [] } = useQuery({
    queryKey: ['calendar-streams', currentUser?.email, currentDate.getMonth()],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.LivestreamSchedule.filter({
        creator_email: currentUser.email,
        status: { $in: ['scheduled', 'live'] }
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getStreamsForDate = (date) => {
    return scheduledStreams.filter(stream => {
      const streamDate = new Date(stream.scheduled_time);
      return streamDate.toDateString() === date.toDateString();
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const accessIcons = {
    public: null,
    members_only: <Crown className="w-3 h-3 text-yellow-400" />,
    ppv: <Lock className="w-3 h-3 text-purple-400" />,
    ppv_with_member_discount: <Lock className="w-3 h-3 text-green-400" />
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Stream Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={previousMonth} size="icon" variant="outline" className="bg-white/5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-white font-semibold min-w-[150px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button onClick={nextMonth} size="icon" variant="outline" className="bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-gray-400 text-sm font-semibold py-2">
              {day}
            </div>
          ))}

          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const streams = getStreamsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={day}
                className={`aspect-square p-1 rounded-lg border ${
                  isToday ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5'
                } hover:bg-white/10 transition`}
              >
                <div className="text-white text-sm font-medium mb-1">{day}</div>
                <div className="space-y-1">
                  {streams.slice(0, 2).map(stream => (
                    <div
                      key={stream.id}
                      className="bg-purple-600/30 rounded px-1 py-0.5 text-[10px] text-white truncate flex items-center gap-1"
                      title={stream.title}
                    >
                      {accessIcons[stream.access_type]}
                      <span className="truncate">{stream.title}</span>
                    </div>
                  ))}
                  {streams.length > 2 && (
                    <div className="text-purple-400 text-[10px]">+{streams.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-600 rounded" />
            <span className="text-gray-400 text-sm">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span className="text-gray-400 text-sm">Members Only</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-purple-400" />
            <span className="text-gray-400 text-sm">PPV</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}