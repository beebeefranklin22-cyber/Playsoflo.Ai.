import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Truck, CheckCircle2, Clock, XCircle, RotateCcw, Edit2, Save, X, Plus, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  ordered:          { label: "Ordered",           color: "text-blue-400",   bg: "bg-blue-500/20 border-blue-500/30",   icon: Clock },
  shipped:          { label: "Shipped",            color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/30", icon: Truck },
  out_for_delivery: { label: "Out for Delivery",  color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30", icon: Truck },
  delivered:        { label: "Delivered",          color: "text-green-400",  bg: "bg-green-500/20 border-green-500/30",  icon: CheckCircle2 },
  cancelled:        { label: "Cancelled",          color: "text-red-400",    bg: "bg-red-500/20 border-red-500/30",      icon: XCircle },
  returned:         { label: "Returned",           color: "text-gray-400",   bg: "bg-gray-500/20 border-gray-500/30",    icon: RotateCcw },
};

const CARRIERS = ["Amazon", "UPS", "FedEx", "USPS", "DHL", "Other"];
const STATUSES = Object.keys(STATUS_CONFIG);

export default function AmazonOrders() {
  const [user, setUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ product_title: "", price: "", status: "ordered", tracking_number: "", carrier: "Amazon", notes: "", product_category: "" });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["amazon-orders", user?.email],
    queryFn: () => base44.entities.AmazonOrder.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AmazonOrder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["amazon-orders"]); setEditingId(null); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AmazonOrder.create({ ...data, user_email: user.email, price: parseFloat(data.price) || 0 }),
    onSuccess: () => { queryClient.invalidateQueries(["amazon-orders"]); setShowAddModal(false); setAddForm({ product_title: "", price: "", status: "ordered", tracking_number: "", carrier: "Amazon", notes: "", product_category: "" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AmazonOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["amazon-orders"]),
  });

  const startEdit = (order) => {
    setEditingId(order.id);
    setEditForm({ tracking_number: order.tracking_number || "", carrier: order.carrier || "Amazon", status: order.status || "ordered", notes: order.notes || "" });
  };

  const saveEdit = (id) => updateMutation.mutate({ id, data: editForm });

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950/20 to-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-white font-semibold">Sign in to view your orders</p>
        <button onClick={() => base44.auth.redirectToLogin()} className="mt-3 px-6 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold">Sign In</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-orange-950/20 to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-black/60 border-b border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-none">My Amazon Orders</h1>
              <p className="text-gray-400 text-xs mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} tracked</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/AmazonStore" className="text-orange-400 text-sm hover:text-orange-300 transition flex items-center gap-1">
              Shop <ExternalLink className="w-3 h-3" />
            </Link>
            <Button onClick={() => setShowAddModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 h-auto">
              <Plus className="w-4 h-4 mr-1" /> Add Order
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-14 h-14 text-gray-700 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-1">No orders yet</p>
            <p className="text-gray-400 text-sm mb-4">After buying from the Amazon store, track your orders here.</p>
            <Link to="/AmazonStore">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">Browse Amazon Store</Button>
            </Link>
          </div>
        )}

        {orders.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ordered;
          const StatusIcon = cfg.icon;
          const isEditing = editingId === order.id;

          return (
            <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Order header */}
              <div className="p-4 flex items-start gap-3">
                {order.product_image ? (
                  <img src={order.product_image} alt={order.product_title} className="w-16 h-16 object-contain rounded-xl bg-white/10 p-1 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-7 h-7 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm leading-snug line-clamp-2">{order.product_title}</p>
                  {order.product_category && <p className="text-gray-500 text-xs mt-0.5">{order.product_category}</p>}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-orange-400 font-bold text-sm">${parseFloat(order.price || 0).toFixed(2)}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Ordered {new Date(order.created_date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {order.affiliate_url && (
                    <a href={order.affiliate_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 hover:bg-white/10 rounded-lg transition" title="View on Amazon">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  <button onClick={() => isEditing ? setEditingId(null) : startEdit(order)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition">
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => { if (confirm("Remove this order?")) deleteMutation.mutate(order.id); }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Tracking info (non-edit) */}
              {!isEditing && order.tracking_number && (
                <div className="px-4 pb-3 flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{order.carrier}:</span>
                  <span className="text-white font-mono font-medium">{order.tracking_number}</span>
                </div>
              )}
              {!isEditing && order.notes && (
                <div className="px-4 pb-3">
                  <p className="text-gray-400 text-xs italic">{order.notes}</p>
                </div>
              )}

              {/* Edit form */}
              {isEditing && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none">
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Carrier</label>
                      <select value={editForm.carrier} onChange={e => setEditForm(f => ({ ...f, carrier: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none">
                        {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Tracking Number</label>
                    <Input value={editForm.tracking_number} onChange={e => setEditForm(f => ({ ...f, tracking_number: e.target.value }))}
                      placeholder="Enter tracking number..." className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                    <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any notes about this order..." className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditingId(null)} className="border-white/20 text-white h-8 text-sm">Cancel</Button>
                    <Button onClick={() => saveEdit(order.id)} disabled={updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-sm">
                      <Save className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-bold text-lg">Add Amazon Order</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Product Name *</label>
              <Input value={addForm.product_title} onChange={e => setAddForm(f => ({ ...f, product_title: e.target.value }))}
                placeholder="e.g. Apple AirPods Pro" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Price Paid ($)</label>
                <Input type="number" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00" className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Category</label>
                <Input value={addForm.product_category} onChange={e => setAddForm(f => ({ ...f, product_category: e.target.value }))}
                  placeholder="Electronics..." className="bg-white/10 border-white/20 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Status</label>
                <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Carrier</label>
                <select value={addForm.carrier} onChange={e => setAddForm(f => ({ ...f, carrier: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none">
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Tracking Number</label>
              <Input value={addForm.tracking_number} onChange={e => setAddForm(f => ({ ...f, tracking_number: e.target.value }))}
                placeholder="Optional" className="bg-white/10 border-white/20 text-white" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Notes</label>
              <Input value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..." className="bg-white/10 border-white/20 text-white" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 border-white/20 text-white">Cancel</Button>
              <Button onClick={() => createMutation.mutate(addForm)} disabled={!addForm.product_title || createMutation.isPending}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                Add Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}