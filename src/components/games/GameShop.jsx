import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, Check, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function GameShop({ currentUser, gameName, onClose }) {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('items');

  const { data: items = [] } = useQuery({
    queryKey: ['game-items', gameName],
    queryFn: async () => {
      const allItems = await base44.entities.GameItem.filter({ game_name: gameName, is_active: true });
      return allItems;
    }
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['user-inventory', gameName],
    queryFn: async () => {
      const inv = await base44.entities.UserInventory.filter({
        user_email: currentUser.email,
        game_name: gameName
      });
      return inv;
    },
    enabled: !!currentUser
  });

  const { data: subscription } = useQuery({
    queryKey: ['premium-subscription', currentUser?.email],
    queryFn: async () => {
      const subs = await base44.entities.GamePremiumSubscription.filter({
        user_email: currentUser.email,
        is_active: true
      });
      return subs[0];
    },
    enabled: !!currentUser
  });

  const purchaseItemMutation = useMutation({
    mutationFn: async (item) => {
      await base44.entities.UserInventory.create({
        user_email: currentUser.email,
        item_id: item.id,
        game_name: gameName,
        item_name: item.item_name,
        item_type: item.item_type,
        purchase_date: new Date().toISOString(),
        uses_remaining: item.item_type === 'boost' ? 10 : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-inventory']);
      toast.success('Item purchased! 🎉');
    }
  });

  const equipItemMutation = useMutation({
    mutationFn: async (inventoryItem) => {
      // Unequip all items of same type
      const sameTypeItems = inventory.filter(i => i.item_type === inventoryItem.item_type);
      for (const item of sameTypeItems) {
        await base44.entities.UserInventory.update(item.id, { is_equipped: false });
      }
      // Equip selected item
      await base44.entities.UserInventory.update(inventoryItem.id, { is_equipped: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-inventory']);
      toast.success('Item equipped! ✨');
    }
  });

  const subscribeMutation = useMutation({
    mutationFn: async (tier) => {
      const benefits = {
        basic: [],
        premium: ['Ad-free gaming', '2x XP boost', 'Exclusive skins'],
        ultimate: ['Ad-free gaming', '3x XP boost', 'All exclusive content', 'Priority support']
      };
      
      await base44.entities.GamePremiumSubscription.create({
        user_email: currentUser.email,
        subscription_tier: tier,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        price_paid: tier === 'premium' ? 9.99 : 19.99,
        benefits: benefits[tier]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['premium-subscription']);
      toast.success('Premium activated! 👑');
    }
  });

  const handlePurchase = (item) => {
    if (item.is_premium_only && !subscription) {
      toast.error('Premium subscription required! 👑');
      setSelectedTab('premium');
      return;
    }
    purchaseItemMutation.mutate(item);
  };

  const isOwned = (itemId) => {
    return inventory.some(i => i.item_id === itemId);
  };

  const itemsByType = items.reduce((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = [];
    acc[item.item_type].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto border-2 border-purple-500/30"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Game Shop</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setSelectedTab('items')}
            variant={selectedTab === 'items' ? 'default' : 'outline'}
            className={selectedTab === 'items' ? 'bg-purple-600' : ''}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Items
          </Button>
          <Button
            onClick={() => setSelectedTab('premium')}
            variant={selectedTab === 'premium' ? 'default' : 'outline'}
            className={selectedTab === 'premium' ? 'bg-yellow-600' : ''}
          >
            <Crown className="w-4 h-4 mr-2" />
            Premium
          </Button>
          <Button
            onClick={() => setSelectedTab('inventory')}
            variant={selectedTab === 'inventory' ? 'default' : 'outline'}
          >
            Inventory
          </Button>
        </div>

        {selectedTab === 'items' && (
          <div className="space-y-6">
            {Object.entries(itemsByType).map(([type, typeItems]) => (
              <div key={type}>
                <h3 className="text-xl font-bold text-white mb-3 capitalize">{type}s</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {typeItems.map(item => {
                    const owned = isOwned(item.id);
                    return (
                      <div key={item.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold">{item.item_name}</h4>
                          {item.is_premium_only && <Crown className="w-4 h-4 text-yellow-400" />}
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                        {item.effect_data?.color && (
                          <div className="w-full h-8 rounded mb-3" style={{ backgroundColor: item.effect_data.color }} />
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-green-400 font-bold">${item.price_usd}</span>
                          {owned ? (
                            <Button size="sm" disabled className="bg-gray-600">
                              <Check className="w-4 h-4 mr-1" />
                              Owned
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePurchase(item)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Buy
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'premium' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border-2 border-purple-500">
              <Crown className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
              <p className="text-gray-300 mb-4">$9.99/month</p>
              <ul className="space-y-2 mb-6">
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Ad-free gaming
                </li>
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  2x XP boost
                </li>
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Exclusive skins
                </li>
              </ul>
              <Button
                onClick={() => subscribeMutation.mutate('premium')}
                disabled={subscription?.subscription_tier === 'premium' || subscription?.subscription_tier === 'ultimate'}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {subscription?.subscription_tier === 'premium' ? 'Active' : 'Subscribe'}
              </Button>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-xl p-6 border-2 border-yellow-500">
              <Crown className="w-12 h-12 text-yellow-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Ultimate</h3>
              <p className="text-gray-300 mb-4">$19.99/month</p>
              <ul className="space-y-2 mb-6">
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Ad-free gaming
                </li>
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  3x XP boost
                </li>
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  All exclusive content
                </li>
                <li className="text-gray-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Priority support
                </li>
              </ul>
              <Button
                onClick={() => subscribeMutation.mutate('ultimate')}
                disabled={subscription?.subscription_tier === 'ultimate'}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                {subscription?.subscription_tier === 'ultimate' ? 'Active' : 'Subscribe'}
              </Button>
            </div>
          </div>
        )}

        {selectedTab === 'inventory' && (
          <div className="space-y-4">
            {inventory.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No items in inventory yet</p>
            ) : (
              inventory.map(item => (
                <div key={item.id} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-700">
                  <div>
                    <h4 className="text-white font-semibold">{item.item_name}</h4>
                    <p className="text-gray-400 text-sm capitalize">{item.item_type}</p>
                    {item.uses_remaining !== null && (
                      <p className="text-yellow-400 text-sm">Uses: {item.uses_remaining}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => equipItemMutation.mutate(item)}
                    variant={item.is_equipped ? 'default' : 'outline'}
                    className={item.is_equipped ? 'bg-green-600' : ''}
                  >
                    {item.is_equipped ? 'Equipped' : 'Equip'}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}