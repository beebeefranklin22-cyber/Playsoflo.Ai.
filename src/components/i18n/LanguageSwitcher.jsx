import React, { useState, useEffect } from "react";
import { getLocale, setLocale, getSupportedLocales } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LanguageSwitcher({ className = "" }) {
  const [current, setCurrent] = useState(getLocale());
  const [open, setOpen] = useState(false);
  const locales = getSupportedLocales();

  useEffect(() => {
    const handler = (e) => setCurrent(e.detail.locale);
    window.addEventListener('localechange', handler);
    return () => window.removeEventListener('localechange', handler);
  }, []);

  const handleSelect = (code) => {
    setLocale(code);
    setCurrent(code);
    setOpen(false);
  };

  const currentLocale = locales.find(l => l.code === current) || locales[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition text-white text-sm"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4 text-purple-400" />
        <span>{currentLocale.flag}</span>
        <span className="hidden sm:inline">{currentLocale.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-44 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {locales.map(locale => (
                <button
                  key={locale.code}
                  onClick={() => handleSelect(locale.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/10 ${
                    current === locale.code ? 'text-purple-400 bg-purple-500/10' : 'text-white'
                  }`}
                >
                  <span className="text-base">{locale.flag}</span>
                  <span>{locale.label}</span>
                  {current === locale.code && (
                    <span className="ml-auto w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}