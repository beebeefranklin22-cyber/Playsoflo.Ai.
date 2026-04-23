import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, BarChart3, AlertTriangle, Upload } from "lucide-react";
import InventoryProductList from "@/components/inventory/InventoryProductList";
import InventoryAlerts from "@/components/inventory/InventoryAlerts";
import InventoryBulkImport from "@/components/inventory/InventoryBulkImport";
import InventoryAnalytics from "@/components/inventory/InventoryAnalytics";
import { useQuery } from "@tanstack/react-query";

export default function InventoryManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["inventory-products", currentUser?.email],
    queryFn: () => base44.entities.InventoryProduct.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  const alertCount = products.filter(p =>
    p.status === "active" && p.track_inventory &&
    (p.stock_quantity === 0 || p.stock_quantity <= (p.low_stock_threshold || 5))
  ).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            Inventory Manager
          </h1>
          <p className="text-gray-400 mt-1">
            Track stock, manage products, get restocking alerts — for restaurants, retailers, clothing stores, grocery, and more.
          </p>
        </div>

        {/* Alert Banner */}
        {alertCount > 0 && (
          <div
            className="mb-5 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-red-500/15 transition"
            onClick={() => setActiveTab("alerts")}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-white font-medium">
                {alertCount} product{alertCount !== 1 ? "s" : ""} need{alertCount === 1 ? "s" : ""} restocking
              </p>
            </div>
            <span className="text-red-400 text-sm font-semibold">View Alerts →</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 mb-6 h-auto gap-1 p-1 flex-wrap">
            <TabsTrigger value="products" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg">
              <Package className="w-4 h-4 mr-2" /> Products
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg relative">
              <AlertTriangle className="w-4 h-4 mr-2" /> Alerts
              {alertCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg">
              <Upload className="w-4 h-4 mr-2" /> Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <InventoryProductList currentUser={currentUser} />
          </TabsContent>
          <TabsContent value="analytics">
            <InventoryAnalytics currentUser={currentUser} />
          </TabsContent>
          <TabsContent value="alerts">
            <InventoryAlerts currentUser={currentUser} />
          </TabsContent>
          <TabsContent value="import">
            <InventoryBulkImport currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}