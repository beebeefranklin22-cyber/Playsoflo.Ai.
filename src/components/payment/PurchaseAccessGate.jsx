import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lock, Play, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import UniversalPaymentGate from "./UniversalPaymentGate";
import { toast } from "sonner";

export default function PurchaseAccessGate({
  itemType,
  itemId,
  price,
  itemDetails,
  currentUser,
  children,
  onAccessGranted
}) {
  const [showPayment, setShowPayment] = useState(false);

  // Check if user has already purchased
  const { data: hasPurchased = false, refetch } = useQuery({
    queryKey: ['purchase-check', itemType, itemId, currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return false;
      
      const purchases = await base44.entities.ContentPurchase.filter({
        buyer_email: currentUser.email,
        item_type: itemType,
        item_id: itemId
      });
      
      return purchases.length > 0;
    },
    enabled: !!currentUser && !!itemId
  });

  const handlePaymentSuccess = async () => {
    // Record purchase
    await base44.entities.ContentPurchase.create({
      buyer_email: currentUser.email,
      item_type: itemType,
      item_id: itemId,
      price_paid: price,
      payment_method: "stripe"
    });

    // Send notification to seller
    if (itemDetails.seller_email) {
      await base44.entities.Notification.create({
        recipient_email: itemDetails.seller_email,
        type: "payment_received",
        title: "New Purchase",
        message: `${currentUser.full_name || currentUser.email} purchased your ${itemType}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name
      });
    }

    await refetch();
    if (onAccessGranted) onAccessGranted();
    toast.success("Purchase successful! You now have access.");
  };

  // Free content or already purchased
  if (price === 0 || hasPurchased) {
    return <>{children}</>;
  }

  // Requires payment
  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none opacity-50">
        {children}
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">
            {itemDetails.name || "Premium Content"}
          </h3>
          <p className="text-gray-400 mb-6">
            Purchase this {itemType} to unlock full access
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Price</span>
              <span className="text-3xl font-bold text-white">${price.toFixed(2)}</span>
            </div>
          </div>

          {currentUser ? (
            <Button
              onClick={() => setShowPayment(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Purchase Now
            </Button>
          ) : (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Sign In to Purchase
            </Button>
          )}
        </div>
      </div>

      <UniversalPaymentGate
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={price}
        itemType={itemType}
        itemId={itemId}
        itemDetails={itemDetails}
        onPaymentSuccess={handlePaymentSuccess}
        currentUser={currentUser}
      />
    </div>
  );
}