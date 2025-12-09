import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, Package } from "lucide-react";

/**
 * STRIPE PRODUCT MANAGER
 * 
 * This page allows sellers to create products that will be listed
 * on the platform storefront. Products are created at the platform level
 * and linked to the seller's connected account via metadata.
 */

export default function StripeProductManager() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    images: '',
  });

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    if (!user?.stripe_account_id) {
      alert('❌ Please complete Stripe Connect onboarding first');
      return;
    }

    try {
      setLoading(true);
      
      // Parse images (comma-separated URLs)
      const images = productForm.images
        .split(',')
        .map(url => url.trim())
        .filter(url => url);

      const { data } = await base44.functions.invoke('createPlatformProduct', {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        currency: 'usd',
        images: images,
      });

      alert('✅ Product created successfully!');
      
      // Reset form
      setProductForm({
        name: '',
        description: '',
        price: '',
        images: '',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('❌ Failed to create product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Product Manager</h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </Button>
        </div>

        {/* Onboarding Check */}
        {!user.stripe_account_id && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
            <CardContent className="p-6">
              <p className="text-yellow-300">
                ⚠️ You need to complete Stripe Connect onboarding before creating products.
              </p>
              <Button
                onClick={() => window.location.href = '/stripe-connect-onboarding'}
                className="mt-4 bg-purple-600 hover:bg-purple-700"
              >
                Go to Onboarding
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Product Form */}
        {showForm && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Create New Product</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Product Name *</label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="e.g., Premium Consulting Session"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-white text-sm mb-2 block">Description</label>
                  <Textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    placeholder="Describe your product..."
                    className="bg-white/10 border-white/20 text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-white text-sm mb-2 block">Price (USD) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    placeholder="29.99"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-white text-sm mb-2 block">Images (Optional)</label>
                  <Input
                    value={productForm.images}
                    onChange={(e) => setProductForm({...productForm, images: e.target.value})}
                    placeholder="Comma-separated image URLs"
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Enter image URLs separated by commas
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Package className="w-6 h-6 text-purple-400 mt-1" />
              <div>
                <h3 className="text-white font-semibold mb-2">How it works</h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• Products are created at the platform level</li>
                  <li>• When customers purchase your products, funds are automatically transferred to your account</li>
                  <li>• The platform takes a 10% commission (application fee)</li>
                  <li>• You receive payouts directly to your connected account</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}