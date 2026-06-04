import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Car, Navigation, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STEPS = [
  {
    key: "requested",
    label: "Searching",
    sublabel: "Finding a driver near you...",
    icon: Search,
    color: "from-yellow-500 to-amber-500",
    ring: "ring-yellow-400/40",
    dot: "bg-yellow-400",
  },
  {
    key: "accepted",
    label: "Driver Assigned",
    sublabel: "A driver has accepted your ride",
    icon: Car,
    color: "from-blue-500 to-cyan-500",
    ring: "ring-blue-400/40",
    dot: "bg-blue-400",
  },
  {
    key: "en_route",
    label: "Driver En Route",
    sublabel: "Your driver is on the way",
    icon: Navigation,
    color: "from-purple-500 to-violet-500",
    ring: "ring-purple-400/40",
    dot: "bg-purple-400",
  },
  {
    key: "arrived",
    label: "Driver Arrived",
    sublabel: "Your driver is at the pickup point",
    icon: MapPin,
    color: "from-green-500 to-emerald-500",
    ring: "ring-green-400/40",
    dot: "bg-green-400",
  },
  {
    key: "in_progress",
    label: "Trip Active",
    sublabel: "You're on your way!",
    icon: Car,
    color: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-400/40",
    dot: "bg-emerald-400",
  },
  {
    key: "completed",
    label: "Trip Complete",
    sublabel: "You've arrived at your destination",
    icon: CheckCircle2,
    color: "from-gray-500 to-slate-500",
    ring: "ring-gray-400/40",
    dot: "bg-gray-400",
  },
];

const STATUS_ORDER = STEPS.map((s) => s.key);

export default function RideStatusTracker({ rideId, initialStatus = "requested" }) {
  const [status, setStatus] = useState(initialStatus);
  const [prevStatus, setPrevStatus] = useState(null);
  const [justChanged, setJustChanged] = useState(false);

  // Subscribe to real-time ride updates
  useEffect(() => {
    const unsubscribe = base44.entities.RideRequest.subscribe((event) => {
      if (event.data?.id === rideId && event.type === "update") {
        const newStatus = event.data.status;
        if (newStatus !== status) {
          setPrevStatus(status);
          setStatus(newStatus);
          setJustChanged(true);
          setTimeout(() => setJustChanged(false), 2000);
        }
      }
    });
    return unsubscribe;
  }, [rideId, status]);

  const currentIdx = STATUS_ORDER.indexOf(status);
  const currentStep = STEPS.find((s) => s.key === status) || STEPS[0];
  const Icon = currentStep.icon;
  const isActive = !["completed", "cancelled"].includes(status);

  return (
    <div className="w-full space-y-4">
      {/* Main status card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentStep.color} p-[1px]`}
        >
          <div className={`flex items-center gap-4 rounded-2xl bg-gray-900/90 backdrop-blur-xl px-5 py-4 ring-2 ${currentStep.ring}`}>
            {/* Animated icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center shadow-lg`}>
              {isActive && status !== "completed" ? (
                <motion.div
                  animate={status === "requested" ? { rotate: 360 } : { scale: [1, 1.15, 1] }}
                  transition={{ duration: status === "requested" ? 2 : 1.5, repeat: Infinity, ease: status === "requested" ? "linear" : "easeInOut" }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
              ) : (
                <Icon className="w-6 h-6 text-white" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-lg leading-tight">{currentStep.label}</p>
                {isActive && (
                  <motion.div
                    className={`w-2 h-2 rounded-full ${currentStep.dot}`}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </div>
              <p className="text-white/60 text-sm truncate">{currentStep.sublabel}</p>
            </div>

            {/* "Just updated" flash */}
            <AnimatePresence>
              {justChanged && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="flex-shrink-0 bg-white/10 rounded-full px-3 py-1 text-white text-xs font-semibold"
                >
                  Updated
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Step progress bar */}
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">Ride Progress</p>
        <div className="flex items-center gap-0">
          {STEPS.slice(0, 5).map((step, idx) => {
            const done = currentIdx > idx;
            const active = currentIdx === idx;
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.key}>
                {/* Node */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <motion.div
                    animate={active ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                      done
                        ? "bg-green-500"
                        : active
                        ? `bg-gradient-to-br ${step.color} ring-4 ${step.ring}`
                        : "bg-white/10"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <StepIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </motion.div>
                  <span
                    className={`text-[10px] font-medium text-center leading-tight max-w-[56px] ${
                      active ? "text-white" : done ? "text-green-400" : "text-gray-600"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector */}
                {idx < 4 && (
                  <div className="flex-1 h-1 mx-1 rounded-full overflow-hidden bg-white/10 mb-5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: done ? "100%" : active ? "50%" : "0%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}