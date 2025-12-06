import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Store, DollarSign, Package, TrendingUp, Plus, Edit2, Trash2, CheckCircle, Upload, ChefHat, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function RestaurantOwnerHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);

  const [menuItemForm, setMenuItemForm] = useState({
    name: "",
    description: "",
    price: 0,
    category: "mains",
    image_url: "",
    is_available: true,
    prep_time: "10-15 min",
    calories: 0,
    dietary_tags: []
  });

  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    description: "",
    image_url: "",
    cuisine_type: "american",
    delivery_fee: 3.99,
    commission_rate: 0.12,
    estimated_delivery_time: "25-35 min",
    min_order: 10,
    is_open: true,
    address: "",
    phone: ""
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: myRestaurant } = useQuery({
    queryKey: ['my-restaurant', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const restaurants = await base44.entities.Restaurant.filter({ created_by: currentUser.email });
      return restaurants[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['restaurant-menu-items', myRestaurant?.id],
    queryFn: async () => {
      if (!myRestaurant) return [];
      return base44.entities.MenuItem.filter({ restaurant_id: myRestaurant.id });
    },
    enabled: !!myRestaurant
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['restaurant-orders', myRestaurant?.id],
    queryFn: async () => {
      if (!myRestaurant) return [];
      return base44.entities.FoodOrder.filter({ restaurant_id: myRestaurant.id });
    },
    enabled: !!myRestaurant,
    refetchInterval: 5000
  });

  React.useEffect(() => {
    if (myRestaurant) {
      setRestaurantForm(myRestaurant);
    }
  }, [myRestaurant]);

  const createRestaurantMutation = useMutation({
    mutationFn: (data) => base44.entities.Restaurant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-restaurant']);
      setShowRestaurantModal(false);
      toast.success('Restaurant created!');
    }
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Restaurant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-restaurant']);
      setShowRestaurantModal(false);
      toast.success('Restaurant updated!');
    }
  });

  const createMenuItemMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItem.create({
      ...data,
      restaurant_id: myRestaurant.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-menu-items']);
      setShowMenuModal(false);
      setMenuItemForm({
        name: "",
        description: "",
        price: 0,
        category: "mains",
        image_url: "",
        is_available: true,
        prep_time: "10-15 min",
        calories: 0,
        dietary_tags: []
      });
      toast.success('Menu item added!');
    }
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-menu-items']);
      setShowMenuModal(false);
      setEditingMenuItem(null);
      toast.success('Menu item updated!');
    }
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-menu-items']);
      toast.success('Menu item deleted');
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus, customerEmail }) => {
      await base44.entities.FoodOrder.update(orderId, { status: newStatus });

      const statusMessages = {
        'confirmed': '✅ Order Confirmed - Your order is being prepared',
        'preparing': '👨‍🍳 Preparing - Your food is being made',
        'ready': '📦 Ready - Your order is ready for pickup'
      };

      if (statusMessages[newStatus]) {
        await base44.entities.Notification.create({
          user_email: customerEmail,
          type: 'order_update',
          title: statusMessages[newStatus].split(' - ')[0],
          message: `${myRestaurant.name}: ${statusMessages[newStatus].split(' - ')[1]}`,
          reference_id: orderId,
          reference_type: 'food_order'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-orders']);
      toast.success('Order status updated');
    }
  });

  const handleImageUpload = async (file, field, isRestaurant = false) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (isRestaurant) {
      setRestaurantForm(prev => ({ ...prev, [field]: file_url }));
    } else {
      setMenuItemForm(prev => ({ ...prev, [field]: file_url }));
    }
  };

  const handleSaveMenuItem = () => {
    if (editingMenuItem) {
      updateMenuItemMutation.mutate({ id: editingMenuItem.id, data: menuItemForm });
    } else {
      createMenuItemMutation.mutate(menuItemForm);
    }
  };

  const handleEditMenuItem = (item) => {
    setEditingMenuItem(item);
    setMenuItemForm(item);
    setShowMenuModal(true);
  };

  const handleSaveRestaurant = () => {
    if (myRestaurant) {
      updateRestaurantMutation.mutate({ id: myRestaurant.id, data: restaurantForm });
    } else {
      createRestaurantMutation.mutate(restaurantForm);
    }
  };

  const totalEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.subtotal - o.commission_amount), 0);

  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'delivered');

  if (!myRestaurant && !showRestaurantModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
          <Store className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome, Restaurant Owner!</h2>
          <p className="text-gray-300 mb-6">Create your restaurant profile to start receiving orders</p>
          <Button
            onClick={() => setShowRestaurantModal(true)}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Restaurant
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Store className="w-8 h-8" />
              Restaurant Owner Hub
            </h1>
            <p className="text-gray-300">{myRestaurant?.name || 'Manage your restaurant'}</p>
          </div>
          <Button
            onClick={() => setShowRestaurantModal(true)}
            variant="outline"
            className="bg-white/10 border-white/20"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Restaurant
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-gray-300">Total Earnings</span>
            </div>
            <p className="text-3xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
            <p className="text-gray-400 text-sm mt-1">{completedOrders.length} completed orders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-blue-400" />
              <span className="text-gray-300">Pending Orders</span>
            </div>
            <p className="text-3xl font-bold text-white">{pendingOrders.length}</p>
            <p className="text-gray-400 text-sm mt-1">Needs attention</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <span className="text-gray-300">Menu Items</span>
            </div>
            <p className="text-3xl font-bold text-white">{menuItems.length}</p>
            <p className="text-gray-400 text-sm mt-1">{menuItems.filter(i => i.is_available).length} available</p>
          </motion.div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Orders ({pendingOrders.length})</TabsTrigger>
            <TabsTrigger value="menu">Menu ({menuItems.length})</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Restaurant Status</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <Badge className={myRestaurant?.is_open ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {myRestaurant?.is_open ? '🟢 Open' : '🔴 Closed'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Commission Rate</p>
                    <p className="text-white font-bold">{(myRestaurant?.commission_rate * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Delivery Time</p>
                    <p className="text-white font-bold">{myRestaurant?.estimated_delivery_time}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Delivery Fee</p>
                    <p className="text-white font-bold">${myRestaurant?.delivery_fee}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
                {pendingOrders.slice(0, 3).map(order => (
                  <div key={order.id} className="bg-white/5 rounded-lg p-4 mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">Order #{order.id.slice(0, 8)}</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400">{order.status}</Badge>
                    </div>
                    <p className="text-gray-400 text-sm">{order.items.length} items • ${order.total.toFixed(2)}</p>
                  </div>
                ))}
                {pendingOrders.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No pending orders</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No orders yet</p>
                </div>
              ) : (
                orders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Order #{order.id.slice(0, 8)}</h3>
                        <p className="text-gray-400 text-sm">{new Date(order.created_date).toLocaleString()}</p>
                      </div>
                      <Badge className={
                        order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'ready' ? 'bg-blue-500/20 text-blue-400' :
                        order.status === 'preparing' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }>
                        {order.status}
                      </Badge>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3 mb-4">
                      <p className="text-gray-400 text-sm mb-2">Order Items:</p>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-white text-sm mb-1">
                          <span>{item.quantity}x {item.name}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
                        <span className="text-gray-400 text-sm">Subtotal:</span>
                        <span className="text-white font-bold">${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Commission ({(myRestaurant.commission_rate * 100).toFixed(0)}%):</span>
                        <span className="text-red-400">-${order.commission_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-green-400">Your Earnings:</span>
                        <span className="text-green-400">${(order.subtotal - order.commission_amount).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-400 text-sm">Delivery Address:</p>
                      <p className="text-white">{order.delivery_address}</p>
                    </div>

                    {order.special_instructions && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                        <p className="text-blue-300 text-sm">📝 {order.special_instructions}</p>
                      </div>
                    )}

                    {!['delivered', 'cancelled'].includes(order.status) && (
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <Button
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              orderId: order.id, 
                              newStatus: 'confirmed',
                              customerEmail: order.created_by
                            })}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            Confirm Order
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              orderId: order.id, 
                              newStatus: 'preparing',
                              customerEmail: order.created_by
                            })}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                          >
                            <ChefHat className="w-4 h-4 mr-2" />
                            Start Preparing
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button
                            onClick={() => updateOrderStatusMutation.mutate({ 
                              orderId: order.id, 
                              newStatus: 'ready',
                              customerEmail: order.created_by
                            })}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Ready
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="menu">
            <div className="mb-4 flex justify-end">
              <Button
                onClick={() => {
                  setEditingMenuItem(null);
                  setMenuItemForm({
                    name: "",
                    description: "",
                    price: 0,
                    category: "mains",
                    image_url: "",
                    is_available: true,
                    prep_time: "10-15 min",
                    calories: 0,
                    dietary_tags: []
                  });
                  setShowMenuModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Menu Item
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden"
                >
                  <div className="relative h-40">
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <Badge className={`absolute top-3 right-3 ${item.is_available ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-orange-400 text-xl font-bold">${item.price.toFixed(2)}</span>
                      <Badge className="bg-purple-500/20 text-purple-300">{item.category}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditMenuItem(item)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMenuItemMutation.mutate(item.id)}
                        className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {menuItems.length === 0 && (
              <div className="text-center py-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No menu items yet</p>
                <Button onClick={() => setShowMenuModal(true)} className="bg-orange-600 hover:bg-orange-700">
                  Add Your First Item
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="earnings">
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Earnings Overview</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Revenue (before commission)</p>
                    <p className="text-3xl font-bold text-white">
                      ${orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.subtotal, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Your Earnings (after commission)</p>
                    <p className="text-3xl font-bold text-green-400">${totalEarnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Commission Paid</p>
                    <p className="text-2xl font-bold text-red-400">
                      -${orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.commission_amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Commission Rate</p>
                    <p className="text-2xl font-bold text-white">{(myRestaurant?.commission_rate * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
                {completedOrders.map(order => (
                  <div key={order.id} className="bg-white/5 rounded-lg p-4 mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-gray-400 text-sm">{new Date(order.updated_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">+${(order.subtotal - order.commission_amount).toFixed(2)}</p>
                      <p className="text-gray-400 text-xs">Commission: -${order.commission_amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {completedOrders.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No completed orders yet</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Restaurant Modal */}
        <AnimatePresence>
          {showRestaurantModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowRestaurantModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {myRestaurant ? 'Edit Restaurant' : 'Create Restaurant'}
                  </h2>
                  <button onClick={() => setShowRestaurantModal(false)} className="text-gray-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Restaurant Name</label>
                    <Input
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm({...restaurantForm, name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Description</label>
                    <Textarea
                      value={restaurantForm.description}
                      onChange={(e) => setRestaurantForm({...restaurantForm, description: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Cuisine Type</label>
                    <Select value={restaurantForm.cuisine_type} onValueChange={(v) => setRestaurantForm({...restaurantForm, cuisine_type: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="american">American</SelectItem>
                        <SelectItem value="italian">Italian</SelectItem>
                        <SelectItem value="chinese">Chinese</SelectItem>
                        <SelectItem value="mexican">Mexican</SelectItem>
                        <SelectItem value="japanese">Japanese</SelectItem>
                        <SelectItem value="thai">Thai</SelectItem>
                        <SelectItem value="indian">Indian</SelectItem>
                        <SelectItem value="mediterranean">Mediterranean</SelectItem>
                        <SelectItem value="fast_food">Fast Food</SelectItem>
                        <SelectItem value="seafood">Seafood</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="bbq">BBQ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Delivery Fee ($)</label>
                      <Input
                        type="number"
                        value={restaurantForm.delivery_fee}
                        onChange={(e) => setRestaurantForm({...restaurantForm, delivery_fee: Number(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Min Order ($)</label>
                      <Input
                        type="number"
                        value={restaurantForm.min_order}
                        onChange={(e) => setRestaurantForm({...restaurantForm, min_order: Number(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Estimated Delivery Time</label>
                    <Input
                      value={restaurantForm.estimated_delivery_time}
                      onChange={(e) => setRestaurantForm({...restaurantForm, estimated_delivery_time: e.target.value})}
                      placeholder="25-35 min"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Address</label>
                      <Input
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({...restaurantForm, address: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Phone</label>
                      <Input
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({...restaurantForm, phone: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Restaurant Image</label>
                    {restaurantForm.image_url && (
                      <img src={restaurantForm.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], 'image_url', true)}
                      className="hidden"
                      id="restaurant-image"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('restaurant-image').click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={restaurantForm.is_open}
                      onChange={(e) => setRestaurantForm({...restaurantForm, is_open: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <label className="text-white">Restaurant is currently open</label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowRestaurantModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveRestaurant}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      Save Restaurant
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Item Modal */}
        <AnimatePresence>
          {showMenuModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowMenuModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                  </h2>
                  <button onClick={() => setShowMenuModal(false)} className="text-gray-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Item Name</label>
                    <Input
                      value={menuItemForm.name}
                      onChange={(e) => setMenuItemForm({...menuItemForm, name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Description</label>
                    <Textarea
                      value={menuItemForm.description}
                      onChange={(e) => setMenuItemForm({...menuItemForm, description: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Price ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={menuItemForm.price}
                        onChange={(e) => setMenuItemForm({...menuItemForm, price: Number(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Category</label>
                      <Select value={menuItemForm.category} onValueChange={(v) => setMenuItemForm({...menuItemForm, category: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appetizers">Appetizers</SelectItem>
                          <SelectItem value="mains">Mains</SelectItem>
                          <SelectItem value="sides">Sides</SelectItem>
                          <SelectItem value="desserts">Desserts</SelectItem>
                          <SelectItem value="drinks">Drinks</SelectItem>
                          <SelectItem value="specials">Specials</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Prep Time</label>
                    <Input
                      value={menuItemForm.prep_time}
                      onChange={(e) => setMenuItemForm({...menuItemForm, prep_time: e.target.value})}
                      placeholder="10-15 min"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Item Image</label>
                    {menuItemForm.image_url && (
                      <img src={menuItemForm.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], 'image_url')}
                      className="hidden"
                      id="menu-item-image"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('menu-item-image').click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={menuItemForm.is_available}
                      onChange={(e) => setMenuItemForm({...menuItemForm, is_available: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <label className="text-white">Available for order</label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowMenuModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveMenuItem}
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                    >
                      {editingMenuItem ? 'Update' : 'Add'} Item
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}