import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Store } from "lucide-react";

/**
 * STRIPE STOREFRONT
 * 
 * This page displays all products from all sellers in a marketplace format.
 * Customers can browse and purchase products using Stripe Checkout with
 * destination charges (automatic payment splitting).
 */

export default function StripeStorefront() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me().catch(() => null);
      setUser(currentUser);

      // Fetch all products from platform
      const { data } = await base44.functions.invoke('getAllPlatformProducts', {});
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyProduct = async (product) => {
    if (!user) {
      alert('Please log in to purchase');
      return;
    }

    try {
      setCheckoutLoading(product.id);

      // Create checkout session with destination charge
      const { data } = await base44.functions.invoke('createConnectCheckout', {
        product_id: product.id,
        quantity: 1,
        connected_account_id: product.connected_account_id,
        // Optional: specify custom application fee (defaults to 10%)
        // application_fee_amount: Math.round(product.price_amount_cents * 0.15), // 15% fee
      });

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('❌ Failed to create checkout: ' + error.message);
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Store className="w-10 h-10 text-purple-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">Marketplace</h1>
            <p className="text-gray-400">Browse products from all sellers</p>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No products yet</h3>
              <p className="text-gray-400">Check back soon for new listings</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                {/* Product Image */}
                <div className="aspect-square bg-white/5">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  {/* Product Info */}
                  <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  {product.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Seller Info */}
                  <div className="mb-3">
                    <Badge variant="outline" className="text-xs">
                      by {product.seller_name || product.seller_email}
                    </Badge>
                  </div>

                  {/* Price & Buy Button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        ${product.price_amount_dollars.toFixed(2)}
                      </p>
                      <p className="text-gray-400 text-xs uppercase">
                        {product.currency}
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => handleBuyProduct(product)}
                      disabled={checkoutLoading === product.id}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {checkoutLoading === product.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <Card className="bg-blue-500/10 border-blue-500/30 mt-8">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-300 text-sm">
              All payments are processed securely through Stripe. The platform takes a 10% commission,
              and sellers receive their funds directly to their connected accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}