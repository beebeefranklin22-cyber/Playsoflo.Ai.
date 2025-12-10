import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, Store } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectStorefront() {
  const [purchasing, setPurchasing] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['storefront-products'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAllConnectProducts', {});
      return response.products || [];
    },
    initialData: []
  });

  const handlePurchase = async (product) => {
    setPurchasing(product.id);
    try {
      const response = await base44.functions.invoke('createConnectCheckout', {
        product_id: product.id,
        quantity: 1,
        success_url: window.location.origin + '/payment-success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: window.location.href
      });

      // Redirect to Stripe Checkout
      window.location.href = response.checkout_url;
    } catch (error) {
      toast.error(error.message || 'Failed to start checkout');
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Store className="w-10 h-10 text-blue-400" />
            Marketplace
          </h1>
          <p className="text-gray-400">Shop from our community of sellers</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No products available</p>
              <p className="text-gray-500 text-sm mt-2">Check back soon for new items</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-4 gap-6">
            {products.map(product => (
              <Card key={product.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition group">
                <CardContent className="p-0">
                  <div className="relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-56 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                        <ShoppingCart className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-white font-bold text-lg mb-2">{product.name}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-3">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-green-400 font-bold text-2xl">{product.price_formatted}</div>
                      <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                        {product.currency.toUpperCase()}
                      </Badge>
                    </div>

                    {product.seller_email && (
                      <p className="text-gray-500 text-xs mb-3">
                        Sold by: {product.seller_email.split('@')[0]}
                      </p>
                    )}

                    <Button
                      onClick={() => handlePurchase(product)}
                      disabled={purchasing === product.id}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {purchasing === product.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-white/5 border-white/10 mt-8">
          <CardContent className="p-6">
            <h3 className="text-white font-bold mb-2">How it works</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>• Browse products from verified sellers</li>
              <li>• Secure checkout powered by Stripe</li>
              <li>• Instant digital delivery when available</li>
              <li>• Platform fee: 10% (automatically deducted)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}