import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form state
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [priceInDollars, setPriceInDollars] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Check if user has completed onboarding
      if (!user.stripe_connect_account_id) {
        toast.error('Please complete Stripe Connect onboarding first');
        navigate('/StripeConnectOnboarding');
      }
    } catch (error) {
      toast.error('Please log in first');
      navigate('/');
    }
  };

  // Fetch user's products
  const { data: allProducts = [] } = useQuery({
    queryKey: ['connect-products'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getAllConnectProducts');
      return data.products || [];
    },
    enabled: !!currentUser
  });

  // Filter to show only current user's products
  const myProducts = allProducts.filter(
    p => p.seller.email === currentUser?.email
  );

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const { data } = await base44.functions.invoke('createConnectProduct', productData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['connect-products']);
      toast.success('Product created successfully!');
      // Reset form
      setProductName("");
      setDescription("");
      setPriceInDollars("");
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!productName || !priceInDollars) {
      toast.error('Please fill in all required fields');
      return;
    }

    const priceInCents = Math.round(parseFloat(priceInDollars) * 100);
    
    if (priceInCents < 50) {
      toast.error('Price must be at least $0.50');
      return;
    }

    createProductMutation.mutate({
      name: productName,
      description: description,
      priceInCents: priceInCents
    });
  };

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Manage Products</h1>
            <p className="text-gray-400">Create and manage your Stripe products</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Product Form */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Product
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Product Name *
                  </label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Premium Widget"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your product..."
                    className="bg-white/10 border-white/20 text-white h-24"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Price (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={priceInDollars}
                      onChange={(e) => setPriceInDollars(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white pl-10"
                      required
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1">Minimum: $0.50</p>
                </div>

                <Button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Products List */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                My Products ({myProducts.length})
              </h2>

              {myProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No products yet</p>
                  <p className="text-gray-500 text-sm">Create your first product to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-semibold">{product.name}</h3>
                        <span className="text-green-400 font-bold">
                          {product.price.formatted}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-gray-400 text-sm mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>ID: {product.id}</span>
                        <span>Price ID: {product.price.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Action */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 mt-6">
          <CardContent className="p-6">
            <h3 className="text-white font-bold mb-2">Ready to sell?</h3>
            <p className="text-gray-300 text-sm mb-4">
              Visit the storefront to see all products available for purchase.
            </p>
            <Button
              onClick={() => navigate('/StripeConnectStorefront')}
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
            >
              View Storefront
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}