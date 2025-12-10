import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StripeConnectProducts() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [accountId, setAccountId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: ""
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      // Get saved account ID
      const savedAccountId = localStorage.getItem('stripe_account_id');
      if (savedAccountId) {
        setAccountId(savedAccountId);
      }
    });
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['connect-products'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAllConnectProducts', {});
      return response.products || [];
    },
    initialData: []
  });

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('createConnectProduct', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-products'] });
      setShowForm(false);
      setForm({ name: "", description: "", price: "", image_url: "" });
      toast.success('Product created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product');
    }
  });

  const handleSubmit = () => {
    if (!accountId) {
      toast.error('Please complete Stripe Connect onboarding first');
      return;
    }

    if (!form.name || !form.price) {
      toast.error('Name and price are required');
      return;
    }

    const priceInCents = Math.round(parseFloat(form.price) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    createProductMutation.mutate({
      name: form.name,
      description: form.description,
      price: priceInCents,
      currency: 'usd',
      connected_account_id: accountId,
      image_url: form.image_url || undefined
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Products</h1>
            <p className="text-gray-400">Create and manage products for your storefront</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Account ID Warning */}
        {!accountId && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
            <p className="text-yellow-400 font-medium">⚠ Complete Onboarding First</p>
            <p className="text-gray-300 text-sm mt-1">
              You need to complete Stripe Connect onboarding before creating products.
            </p>
          </div>
        )}

        {/* Create Product Form */}
        {showForm && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Create New Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Product Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
                rows={3}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Price (USD)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Image URL (optional)"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={createProductMutation.isPending || !accountId}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createProductMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Create Product
                </Button>
                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="bg-white/5 border-white/20"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No products yet</p>
              <p className="text-gray-500 text-sm mt-2">Create your first product to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                <CardContent className="p-0">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-lg mb-2">{product.name}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-400 font-bold text-2xl">{product.price_formatted}</div>
                        <Badge className="bg-purple-500/20 text-purple-300 text-xs mt-1">
                          {product.currency.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}