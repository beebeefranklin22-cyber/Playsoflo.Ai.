import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TicketPurchaseWalletIntegration({ 
  totalPrice, 
  currentUser, 
  onWalletPayment, 
  onCardPayment,
  isProcessing 
}) {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (currentUser?.email) {
        try {
          const users = await base44.entities.User.filter({ email: currentUser.email });
          if (users.length > 0) {
            setWalletBalance(users[0].soflo_balance || 0);
          }
        } catch (error) {
          console.error('Failed to fetch wallet balance:', error);
        }
      }
    };
    fetchBalance();
  }, [currentUser]);

  const insufficientBalance = walletBalance < totalPrice;

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Select Payment Method</h3>
      
      {/* Wallet Option */}
      <button
        onClick={() => setPaymentMethod("wallet")}
        disabled={insufficientBalance}
        className={`w-full p-4 rounded-xl border-2 transition ${
          paymentMethod === "wallet"
            ? 'bg-purple-500/20 border-purple-500'
            : insufficientBalance
            ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
            : 'bg-white/5 border-white/10 hover:border-purple-500/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold">Pay with Wallet</p>
              <p className="text-gray-400 text-sm">
                Balance: ${walletBalance.toFixed(2)}
              </p>
              {insufficientBalance && (
                <p className="text-red-400 text-xs mt-1">Insufficient funds</p>
              )}
            </div>
          </div>
          {paymentMethod === "wallet" && !insufficientBalance && (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
        </div>
      </button>

      {/* Card Option */}
      <button
        onClick={() => setPaymentMethod("card")}
        className={`w-full p-4 rounded-xl border-2 transition ${
          paymentMethod === "card"
            ? 'bg-purple-500/20 border-purple-500'
            : 'bg-white/5 border-white/10 hover:border-purple-500/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold">Credit/Debit Card</p>
              <p className="text-gray-400 text-sm">Secure payment via Stripe</p>
            </div>
          </div>
          {paymentMethod === "card" && (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
        </div>
      </button>

      {/* Payment Button */}
      {paymentMethod === "wallet" ? (
        <Button
          onClick={onWalletPayment}
          disabled={insufficientBalance || isProcessing}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Pay ${totalPrice.toFixed(2)} from Wallet
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onCardPayment}
          disabled={isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Continue to Card Payment
            </>
          )}
        </Button>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
        <p className="text-blue-300 text-xs">
          {paymentMethod === "wallet" 
            ? "Your wallet balance will be debited immediately upon confirmation."
            : "You'll be redirected to our secure payment partner to complete your purchase."
          }
        </p>
      </div>
    </div>
  );
}