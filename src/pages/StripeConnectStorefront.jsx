import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ShoppingCart, Package, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectStorefront() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Check for success/cancel from checkout
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast.success('🎉 Payment successful! Thank you for your purchase.');
    } else if (canceled === 'true') {
      toast.error('Payment was cancelled');
    }
  }, [searchParams]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      // User not logged in - that's okay for storefront
      console.log('Not logged in');
    }
  };

  // Fetch all products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['storefront-products'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getAllConnectProducts');
      return data.products || [];
    }
  });

  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: async (productId) => {
      const { data } = await base44.functions.invoke('createConnectCheckout', {
        productId,
        quantity: 1
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || 'Failed to create checkout');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start checkout');
    }
  });

  const handleBuyNow = (productId) => {
    checkoutMutation.mutate(productId);
  };

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-8 h-8" />
              Storefront
            </h1>
            <p className="text-gray-400">Browse and purchase products from our sellers</p>
          </div>
        </div>

        {/* Success/Cancel Messages */}
        {searchParams.get('success') === 'true' && (
          <Card className="bg-green-500/10 border-green-500/30 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-green-300 font-bold">Payment Successful!</h3>
                  <p className="text-green-200 text-sm">
                    Your purchase has been completed. The seller will receive your payment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {searchParams.get('canceled') === 'true' && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-yellow-400" />
                <div>
                  <h3 className="text-yellow-300 font-bold">Payment Cancelled</h3>
                  <p className="text-yellow-200 text-sm">
                    You cancelled the payment. Your products are still here when you're ready!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Products Yet</h3>
              <p className="text-gray-400 mb-4">
                Sellers haven't added any products yet. Check back soon!
              </p>
              {currentUser && (
                <Button
                  onClick={() => navigate('/StripeConnectOnboarding')}
                  variant="outline"
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                >
                  Become a Seller
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition group"
              >
                <CardContent className="p-6">
                  {/* Product Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition">
                        {product.name}
                      </h3>
                      {product.seller.email === currentUser?.email && (
                        <Badge className="bg-blue-500/20 text-blue-300">
                          Your Product
                        </Badge>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-gray-400 text-sm">{product.description}</p>
                    )}
                  </div>

                  {/* Seller Info */}
                  <div className="bg-white/5 rounded-lg p-3 mb-4">
                    <p className="text-gray-400 text-xs mb-1">Sold by</p>
                    <p className="text-white text-sm font-medium">
                      {product.seller.email}
                    </p>
                  </div>

                  {/* Price and Action */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Price</p>
                      <p className="text-3xl font-bold text-white">
                        {product.price.formatted}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleBuyNow(product.id)}
                      disabled={
                        checkoutMutation.isPending ||
                        product.seller.email === currentUser?.email
                      }
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : product.seller.email === currentUser?.email ? (
                        'Your Product'
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Product ID */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-gray-500 text-xs">Product ID: {product.id}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 mt-6">
          <CardContent className="p-6">
            <h3 className="text-white font-bold mb-2">How it works</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• <strong>Platform Fee:</strong> We charge a 10% + $0.50 platform fee per transaction</p>
              <p>• <strong>Destination Charges:</strong> Payments are processed on our platform, then transferred to sellers</p>
              <p>• <strong>Secure Checkout:</strong> All payments are processed securely through Stripe</p>
              <p>• <strong>Seller Protection:</strong> We handle disputes and chargebacks</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}