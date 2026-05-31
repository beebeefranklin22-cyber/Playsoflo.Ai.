import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cdpCreateWallet } from "@/functions/cdpCreateWallet";
import { cdpGetBalance } from "@/functions/cdpGetBalance";
import { cdpSendCrypto } from "@/functions/cdpSendCrypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Copy, Send, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CDPCryptoWallet() {
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [createMessage, setCreateMessage] = useState(null); // { type: 'error' | 'success', text }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cdp-balance"],
    queryFn: async () => {
      const res = await cdpGetBalance({});
      return res.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const hasWallet = data && !data.error && data.address;

  const handleCreate = async () => {
    setCreating(true);
    setCreateMessage(null);
    try {
      const res = await cdpCreateWallet({});
      // The function returns 200 even when the provider rejects — surface the real result.
      if (res?.data?.error) {
        setCreateMessage({ type: "error", text: res.data.error });
      } else if (res?.data?.address) {
        setCreateMessage({ type: "success", text: "Crypto wallet created!" });
        await refetch();
      } else {
        setCreateMessage({ type: "error", text: "Could not create wallet. Please try again." });
      }
    } catch (e) {
      setCreateMessage({ type: "error", text: e?.response?.data?.error || e?.message || "Failed to create wallet" });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(data.address);
    toast.success("Address copied");
  };

  const handleSend = async () => {
    if (!toAddress || !amount) { toast.error("Enter recipient and amount"); return; }
    setSending(true);
    try {
      const res = await cdpSendCrypto({ to_address: toAddress.trim(), amount: parseFloat(amount) });
      toast.success(`Sent! Tx: ${String(res.data.tx_hash).slice(0, 12)}...`);
      setToAddress(""); setAmount("");
      refetch();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">Crypto Wallet (USDC)</h3>
          <p className="text-gray-500 text-xs">Powered by Coinbase · Base Sepolia (testnet)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : !hasWallet ? (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-4">Create your on-chain wallet to send and receive USDC.</p>
          <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-700 font-bold">
            {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Wallet"}
          </Button>
          {createMessage && (
            <div className={`mt-4 rounded-xl p-3 text-sm text-left ${
              createMessage.type === "error"
                ? "bg-red-500/10 border border-red-500/30 text-red-300"
                : "bg-green-500/10 border border-green-500/30 text-green-300"
            }`}>
              {createMessage.text}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Balance */}
          <div className="bg-black/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Balance</p>
                <p className="text-white font-bold text-2xl">{(data.usdc_balance || 0).toFixed(2)} <span className="text-sm text-gray-400">USDC</span></p>
              </div>
              <button onClick={() => refetch()} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 bg-black/30 rounded-xl p-3 mb-4">
            <p className="text-gray-300 text-xs font-mono flex-1 truncate">{data.address}</p>
            <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400">
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Send */}
          <div className="space-y-2">
            <Input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Recipient address (0x...)"
              className="bg-white/8 border-white/15 text-white font-mono text-sm"
            />
            <div className="flex gap-2">
              <Input
                type="number" min="0" step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount (USDC)"
                className="bg-white/8 border-white/15 text-white flex-1"
              />
              <Button onClick={handleSend} disabled={sending} className="bg-green-600 hover:bg-green-700 font-bold">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Send</>}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-green-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> On-chain wallet active
          </div>
        </>
      )}
    </div>
  );
}