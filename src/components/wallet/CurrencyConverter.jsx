import React, { useState, useMemo } from "react";
import { ArrowDownUp, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷" },
];

function CurrencyPicker({ selected, onSelect, onClose, rates }) {
  const [search, setSearch] = useState("");
  const filtered = POPULAR_CURRENCIES.filter(
    c => c.code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute z-50 top-full mt-2 left-0 right-0 bg-gray-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
    >
      <div className="p-3 border-b border-white/10 flex gap-2 items-center">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search currency..."
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 outline-none"
        />
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.map(c => (
          <button
            key={c.code}
            onClick={() => { onSelect(c.code); onClose(); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition text-left ${selected === c.code ? 'bg-purple-500/20' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{c.flag}</span>
              <span className="text-white text-sm font-medium">{c.code}</span>
              <span className="text-gray-400 text-xs">{c.name}</span>
            </div>
            {rates && rates[c.code] && (
              <span className="text-gray-500 text-xs">1 USD = {rates[c.code].toFixed(2)}</span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function CurrencyConverter({ exchangeRates = {}, usdBalance = 0, onClose }) {
  const [amount, setAmount] = useState(usdBalance > 0 ? usdBalance.toFixed(2) : "100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const getRate = (from, to) => {
    // exchangeRates are relative to USD
    const fromRate = from === "USD" ? 1 : (exchangeRates[from] || 1);
    const toRate = to === "USD" ? 1 : (exchangeRates[to] || 1);
    return toRate / fromRate;
  };

  const converted = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val)) return "—";
    const rate = getRate(fromCurrency, toCurrency);
    return (val * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }, [amount, fromCurrency, toCurrency, exchangeRates]);

  const rate = useMemo(() => getRate(fromCurrency, toCurrency), [fromCurrency, toCurrency, exchangeRates]);

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const fromInfo = POPULAR_CURRENCIES.find(c => c.code === fromCurrency);
  const toInfo = POPULAR_CURRENCIES.find(c => c.code === toCurrency);
  const hasRates = Object.keys(exchangeRates).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden border border-white/10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">Currency Converter</h2>
            <p className="text-indigo-200 text-xs mt-0.5">
              {hasRates ? "Live exchange rates" : "Loading rates..."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* From */}
          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-medium">From</label>
            <div className="relative">
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowFromPicker(v => !v); setShowToPicker(false); }}
                  className="flex items-center gap-2 px-3 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 transition flex-shrink-0"
                >
                  <span className="text-xl">{fromInfo?.flag}</span>
                  <span className="text-white font-bold text-sm">{fromCurrency}</span>
                </button>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-semibold outline-none focus:border-purple-400 transition"
                  placeholder="0.00"
                />
              </div>
              <AnimatePresence>
                {showFromPicker && (
                  <CurrencyPicker
                    selected={fromCurrency}
                    onSelect={setFromCurrency}
                    onClose={() => setShowFromPicker(false)}
                    rates={exchangeRates}
                  />
                )}
              </AnimatePresence>
            </div>
            {usdBalance > 0 && fromCurrency === "USD" && (
              <button
                onClick={() => setAmount(usdBalance.toFixed(2))}
                className="text-xs text-purple-400 hover:underline"
              >
                Use my balance (${usdBalance.toFixed(2)})
              </button>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swap}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition active:scale-90"
            >
              <ArrowDownUp className="w-5 h-5 text-purple-400" />
            </button>
          </div>

          {/* To */}
          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-medium">To</label>
            <div className="relative">
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowToPicker(v => !v); setShowFromPicker(false); }}
                  className="flex items-center gap-2 px-3 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 transition flex-shrink-0"
                >
                  <span className="text-xl">{toInfo?.flag}</span>
                  <span className="text-white font-bold text-sm">{toCurrency}</span>
                </button>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center">
                  <span className="text-white text-lg font-bold">{converted}</span>
                </div>
              </div>
              <AnimatePresence>
                {showToPicker && (
                  <CurrencyPicker
                    selected={toCurrency}
                    onSelect={setToCurrency}
                    onClose={() => setShowToPicker(false)}
                    rates={exchangeRates}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Rate display */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              1 {fromCurrency} = <span className="text-white font-semibold">{rate.toFixed(4)} {toCurrency}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3" />
              Live
            </div>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-gray-500 text-xs mb-2">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {[10, 50, 100, 500, 1000].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    parseFloat(amount) === v
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {v} {fromCurrency}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}