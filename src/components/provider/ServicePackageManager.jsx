import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Package, DollarSign, Percent, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ServicePackageManager({ myServices, currentUser }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [packageForm, setPackageForm] = useState({
    package_name: "",
    description: "",
    included_services: [],
    discount_percentage: 15,
    total_value: 0,
    package_price: 0
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MarketplaceItem.create({
        title: data.package_name,
        category: "service_package",
        description: data.description,
        price: data.package_price,
        price_type: "fixed",
        image_url: data.included_services[0]?.image_url || "",
        package_details: {
          is_package: true,
          included_service_ids: data.included_services.map(s => s.id),
          included_services: data.included_services.map(s => ({
            id: s.id,
            title: s.title,
            price: s.price
          })),
          total_value: data.total_value,
          discount_percentage: data.discount_percentage,
          savings: data.total_value - data.package_price
        },
        provider_email: currentUser?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
      toast.success("Service package created!");
      setShowCreate(false);
      setPackageForm({
        package_name: "",
        description: "",
        included_services: [],
        discount_percentage: 15,
        total_value: 0,
        package_price: 0
      });
    }
  });

  const toggleServiceInPackage = (service) => {
    const isIncluded = packageForm.included_services.some(s => s.id === service.id);
    
    let newServices;
    if (isIncluded) {
      newServices = packageForm.included_services.filter(s => s.id !== service.id);
    } else {
      newServices = [...packageForm.included_services, service];
    }

    const totalValue = newServices.reduce((sum, s) => sum + (s.price || 0), 0);
    const discountAmount = totalValue * (packageForm.discount_percentage / 100);
    const packagePrice = totalValue - discountAmount;

    setPackageForm({
      ...packageForm,
      included_services: newServices,
      total_value: totalValue,
      package_price: Math.round(packagePrice * 100) / 100
    });
  };

  const updateDiscount = (discount) => {
    const discountAmount = packageForm.total_value * (discount / 100);
    const packagePrice = packageForm.total_value - discountAmount;

    setPackageForm({
      ...packageForm,
      discount_percentage: discount,
      package_price: Math.round(packagePrice * 100) / 100
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-400" />
          Service Packages & Bundles
        </h3>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Package
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Build Your Service Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Package name (e.g., 'Ultimate Wellness Bundle')"
              value={packageForm.package_name}
              onChange={(e) => setPackageForm({...packageForm, package_name: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />

            <Input
              placeholder="Package description"
              value={packageForm.description}
              onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Select Services to Include</label>
              <div className="grid md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {myServices.filter(s => !s.package_details?.is_package).map((service) => {
                  const isIncluded = packageForm.included_services.some(s => s.id === service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleServiceInPackage(service)}
                      className={`p-3 rounded-lg border-2 transition text-left ${
                        isIncluded
                          ? 'bg-purple-500/30 border-purple-500'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{service.title}</p>
                          <p className="text-gray-400 text-xs">${service.price}</p>
                        </div>
                        {isIncluded && <Package className="w-4 h-4 text-purple-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {packageForm.included_services.length > 0 && (
              <>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Discount Percentage
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="5"
                      max="50"
                      value={packageForm.discount_percentage}
                      onChange={(e) => updateDiscount(Number(e.target.value))}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <span className="text-white">%</span>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Value</span>
                    <span className="text-white font-bold">${packageForm.total_value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount ({packageForm.discount_percentage}%)</span>
                    <span className="text-green-400">-${(packageForm.total_value - packageForm.package_price).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-2 flex justify-between">
                    <span className="text-white font-bold">Package Price</span>
                    <span className="text-xl font-bold text-purple-400">${packageForm.package_price.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => createPackageMutation.mutate(packageForm)}
                  disabled={!packageForm.package_name || packageForm.included_services.length < 2}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Create Package
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}