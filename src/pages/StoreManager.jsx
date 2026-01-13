import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Settings, BarChart3 } from "lucide-react";
import ProductManagementDashboard from "../components/store/ProductManagementDashboard";
import StoreBrandingSettings from "../components/store/StoreBrandingSettings";

export default function StoreManager() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Store Manager</h1>
          <p className="text-gray-400">Manage your products, branding, and inventory</p>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="products" className="data-[state=active]:bg-purple-600">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManagementDashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="branding">
            <StoreBrandingSettings currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}