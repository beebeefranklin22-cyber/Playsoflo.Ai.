import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Calendar, Package, Zap, Star, MapPin,
  ChevronRight, Play, Tag, Truck, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import UnifiedBookingModal from "./UnifiedBookingModal";

const ORDER_TYPE_MAP = {
  service_booking: 'service_booking',
  food_order: 'food_order',
  product_order: 'product_order',
  digital_product: 'digital_product',
  subscription: 'subscription',
  experience: 'experience',
};

function getOrderType(item) {
  if (item._entityType === 'MenuItem') return 'food_order';
  if (item._entityType === 'InventoryProduct') return 'product_order';
  if (item._entityType === 'DigitalProduct') return 'digital_product';
  if (item._entityType === 'SubscriptionTier') return 'subscription';
  if (item._entityType === 'Experience') return 'experience';
  // MarketplaceItem - guess from category
  if (item.is_rental) return 'product_order';
  return 'service_booking';
}

function ItemCard({ item, onBook }) {
  const price = parseFloat(item.price || item.base_price || item.base_fee || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition group cursor-pointer"
      onClick={() => onBook(item)}
    >
      <div className="relative aspect-video bg-gray-900">
        {item.image_url || item.thumbnail_url ? (
          <img src={item.image_url || item.thumbnail_url} alt={item.title || item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}
        {item.is_on_sale && item.sale_price && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">SALE</div>
        )}
        {item.availability === 'booked' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{item.title || item.name}</h4>
        {item.description && <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.description}</p>}
        <div className="flex items-center justify-between">
          <div>
            {item.is_on_sale && item.sale_price ? (
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold">${parseFloat(item.sale_price).toFixed(2)}</span>
                <span className="text-gray-500 text-xs line-through">${price.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-green-400 font-bold">${price.toFixed(2)}</span>
            )}
            {item.price_type && <span className="text-gray-500 text-xs ml-1">/ {item.price_type}</span>}
          </div>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs px-3">
            {getOrderType(item) === 'service_booking' ? 'Book' :
             getOrderType(item) === 'subscription' ? 'Subscribe' :
             getOrderType(item) === 'experience' ? 'Book' : 'Order'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

const TABS = [
  { key: 'all', label: 'All', icon: ShoppingBag },
  { key: 'services', label: 'Services', icon: Calendar },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'digital', label: 'Digital', icon: Zap },
  { key: 'food', label: 'Menu', icon: Tag },
  { key: 'experiences', label: 'Experiences', icon: Star },
];

export default function ProviderStorefront({ providerEmail, provider, currentUser }) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingOrderType, setBookingOrderType] = useState(null);
  const [showBooking, setShowBooking] = useState(false);

  const email = providerEmail || provider?.email;

  const { data: marketplaceItems = [] } = useQuery({
    queryKey: ['provider-marketplace', email],
    queryFn: () => base44.entities.MarketplaceItem.filter({ provider_email: email }),
    enabled: !!email,
  });

  const { data: inventoryProducts = [] } = useQuery({
    queryKey: ['provider-inventory', email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: email, status: 'active' }),
    enabled: !!email,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['provider-menu', email],
    queryFn: async () => {
      const restaurants = await base44.entities.Restaurant.filter({ owner_email: email });
      if (!restaurants.length) return [];
      return await base44.entities.MenuItem.filter({ restaurant_id: restaurants[0].id });
    },
    enabled: !!email,
  });

  const { data: digitalProducts = [] } = useQuery({
    queryKey: ['provider-digital', email],
    queryFn: () => base44.entities.DigitalProduct.filter({ created_by: email }),
    enabled: !!email,
  });

  const { data: subscriptionTiers = [] } = useQuery({
    queryKey: ['provider-subscriptions', email],
    queryFn: () => base44.entities.SubscriptionTier.filter({ creator_email: email }),
    enabled: !!email,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ['provider-experiences', email],
    queryFn: () => base44.entities.Experience.filter({ provider_email: email, is_active: true }),
    enabled: !!email,
  });

  // Annotate items with entity type
  const tagged = [
    ...marketplaceItems.map(i => ({ ...i, _entityType: 'MarketplaceItem' })),
    ...inventoryProducts.map(i => ({ ...i, _entityType: 'InventoryProduct', title: i.name, price: i.sale_price || i.base_price })),
    ...menuItems.map(i => ({ ...i, _entityType: 'MenuItem', title: i.name })),
    ...digitalProducts.map(i => ({ ...i, _entityType: 'DigitalProduct' })),
    ...subscriptionTiers.map(i => ({ ...i, _entityType: 'SubscriptionTier', title: i.name, description: i.description, price: i.price })),
    ...experiences.map(i => ({ ...i, _entityType: 'Experience' })),
  ];

  const filtered = activeTab === 'all' ? tagged :
    activeTab === 'services' ? tagged.filter(i => i._entityType === 'MarketplaceItem' && !i.is_rental) :
    activeTab === 'products' ? tagged.filter(i => ['InventoryProduct'].includes(i._entityType) || (i._entityType === 'MarketplaceItem' && i.is_rental)) :
    activeTab === 'digital' ? tagged.filter(i => ['DigitalProduct', 'SubscriptionTier'].includes(i._entityType)) :
    activeTab === 'food' ? tagged.filter(i => i._entityType === 'MenuItem') :
    activeTab === 'experiences' ? tagged.filter(i => i._entityType === 'Experience') : tagged;

  const handleBook = (item) => {
    setSelectedItem(item);
    setBookingOrderType(getOrderType(item));
    setShowBooking(true);
  };

  if (tagged.length === 0) return null;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-4">
        {TABS.filter(t => t.key === 'all' || filtered.length > 0 || activeTab === t.key).map(tab => {
          const count = tab.key === 'all' ? tagged.length :
            tab.key === 'services' ? tagged.filter(i => i._entityType === 'MarketplaceItem' && !i.is_rental).length :
            tab.key === 'products' ? tagged.filter(i => ['InventoryProduct'].includes(i._entityType) || (i._entityType === 'MarketplaceItem' && i.is_rental)).length :
            tab.key === 'digital' ? tagged.filter(i => ['DigitalProduct', 'SubscriptionTier'].includes(i._entityType)).length :
            tab.key === 'food' ? tagged.filter(i => i._entityType === 'MenuItem').length :
            tab.key === 'experiences' ? tagged.filter(i => i._entityType === 'Experience').length : 0;
          if (count === 0 && tab.key !== 'all') return null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No items in this category</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(item => (
            <ItemCard key={`${item._entityType}-${item.id}`} item={item} onBook={handleBook} />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && selectedItem && (
        <UnifiedBookingModal
          isOpen={showBooking}
          onClose={() => { setShowBooking(false); setSelectedItem(null); }}
          provider={provider}
          item={selectedItem}
          orderType={bookingOrderType}
          onSuccess={() => {
            setShowBooking(false);
            setSelectedItem(null);
          }}
        />
      )}

      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}