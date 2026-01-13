import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Palette, Image as ImageIcon, Save, Eye } from "lucide-react";
import { toast } from "sonner";

export default function StoreBrandingSettings({ currentUser }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    store_name: "",
    store_description: "",
    logo_url: "",
    banner_url: "",
    primary_color: "#8B5CF6",
    secondary_color: "#EC4899",
    store_category: "retail",
    low_stock_threshold: 5,
    featured_products: []
  });

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings', currentUser?.email],
    queryFn: async () => {
      const existing = await base44.entities.StoreSettings.filter({
        owner_email: currentUser.email
      });
      return existing[0] || null;
    },
    enabled: !!currentUser
  });

  useEffect(() => {
    if (storeSettings) {
      setSettings(storeSettings);
    }
  }, [storeSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (storeSettings?.id) {
        return await base44.entities.StoreSettings.update(storeSettings.id, data);
      } else {
        return await base44.entities.StoreSettings.create({
          ...data,
          owner_email: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['store-settings']);
      toast.success("Settings saved!");
    }
  });

  const handleImageUpload = async (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      toast.info("Uploading...");
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setSettings(prev => ({ ...prev, [type]: file_url }));
        toast.success("Image uploaded!");
      } catch {
        toast.error("Upload failed");
      }
    };
    input.click();
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Store Branding</h2>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Preview Card */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Store Preview</h3>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ 
            background: `linear-gradient(135deg, ${settings.primary_color}20, ${settings.secondary_color}20)`,
            borderColor: settings.primary_color + '50'
          }}>
            {settings.banner_url && (
              <img src={settings.banner_url} className="w-full h-32 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                {settings.logo_url ? (
                  <img src={settings.logo_url} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-white text-2xl font-bold">{settings.store_name || "Your Store"}</h2>
                  <p className="text-gray-300 text-sm">{settings.store_description || "Store description"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-white font-semibold text-lg mb-4">Basic Information</h3>
          
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Store Name</label>
            <Input
              value={settings.store_name}
              onChange={(e) => setSettings(prev => ({ ...prev, store_name: e.target.value }))}
              placeholder="My Awesome Store"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Store Description</label>
            <Textarea
              value={settings.store_description}
              onChange={(e) => setSettings(prev => ({ ...prev, store_description: e.target.value }))}
              placeholder="Tell customers about your store..."
              rows={3}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Category</label>
            <select
              value={settings.store_category}
              onChange={(e) => setSettings(prev => ({ ...prev, store_category: e.target.value }))}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="restaurant">Restaurant</option>
              <option value="retail">Retail</option>
              <option value="grocery">Grocery</option>
              <option value="electronics">Electronics</option>
              <option value="fashion">Fashion</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            Visual Branding
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Logo</label>
              <div className="flex items-center gap-3">
                {settings.logo_url && (
                  <img src={settings.logo_url} className="w-16 h-16 rounded-full object-cover" />
                )}
                <Button
                  onClick={() => handleImageUpload('logo_url')}
                  variant="outline"
                  className="bg-white/5"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Banner</label>
              <div className="flex items-center gap-3">
                {settings.banner_url && (
                  <img src={settings.banner_url} className="w-24 h-16 rounded object-cover" />
                )}
                <Button
                  onClick={() => handleImageUpload('banner_url')}
                  variant="outline"
                  className="bg-white/5"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Banner
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-16 h-10 rounded cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-16 h-10 rounded cursor-pointer"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-white font-semibold text-lg mb-4">Inventory Settings</h3>
          
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Low Stock Alert Threshold</label>
            <Input
              type="number"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) }))}
              className="bg-white/10 border-white/20 text-white"
            />
            <p className="text-gray-500 text-xs mt-1">Get notified when stock falls below this number</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}