import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Building, Wallet, Bitcoin, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";

const getIcon = (type) => {
  if (type === 'card') return CreditCard;
  if (type === 'bank_account') return Building;
  if (type === 'crypto_wallet') return Bitcoin;
  return Wallet;
};

const getLabel = (m) => {
  if (m.type === 'card' && m.card_details) return `${m.card_details.brand?.toUpperCase() || 'Card'} •••• ${m.card_details.last4}`;
  if (m.type === 'bank_account' && m.bank_details) return `${m.bank_details.bank_name || 'Bank'} •••• ${m.bank_details.last4}`;
  if (m.type === 'crypto_wallet' && m.crypto_details) return `Crypto •••• ${m.crypto_details.wallet_address?.slice(-4)}`;
  if (m.external_details) return `${m.type} — ${m.external_details.username || m.external_details.email}`;
  return m.type?.replace('_', ' ');
};

export default function PaymentMethodStatusChecker({ currentUser }) {
  const queryClient = useQueryClient();

  const { data: methods = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: async () => {
      const list = await base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' });
      return list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    },
    enabled: !!currentUser,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-methods', currentUser?.email] });
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="glass-effect rounded-xl border border-white/10 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <h4 className="text-white font-semibold text-sm">Payment Methods</h4>
          {methods.length > 0 && (
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
              {methods.length} active
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-300 text-sm font-medium">No payment methods linked</p>
            <p className="text-yellow-400/70 text-xs">Add a card or bank account to pay for services</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => {
            const Icon = getIcon(m.type);
            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <span className="text-white text-sm capitalize">{getLabel(m)}</span>
                  {m.is_default && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs font-medium">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastUpdated && (
        <p className="text-gray-600 text-xs mt-2">Last checked: {lastUpdated}</p>
      )}
    </div>
  );
}