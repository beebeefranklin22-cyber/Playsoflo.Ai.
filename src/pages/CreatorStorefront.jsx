import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TipButton from "../components/TipButton";
import {
  ShoppingBag, Download, Star, Crown, 
  CheckCircle, Heart, Users, Package
} from "lucide-react";
import { motion } from "framer-motion";

export default function CreatorStorefront() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const creatorEmail = searchParams.get("creator");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: creator } = useQuery({
    queryKey: ["creator-profile", creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return null;
      const users = await base44.entities.User.filter({ email: creatorEmail });
      return users[0] || null;
    },
    enabled: !!creatorEmail
  });

  const { data: products = [] } = useQuery({
    queryKey: ["creator-products", creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      const allProducts = await base44.entities.CreatorProduct.list();
      return allProducts.filter(p => p.created_by === creatorEmail && p.is_active);
    },
    enabled: !!creatorEmail,
    initialData: []
  });

  const { data: subscriptionTiers = [] } = useQuery({
    queryKey: ["creator-subscriptions", creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return [];
      return await base44.entities.CreatorSubscription.filter({ 
        creator_email: creatorEmail,
        is_active: true
      });
    },
    enabled: !!creatorEmail,
    initialData: []
  });

  const { data: mySubscription } = useQuery({
    queryKey: ["my-subscription", creatorEmail],
    queryFn: async () => {
      if (!currentUser || !creatorEmail) return null;
      const subs = await base44.entities.UserSubscription.filter({
        subscriber_email: currentUser.email,
        creator_email: creatorEmail,
        status: "active"
      });
      return subs[0] || null;
    },
    enabled: !!currentUser && !!creatorEmail
  });

  const subscribeMutation = useMutation({
    mutationFn: async (tier) => {
      if (!currentUser) {
        alert("Please log in to subscribe");
        return;
      }

      const subscription = await base44.entities.UserSubscription.create({
        subscriber_email: currentUser.email,
        creator_email: creatorEmail,
        subscription_tier_id: tier.id,
        tier_name: tier.tier_name,
        monthly_amount_usd: tier.monthly_price_usd,
        start_date: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Update tier subscriber count
      await base44.entities.CreatorSubscription.update(tier.id, {
        subscriber_count: (tier.subscriber_count || 0) + 1
      });

      // Send notification
      await base44.entities.Notification.create({
        recipient_email: creatorEmail,
        type: "new_follower",
        title: "New Subscriber!",
        message: `${currentUser.full_name || currentUser.email} subscribed to your ${tier.tier_name} tier`,
        reference_type: "user",
        reference_id: subscription.id
      });

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["creator-subscriptions"] });
      alert("✨ Successfully subscribed!");
    }
  });

  const purchaseProductMutation = useMutation({
    mutationFn: async (product) => {
      if (!currentUser) {
        alert("Please log in to purchase");
        return;
      }

      // Create order/payment
      const order = await base44.entities.Order.create({
        order_type: "service",
        item_id: product.id,
        item_title: product.title,
        quantity: 1,
        total_usd: product.price_usd,
        provider_email: creatorEmail,
        status: "completed"
      });

      // Update sales count
      await base44.entities.CreatorProduct.update(product.id, {
        sales_count: (product.sales_count || 0) + 1
      });

      // Send notification
      await base44.entities.Notification.create({
        recipient_email: creatorEmail,
        type: "payment_received",
        title: "New Purchase!",
        message: `${currentUser.full_name || currentUser.email} purchased ${product.title}`,
        reference_type: "user",
        reference_id: order.id
      });

      return order;
    },
    onSuccess: () => {
      alert("🎉 Purchase successful! Check your email for download link.");
    }
  });

  const digitalProducts = products.filter(p => p.type === "digital_product");
  const physicalProducts = products.filter(p => p.type !== "digital_product" && p.type !== "subscription");

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Creator Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-4xl">
                  {creator?.email?.[0]?.toUpperCase() || "C"}
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    {creator?.full_name || creatorEmail}
                    {creator?.verified && (
                      <CheckCircle className="w-8 h-8 text-blue-400" />
                    )}
                  </h1>
                  {creator?.bio && (
                    <p className="text-gray-300 text-lg mb-4">{creator.bio}</p>
                  )}
                  <div className="flex items-center gap-4">
                    <Badge className="bg-purple-500/30 text-purple-200 capitalize">
                      {creator?.creator_category || "Creator"}
                    </Badge>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="w-4 h-4" />
                      <span>{creator?.followers?.length || 0} followers</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <TipButton 
                    creatorEmail={creatorEmail}
                    creatorName={creator?.full_name}
                    variant="outline"
                  />
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Follow
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Tiers */}
        {subscriptionTiers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-6">Support {creator?.full_name || "Creator"}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {subscriptionTiers.sort((a, b) => a.tier_level - b.tier_level).map((tier, idx) => {
                const isSubscribed = mySubscription?.subscription_tier_id === tier.id;
                
                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={`${
                      isSubscribed 
                        ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50"
                        : "bg-white/5 border-white/10"
                    } hover:border-purple-500/50 transition`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-white">{tier.tier_name}</h3>
                          {tier.custom_badge && (
                            <span className="text-3xl">{tier.custom_badge}</span>
                          )}
                        </div>

                        <div className="text-4xl font-bold text-white mb-2">
                          ${tier.monthly_price_usd}
                          <span className="text-lg text-gray-400">/mo</span>
                        </div>

                        {tier.monthly_price_soflo > 0 && (
                          <div className="text-purple-400 text-sm mb-4">
                            or {tier.monthly_price_soflo} SFC/mo
                          </div>
                        )}

                        <p className="text-gray-300 text-sm mb-6">{tier.description}</p>

                        <div className="space-y-3 mb-6">
                          {tier.benefits?.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                              {benefit}
                            </div>
                          ))}
                        </div>

                        {tier.perks && (
                          <div className="space-y-2 mb-6 p-3 bg-white/5 rounded-xl">
                            {tier.perks.early_access && (
                              <div className="flex items-center gap-2 text-yellow-400 text-xs">
                                <Crown className="w-3 h-3" />
                                Early access to content
                              </div>
                            )}
                            {tier.perks.direct_messaging && (
                              <div className="flex items-center gap-2 text-cyan-400 text-xs">
                                <Heart className="w-3 h-3" />
                                Direct messaging
                              </div>
                            )}
                            {tier.perks.merchandise_discount > 0 && (
                              <div className="flex items-center gap-2 text-green-400 text-xs">
                                <Package className="w-3 h-3" />
                                {tier.perks.merchandise_discount}% off merchandise
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={() => subscribeMutation.mutate(tier)}
                          disabled={isSubscribed || subscribeMutation.isLoading}
                          className={`w-full ${
                            isSubscribed
                              ? "bg-green-600"
                              : "bg-purple-600 hover:bg-purple-700"
                          }`}
                        >
                          {isSubscribed ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Subscribed
                            </>
                          ) : (
                            `Subscribe to ${tier.tier_name}`
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Products */}
        <Tabs defaultValue="digital" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="digital">Digital Products</TabsTrigger>
            <TabsTrigger value="physical">Merch & More</TabsTrigger>
          </TabsList>

          <TabsContent value="digital" className="space-y-4">
            {digitalProducts.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No digital products yet</h3>
                  <p className="text-gray-400">Check back soon for new releases</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {digitalProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                      <CardContent className="p-4">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.title}
                            className="w-full h-48 object-cover rounded-xl mb-4"
                          />
                        )}
                        
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-blue-500/20 text-blue-300 capitalize text-xs">
                            {product.digital_product_type?.replace(/_/g, ' ')}
                          </Badge>
                          {product.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-white text-sm">{product.rating}</span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-white font-bold text-lg mb-2">{product.title}</h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{product.description}</p>

                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-2xl font-bold text-white">
                              ${product.price_usd?.toFixed(2) || 0}
                            </div>
                            {product.file_size && (
                              <div className="text-gray-500 text-xs">{product.file_size}</div>
                            )}
                          </div>
                          <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                            {product.license_type}
                          </Badge>
                        </div>

                        <Button
                          onClick={() => purchaseProductMutation.mutate(product)}
                          disabled={purchaseProductMutation.isLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Purchase & Download
                        </Button>

                        {product.sales_count > 0 && (
                          <p className="text-center text-gray-500 text-xs mt-2">
                            {product.sales_count} sales
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="physical" className="space-y-4">
            {physicalProducts.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No products available</h3>
                  <p className="text-gray-400">Check back soon for merch and more</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {physicalProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                      <CardContent className="p-4">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.title}
                            className="w-full h-48 object-cover rounded-xl mb-4"
                          />
                        )}
                        
                        <Badge className="mb-2 capitalize text-xs">
                          {product.type?.replace(/_/g, ' ')}
                        </Badge>

                        <h3 className="text-white font-bold text-lg mb-2">{product.title}</h3>
                        <p className="text-gray-400 text-sm mb-4">{product.description}</p>

                        <div className="flex items-center justify-between mb-4">
                          <div className="text-2xl font-bold text-white">
                            ${product.price_usd?.toFixed(2) || 0}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {product.inventory > 0 ? `${product.inventory} left` : "Out of stock"}
                          </div>
                        </div>

                        <Button
                          onClick={() => purchaseProductMutation.mutate(product)}
                          disabled={product.inventory <= 0 || purchaseProductMutation.isLoading}
                          className="w-full bg-pink-600 hover:bg-pink-700"
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          {product.inventory > 0 ? "Buy Now" : "Sold Out"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}