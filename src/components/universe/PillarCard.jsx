import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import InnovationWaitlistModal from "./InnovationWaitlistModal";

export default function PillarCard({ pillar, index, total }) {
  const navigate = useNavigate();
  const [showWaitlist, setShowWaitlist] = useState(false);

  // Pre-compute random positions so they don't change on re-render
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 2,
    })), []);

  const Icon = pillar.icon;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl">
      <div className="absolute inset-0">
        <motion.img
          src={pillar.image}
          alt={pillar.title}
          className="w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <div className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} opacity-75`} />

      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ left: `${p.left}%`, top: `${p.top}%` }}
            animate={{ y: [-10, -110], opacity: [0, 1, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-12 overflow-hidden">
        <div className="flex items-start justify-between flex-shrink-0">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 sm:p-4 md:p-5 bg-white/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30"
          >
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-end gap-2"
          >
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-xl rounded-full text-white text-xs sm:text-sm font-bold border border-white/30">
              {index + 1}/{total}
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex items-center min-h-0 py-2"
        >
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
            {(pillar.features || []).filter(Boolean).map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="px-2 sm:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-xl rounded-xl sm:rounded-2xl text-white text-center text-xs sm:text-sm md:text-base font-medium border border-white/30"
              >
                {feature}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex-shrink-0"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-1 sm:mb-3 drop-shadow-2xl leading-tight">
            {pillar.title}
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-3 sm:mb-6 drop-shadow-lg">
            {pillar.subtitle}
          </p>

          {pillar.comingSoon && (
            <div className="mb-3">
              <span className="px-4 py-1.5 rounded-full bg-yellow-500/30 border border-yellow-400/50 text-yellow-300 text-xs sm:text-sm font-bold">
                🚀 Coming Soon
              </span>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (pillar.comingSoon) {
                setShowWaitlist(true);
              } else {
                navigate(createPageUrl(pillar.action));
              }
            }}
            type="button"
            className="w-full py-3 sm:py-4 md:py-5 bg-white/30 backdrop-blur-xl rounded-xl sm:rounded-2xl text-white text-sm sm:text-base md:text-lg font-bold hover:bg-white/40 active:scale-[0.98] transition border-2 border-white/50 shadow-2xl flex items-center justify-center gap-2 sm:gap-3 cursor-pointer touch-manipulation"
          >
            {pillar.comingSoon ? "Join Waitlist" : `Enter ${pillar.title}`}
            <span className="inline-block">{pillar.comingSoon ? "→" : "→"}</span>
          </button>

          <AnimatePresence>
            {showWaitlist && (
              <InnovationWaitlistModal onClose={() => setShowWaitlist(false)} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent" />
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent" />
      </div>
    </div>
  );
}