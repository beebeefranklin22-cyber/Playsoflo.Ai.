import React, { useState } from "react";
import { ShoppingCart, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddToCartButton({ 
  item, 
  itemType, 
  currentUser,
  className = "",
  showQuantity = false 
}) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  // Check if already in cart
  const { data: existingItem } = useQuery({
    queryKey: ['cart-item', item.id],
    queryFn: async () => {
      const items = await base44.entities.Cart.filter({ 
        user_email: currentUser?.email,
        item_id: item.id 
      });
      return items[0];
    },
    enabled: !!currentUser
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        toast.error('Please log in to add items to cart');
        return;
      }

      const cartItem = {
        user_email: currentUser.email,
        item_type: itemType,
        item_id: item.id,
        item_name: item.title || item.name || item.item_name,
        item_image: item.image_url || item.thumbnail_url,
        price: item.price || item.price_paid || 0,
        quantity: quantity,
        provider_email: item.provider_email || item.created_by
      };

      if (existingItem) {
        await base44.entities.Cart.update(existingItem.id, {
          quantity: existingItem.quantity + quantity
        });
      } else {
        await base44.entities.Cart.create(cartItem);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      queryClient.invalidateQueries(['cart-item']);
      setIsAdding(true);
      toast.success('Added to cart!');
      setTimeout(() => setIsAdding(false), 2000);
    }
  });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showQuantity && (
        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-1 hover:bg-white/10 rounded"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-center bg-transparent border-0 text-white"
            min="1"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
      
      <Button
        onClick={() => addToCartMutation.mutate()}
        disabled={addToCartMutation.isPending || isAdding}
        className={`${isAdding ? 'bg-green-600' : 'bg-purple-600'} hover:bg-purple-700 flex-1`}
      >
        {isAdding ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Added!
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </>
        )}
      </Button>
    </div>
  );
}