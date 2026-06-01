import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Building, Wallet, Bitcoin, Check, Plus, ChevronRight, Shield, Star } from "lucide-react";

const TYPE_CONFIG = {
  card: {
    icon: CreditCard,
    color: "bg-blue-500/20 text-blue-400",
    borderActive: "border-blue-500 bg-blue-500/10",
    getLabel: (m) => {
      const brand = m.card_details?.brand;
      const brandName = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" }[brand?.toLowerCase()] || brand || "Card";
      return brandName;
    },
    getLast4: (m) => m.card_details?.last4 || "••••",
    getSublabel: (m) => {
      if (!m.card_details?.exp_month || !m.card_details?.exp_year) return null;
      return `Exp ${String(m.card_details.exp_month).padStart(2, "0")}/${m.card_details.exp_year}`;
    },
  },
  bank_account: {
    icon: Building,
    color: "bg-green-500/20 text-green-400",
    borderActive: "border-green-500 bg-green-500/10",
    getLabel: (m) => m.bank_details?.bank_name || "Bank Account",
    getLast4: (m) => m.bank_details?.last4 || "••••",
    getSublabel: (m) => {
      const type = m.bank_details?.account_type;
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : null;
    },
  },
  cashapp: {
    icon: Wallet,
    color: "bg-emerald-500/20 text-emerald-400",
    borderActive: "border-emerald-500 bg-emerald-500/10",
    getLabel: () => "Cash App",
    getLast4: (m) => m.external_details?.username || m.external_details?.email || "",
    getSublabel: () => null,
  },
  venmo: {
    icon: Wallet,
    color: "bg-sky-500/20 text-sky-400",
    borderActive: "border-sky-500 bg-sky-500/10",
    getLabel: () => "Venmo",
    getLast4: (m) => m.external_details?.username || m.external_details?.email || "",
    getSublabel: () => null,
  },
  paypal: {
    icon: Wallet,
    color: "bg-indigo-500/20 text-indigo-400",
    borderActive: "border-indigo-500 bg-indigo-500/10",
    getLabel: () => "PayPal",
    getLast4: (m) => m.external_details?.username || m.external_details?.email || "",
    getSublabel: () => null,
  },
  crypto_wallet: {
    icon: Bitcoin,
    color: "bg-orange-500/20 text-orange-400",
    borderActive: "border-orange-500 bg-orange-500/10",
    getLabel: () => "Crypto Wallet",
    getLast4: (m) => {
      const addr = m.crypto_details?.wallet_address;
      return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
    },
    getSublabel: (m) => m.crypto_details?.network || null,
  },
};

const FALLBACK_CONFIG = {
  icon: Wallet,
  color: "bg-gray-500/20 text-gray-400",
  borderActive: "border-purple-500 bg-purple-500/10",
  getLabel: (m) => m.type?.replace("_", " ") || "Payment",
  getLast4: () => "",
  getSublabel: () => null,
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "cards", label: "Cards", types: ["card"] },
  { key: "banks", label: "Banks", types: ["bank_account"] },
  { key: "digital", label: "Digital", types: ["cashapp", "venmo", "paypal", "crypto_wallet"] },
];

export default function CheckoutPaymentSelector({
  currentUser,
  value,
  onChange,
  onAddNew,
  accentColor = "purple",
  showFilter = true,
  compact = false,
}) {
  const [filter, setFilter] = useState("all");

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payment-methods", currentUser?.email],
    queryFn: async () => {
      const list = await base44.entities.PaymentMethod.filter({
        user_email: currentUser.email,
        status: "active",
      });
      return list.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
    },
    enabled: !!currentUser,
    initialData: [],
  });

  // Filter tabs that have methods
  const availableTabs = FILTER_TABS.filter(
    (t) => t.key === "all" || methods.some((m) => t.types?.includes(m.type))
  );

  const filteredMethods =
    filter === "all"
      ? methods
      : methods.filter((m) => {
          const tab = FILTER_TABS.find((t) => t.key === filter);
          return tab?.types?.includes(m.type);
        });

  // Auto-select default on mount
  const selectedId = value || methods.find((m) => m.is_default)?.id || methods[0]?.id;

  useEffect(() => {
    if (!value && selectedId && onChange) onChange(selectedId);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
          <CreditCard className="w-7 h-7 text-gray-600" />
        </div>
        <p className="text-gray-400 text-sm mb-1">No payment methods saved</p>
        <p className="text-gray-600 text-xs mb-4">
          Add a card or bank account to proceed
        </p>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4 inline mr-1.5" />
            Add Payment Method
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs — only show when there's more than 1 category */}
      {showFilter && availableTabs.length > 2 && (
        <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl">
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === tab.key
                  ? "bg-purple-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Payment methods list */}
      <div className="space-y-2">
        {filteredMethods.map((m) => {
          const cfg = TYPE_CONFIG[m.type] || FALLBACK_CONFIG;
          const Icon = cfg.icon;
          const isActive = selectedId === m.id;
          const label = cfg.getLabel(m);
          const last4 = cfg.getLast4(m);
          const sublabel = cfg.getSublabel(m);

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange?.(m.id)}
              className={`w-full rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
                compact ? "p-2.5" : "p-3.5"
              } ${
                isActive
                  ? cfg.borderActive
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold truncate">
                    {label}
                  </span>
                  {m.is_default && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                      <Star className="w-2.5 h-2.5 fill-yellow-400" />
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {last4 && (
                    <span className="text-gray-400 text-xs font-mono">
                      {["card", "bank_account"].includes(m.type) ? `•••• ${last4}` : last4}
                    </span>
                  )}
                  {sublabel && (
                    <>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-gray-500 text-xs">{sublabel}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              <div className="flex-shrink-0">
                {isActive ? (
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white/20" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add new */}
      {onAddNew && (
        <button
          type="button"
          onClick={onAddNew}
          className="w-full p-3 rounded-xl border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add payment method
        </button>
      )}

      {/* Security note */}
      <div className="flex items-center gap-1.5 text-gray-600 text-[10px] pt-1">
        <Shield className="w-3 h-3" />
        <span>Payments encrypted & PCI-DSS compliant</span>
      </div>
    </div>
  );
}