import React from "react";
import { ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function CartButton({ currentUser }) {
  const navigate = useNavigate();

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', currentUser?.email],
    queryFn: () => base44.entities.Cart.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
    refetchInterval: false
  });

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <Button
      onClick={() => navigate(createPageUrl("Cart"))}
      variant="outline"
      className="relative bg-white/10 border-white/20 hover:bg-white/20"
    >
      <ShoppingCart className="w-5 h-5" />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </Button>
  );
}