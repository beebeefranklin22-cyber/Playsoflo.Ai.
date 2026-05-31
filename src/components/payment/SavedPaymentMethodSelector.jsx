import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Building, Wallet, Bitcoin, Check, Plus } from "lucide-react";

const getIcon = (type) => {
  switch (type) {
    case 'card': return CreditCard;
    case 'bank_account': return Building;
    case 'crypto_wallet': return Bitcoin;
    default: return Wallet;
  }
};

const getLabel = (m) => {
  if (m.type === 'card' && m.card_details) return `${m.card_details.brand || 'Card'} •••• ${m.card_details.last4}`;
  if (m.type === 'bank_account' && m.bank_details) return `${m.bank_details.bank_name || 'Bank'} •••• ${m.bank_details.last4}`;
  if (m.crypto_details) return `Crypto •••• ${m.crypto_details.wallet_address?.slice(-4)}`;
  if (m.external_details) return `${m.type} (${m.external_details.username || m.external_details.email})`;
  return m.type?.replace('_', ' ');
};

/**
 * Reusable selector that lets a user toggle between their saved payment methods.
 * @param {object} currentUser
 * @param {string} value - selected payment method id
 * @param {function} onChange - called with the selected method id
 * @param {function} onAddNew - optional, called when "Add new" is clicked
 */
export default function SavedPaymentMethodSelector({ currentUser, value, onChange, onAddNew }) {
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: async () => {
      const list = await base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' });
      return list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    },
    enabled: !!currentUser,
    initialData: []
  });

  const activeId = value || methods.find(m => m.is_default)?.id || methods[0]?.id;

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
      {methods.length === 0 ? (
        <p className="text-gray-400 text-sm">No saved payment methods.</p>
      ) : (
        methods.map((m) => {
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