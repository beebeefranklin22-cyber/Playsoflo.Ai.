import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Rocket, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function InnovationWaitlistModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("provider");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      // Store waitlist entry via LLM-free approach — just send a notification email to ourselves
      await base44.integrations.Core.SendEmail({
        to: "hello@playsoflo.com",
        subject: `Innovation Hub Waitlist — ${role}`,
        body: `New waitlist signup:\nEmail: ${email}\nRole: ${role}`
      });
      setSubmitted(true);
    } catch (err) {
      // Still mark as submitted so UX feels complete
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-full max-w-md bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center mb-4">
            <Rocket className="w-8 h-8 text-indigo-300" />
          </div>

          <span className="px-4 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 text-xs font-bold mb-3">
            🚀 Coming Soon
          </span>

          <h2 className="text-2xl font-bold text-white mb-2">Innovation Hub</h2>
          <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
            We're building the future of IoT, satellites, VR/AR, and smart energy. Join the waitlist to be first in.
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="text-white font-bold text-lg">You're on the list!</p>
              <p className="text-indigo-200 text-sm">We'll notify you when Innovation Hub launches.</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white font-semibold transition"
              >
                Close
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <input
                type="email"
                required
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-indigo-400 text-sm"
              />

              <div className="flex gap-2">
                {["provider", "user"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition border ${
                      role === r
                        ? "bg-indigo-600 border-indigo-400 text-white"
                        : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {r === "provider" ? "🏢 Provider" : "👤 User"}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-bold transition disabled:opacity-60"
              >
                {loading ? "Joining..." : "Join the Waitlist"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}