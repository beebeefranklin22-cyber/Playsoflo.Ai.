import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Ordered status steps for rides and deliveries with friendly labels.
const RIDE_STEPS = [
  { key: "requested", label: "Request Sent" },
  { key: "accepted", label: "Driver Assigned" },
  { key: "en_route", label: "Driver En Route" },
  { key: "arrived", label: "Driver Arrived" },
  { key: "in_progress", label: "On The Way" },
  { key: "completed", label: "Completed" },
];

const DELIVERY_STEPS = [
  { key: "pending", label: "Order Placed" },
  { key: "driver_assigned", label: "Driver Assigned" },
  { key: "picked_up", label: "Package Picked Up" },
  { key: "in_transit", label: "In Transit" },
  { key: "out_for_delivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
];

export default function StatusTimeline({ type = "ride", status }) {
  const steps = type === "delivery" ? DELIVERY_STEPS : RIDE_STEPS;
  const currentIndex = steps.findIndex((s) => s.key === status);
  // Cancelled / failed states fall outside the happy path
  const isTerminalBad = ["cancelled", "declined_by_customer", "failed"].includes(status);

  if (isTerminalBad) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
        <p className="text-red-300 font-semibold capitalize">{status.replace(/_/g, " ")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, idx) => {
        const done = currentIndex > idx;
        const active = currentIndex === idx;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : active ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </motion.div>
              ) : (
                <Circle className="w-5 h-5 text-gray-600" />
              )}
              {idx < steps.length - 1 && (
                <div className={`w-0.5 h-5 ${done ? "bg-green-400" : "bg-gray-700"}`} />
              )}
            </div>
            <span
              className={`text-sm pb-5 ${
                active ? "text-white font-semibold" : done ? "text-green-300" : "text-gray-500"
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}