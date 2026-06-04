import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Building, Wallet, Bitcoin, Check, Plus } from "lucide-react";

const getIcon = (type) => {
  switch (type) {
    case 'card': return CreditCard;
    case 'bank_account': return Building;
    case 'crypto_wallet': return Bitcoin;
    case 'cashapp':
    case 'venmo':
    case 'paypal': return Wallet;
    default: return Wallet;
  }
};

const getLabel = (m) => {
  if (m.type === 'card' && m.card_details) return `${m.card_details.brand || 'Card'} •••• ${m.card_details.last4}`;
  if (m.type === 'bank_account' && m.bank_details) return `${m.bank_details.bank_name || 'Bank'} •••• ${m.bank_details.last4}`;
  if (m.type === 'crypto_wallet' && m.crypto_details) return `Crypto •••• ${m.crypto_details.wallet_address?.slice(-4)}`;
  if (m.external_details) return `${m.type} (${m.external_details.username || m.external_details.email})`;
  return m.type?.replace('_', ' ');
};

/**
 * Group filter so the checkout can offer category tabs
 * (cards, bank accounts, crypto wallets).
 */
export const PAYMENT_GROUPS = {
  cards: ['card'],
  banks: ['bank_account'],
  crypto: ['crypto_wallet'],
  wallets: ['cashapp', 'venmo', 'paypal']
};

/**
 * Reusable selector that lets a user toggle between their saved payment methods.
 * @param {object} currentUser
 * @param {string} value - selected payment method id
 * @param {function} onChange - called with the selected method id
 * @param {function} onAddNew - optional, called when "Add new" is clicked
 */
const TABS = [
  { key: 'cards', label: 'Cards', icon: CreditCard, types: PAYMENT_GROUPS.cards },
  { key: 'banks', label: 'Banks', icon: Building, types: PAYMENT_GROUPS.banks },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin, types: PAYMENT_GROUPS.crypto },
  { key: 'wallets', label: 'Wallets', icon: Wallet, types: PAYMENT_GROUPS.wallets }
];

export default function SavedPaymentMethodSelector({ currentUser, value, onChange, onAddNew, showTabs = false }) {
  const [activeTab, setActiveTab] = useState(null);
  const queryClient = useQueryClient();

  // Force a fresh fetch every time this selector mounts (e.g. at checkout)
  useEffect(() => {
    if (currentUser) {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', currentUser.email] });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: async () => {
      const list = await base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' });
      return list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    },
    enabled: !!currentUser,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Only show tabs that actually have saved methods
  const availableTabs = showTabs ? TABS.filter(t => methods.some(m => t.types.includes(m.type))) : [];

  const filteredMethods = activeTab
    ? methods.filter(m => {
        const tab = TABS.find(t => t.key === activeTab);
        return tab ? tab.types.includes(m.type) : true;
      })
    : methods;

  const activeId = value || filteredMethods.find(m => m.is_default)?.id || filteredMethods[0]?.id;

  // Auto-select the default once loaded
  useEffect(() => {
    if (!value && activeId && onChange) onChange(activeId);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return <p className="text-gray-400 text-sm">Loading payment methods…</p>;
  }

  return (
    <div className="space-y-2">
      <label className="text-white font-semibold block mb-1">Pay With</label>

      {availableTabs.length > 1 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === null ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300'
            }`}
          >
            All
          </button>
          {availableTabs.map((t) => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                  activeTab === t.key ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {filteredMethods.length === 0 ? (
        <p className="text-gray-400 text-sm">No saved payment methods.</p>
      ) : (
        filteredMethods.map((m) => {
          const Icon = getIcon(m.type);
          const isActive = activeId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange && onChange(m.id)}
              className={`w-full p-3 rounded-xl border-2 transition flex items-center justify-between ${
                isActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-white" />
                <span className="text-white text-sm capitalize">{getLabel(m)}</span>
                {m.is_default && <span className="text-xs text-green-400">Default</span>}
              </div>
              {isActive && <Check className="w-5 h-5 text-purple-400" />}
            </button>
          );
        })
      )}
      {onAddNew && (
        <button
          type="button"
          onClick={onAddNew}
          className="w-full p-3 rounded-xl border-2 border-dashed border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add new payment method
        </button>
      )}
    </div>
  );
}