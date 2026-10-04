import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { playIncomingWorkAlert } from "./notificationSounds";

/**
 * The one unmistakable "you have new work" screen in the app — full-screen,
 * its own sound, its own amber/red color language, used nowhere else. Every
 * provider/driver inbox (bookings, orders, rides, deliveries, rentals, food
 * orders) renders one of these the moment a new item arrives, instead of
 * relying on the easy-to-miss corner toast the rest of the app uses.
 */
export default function IncomingWorkAlert({
  open,
  onClose,
  icon: Icon,
  title,
  subtitle,
  details = [],
  actionLabel = "View Request",
}) {
  useEffect(() => {
    if (!open) return;
    playIncomingWorkAlert();
    if ("vibrate" in navigator) navigator.vibrate([250, 100, 250, 100, 250]);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 18 }}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-500/15 to-black border-2 border-amber-400/60 shadow-[0_0_60px_rgba(251,191,36,0.35)] p-6"
          >
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-amber-400 pointer-events-none"
              animate={{ opacity: [0.8, 0.15, 0.8] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative flex flex-col items-center text-center gap-3 pt-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                {Icon && <Icon className="w-8 h-8 text-amber-300" />}
              </div>
              <div>
                <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-1">
                  New Work
                </p>
                <h2 className="text-white text-xl font-bold">{title}</h2>
                {subtitle && <p className="text-gray-300 text-sm mt-1">{subtitle}</p>}
              </div>

              {details.length > 0 && (
                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 mt-1">
                  {details.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{d.label}</span>
                      <span className="text-white font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={onClose}
                className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {actionLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
