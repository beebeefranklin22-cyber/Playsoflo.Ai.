import React, { useState } from "react";
import { useAccount, useBalance, useSendTransaction, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, parseUnits, isAddress } from "viem";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Send, Loader2, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { USDC_ADDRESS_BY_CHAIN, USDC_DECIMALS } from "@/lib/wagmiConfig";

const ERC20_TRANSFER_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}];

// Real Ethereum mainnet / Base, real money -- this component never holds a
// key or seed phrase. Every send below is built here but SIGNED by the
// user's own connected wallet (MetaMask, Coinbase Wallet, etc.), which
// shows them the real recipient and amount before they approve anything.
// That's what makes this non-custodial: this app can propose a
// transaction, it can never make one happen on its own.
export default function RealWalletConnect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [showQr, setShowQr] = useState(false);
  const [asset, setAsset] = useState("ETH");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");

  const usdcAddress = USDC_ADDRESS_BY_CHAIN[chainId];

  const { data: ethBalance, refetch: refetchEth } = useBalance({ address, query: { enabled: !!address } });
  const { data: usdcBalance, refetch: refetchUsdc } = useBalance({
    address, token: usdcAddress, query: { enabled: !!address && !!usdcAddress },
  });

  const { data: prices } = useQuery({
    queryKey: ["crypto-prices", "eth-usdc"],
    queryFn: async () => {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd");
      if (!res.ok) throw new Error("Price lookup failed");
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  const { sendTransaction, data: ethTxHash, isPending: ethSending } = useSendTransaction();
  const { writeContract, data: usdcTxHash, isPending: usdcSending } = useWriteContract();
  const txHash = asset === "ETH" ? ethTxHash : usdcTxHash;
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  React.useEffect(() => {
    if (confirmed) {
      toast.success("Transaction confirmed!");
      setToAddress(""); setAmount("");
      refetchEth(); refetchUsdc();
    }
  }, [confirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const explorerBase = chainId === 8453 ? "https://basescan.org" : "https://etherscan.io";

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  const handleSend = () => {
    const to = toAddress.trim();
    if (!isAddress(to)) { toast.error("Enter a valid recipient address"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    try {
      if (asset === "ETH") {
        sendTransaction({ to, value: parseEther(amount) });
      } else {
        if (!usdcAddress) { toast.error("USDC isn't available on this network"); return; }
        writeContract({
          address: usdcAddress,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [to, parseUnits(amount, USDC_DECIMALS)],
        });
      }
      toast.info("Confirm the transaction in your wallet...");
    } catch (e) {
      toast.error(e?.shortMessage || e?.message || "Failed to build transaction");
    }
  };

  const sending = ethSending || usdcSending || confirming;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold">Crypto Wallet</h3>
          <p className="text-gray-500 text-xs">Real Ethereum &amp; Base mainnet — connect your own wallet</p>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>

      {isConnected && (
        <>
          {/* Balances */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-gray-500 text-xs">ETH Balance</p>
              <p className="text-white font-bold text-xl">{ethBalance ? Number(ethBalance.formatted).toFixed(4) : "0.0000"}</p>
              {prices?.ethereum?.usd && ethBalance && (
                <p className="text-gray-500 text-xs">${(Number(ethBalance.formatted) * prices.ethereum.usd).toFixed(2)}</p>
              )}
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-gray-500 text-xs">USDC Balance</p>
              <p className="text-white font-bold text-xl">{usdcBalance ? Number(usdcBalance.formatted).toFixed(2) : "0.00"}</p>
              {usdcBalance && <p className="text-gray-500 text-xs">${Number(usdcBalance.formatted).toFixed(2)}</p>}
            </div>
          </div>

          {/* Live prices */}
          {prices && (
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 px-1">
              <span>ETH: <span className="text-white font-medium">${prices.ethereum?.usd?.toLocaleString()}</span></span>
              <span>USDC: <span className="text-white font-medium">${prices["usd-coin"]?.usd?.toFixed(3)}</span></span>
            </div>
          )}

          {/* Address / Receive */}
          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <p className="text-gray-300 text-xs font-mono flex-1 truncate">{address}</p>
              <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={() => setShowQr(v => !v)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400">
                <QrCode className="w-4 h-4" />
              </button>
            </div>
            {showQr && (
              <div className="flex justify-center py-4 bg-white rounded-lg mt-3">
                <QRCodeSVG value={address} size={160} />
              </div>
            )}
          </div>

          {/* Send */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {["ETH", "USDC"].map(a => (
                <button key={a} onClick={() => setAsset(a)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${asset === a ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300"}`}>
                  {a}
                </button>
              ))}
            </div>
            <Input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Recipient address (0x...)"
              className="bg-white/8 border-white/15 text-white font-mono text-sm"
            />
            <div className="flex gap-2">
              <Input
                type="number" min="0" step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Amount (${asset})`}
                className="bg-white/8 border-white/15 text-white flex-1"
              />
              <Button onClick={handleSend} disabled={sending} className="bg-green-600 hover:bg-green-700 font-bold">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Send</>}
              </Button>
            </div>
            <p className="text-amber-400/80 text-xs">⚠ This is real money on a real blockchain. Transactions can't be reversed — double-check the address.</p>
          </div>

          {txHash && (
            <a
              href={`${explorerBase}/tx/${txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-3 text-blue-400 text-xs hover:underline"
            >
              View transaction <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </>
      )}

      {!isConnected && (
        <p className="text-gray-400 text-sm text-center py-4">
          Connect your own wallet to send, receive, and view real crypto balances. Your keys never leave your wallet app.
        </p>
      )}
    </div>
  );
}
