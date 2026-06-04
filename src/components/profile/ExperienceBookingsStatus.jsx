import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Calendar, Clock, CheckCircle2, XCircle, Loader2, Ticket } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    icon: Clock,
    dot: "bg-yellow-400",
    description: "Awaiting confirmation from the provider"
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: CheckCircle2,
    dot: "bg-green-400",
    description: "Your booking is confirmed!"
  },
  completed: {
    label: "Completed",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: CheckCircle2,
    dot: "bg-blue-400",
    description: "Experience completed"
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: XCircle,
    dot: "bg-red-400",
    description: "This booking was cancelled"
  }
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function ExperienceBookingsStatus({ currentUser }) {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-experience-bookings", currentUser?.email],
    queryFn: () => base44.entities.Booking.filter(
      { created_by: currentUser.email },
      "-created_date",
      50
    ),
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
    staleTime: 10000
  });

  const experienceBookings = bookings.filter(b => !b.booking_type || b.booking_type === "experience");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (experienceBookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-8 h-8 text-purple-400" />
        </div>
        <p className="text-white font-semibold mb-1">No bookings yet</p>
        <p className="text-gray-400 text-sm">Your experience bookings will appear here</p>
      </div>
    );
  }

  // Summary counts
  const counts = experienceBookings.reduce((acc, b) => {
    const s = b.booking_status || "pending";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className={`rounded-xl p-3 border text-center ${config.color}`}>
            <p className="text-lg font-bold">{counts[key] || 0}</p>
            <p className="text-xs opacity-80">{config.label}</p>
          </div>
        ))}
      </div>

      {/* Booking cards */}
      {experienceBookings.map((booking) => {
        const status = booking.booking_status || "pending";
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

        return (
          <Card key={booking.id} className={`bg-white/5 border border-white/10 hover:border-white/20 transition`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{booking.experience_title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <Calendar className="w-3 h-3" />
                        {booking.booking_date ? format(new Date(booking.booking_date), "MMM d, yyyy") : "TBD"}
                      </span>
                      {booking.number_of_guests > 1 && (
                        <span className="text-gray-400 text-xs">{booking.number_of_guests} guests</span>
                      )}
                      {booking.total_price_usd > 0 && (
                        <span className="text-green-400 text-xs font-semibold">${booking.total_price_usd}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{config.description}</p>
                    {booking.confirmation_code && (
                      <p className="text-purple-400 text-xs mt-1 font-mono">#{booking.confirmation_code}</p>
                    )}
                    {booking.cancellation_reason && (
                      <p className="text-red-400 text-xs mt-1">Reason: {booking.cancellation_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={status} />
                  <span className="text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(booking.created_date), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Progress bar for active bookings */}
              {(status === "pending" || status === "confirmed") && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    {["pending", "confirmed", "completed"].map((s, idx) => {
                      const stepIdx = ["pending", "confirmed", "completed"].indexOf(status);
                      const isActive = idx <= stepIdx;
                      return (
                        <React.Fragment key={s}>
                          <div className={`flex items-center gap-1.5 ${isActive ? "text-white" : "text-gray-600"}`}>
                            <div className={`w-2 h-2 rounded-full ${isActive ? STATUS_CONFIG[s]?.dot || "bg-white" : "bg-gray-700"}`} />
                            <span className="text-xs capitalize hidden sm:inline">{s}</span>
                          </div>
                          {idx < 2 && (
                            <div className={`flex-1 h-0.5 ${idx < stepIdx ? "bg-purple-500" : "bg-gray-700"}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}