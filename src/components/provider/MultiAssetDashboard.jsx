import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Home, Car, Utensils, Plane, Ship, Store, Building, Video,
  TrendingUp, Package, Calendar, DollarSign, Search, Filter,
  Grid3x3, List, BarChart3, Eye, Edit, Trash2, Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const assetTypeIcons = {
  property_rental: Home,
  car_rental: Car,
  restaurant: Utensils,
  private_aviation: Plane,
  yacht_charter: Ship,
  retail: Store,
  real_estate: Building,
  video_production: Video,
  default: Package
};

export default function MultiAssetDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");

  const { data: allAssets = [], isLoading } = useQuery({
    queryKey: ['provider-all-assets', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const services = await base44.entities.MarketplaceItem.filter({
        provider_email: currentUser.email
      });
      return services;
    },
    enabled: !!currentUser
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-all-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  // Group assets by category
  const assetsByCategory = allAssets.reduce((acc, asset) => {
    const cat = asset.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  // Calculate metrics per asset
  const assetMetrics = allAssets.map(asset => {
    const assetBookings = bookings.filter(b => b.service_id === asset.id);
    const revenue = assetBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
    const activeBookings = assetBookings.filter(b => 
      b.status === 'confirmed' || b.status === 'pending'
    ).length;

    return {
      ...asset,
      revenue,
      activeBookings,
      totalBookings: assetBookings.length
    };
  });

  // Filter and sort
  const filteredAssets = assetMetrics
    .filter(asset => {
      const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'bookings') return b.totalBookings - a.totalBookings;
      if (sortBy === 'price') return b.price - a.price;
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const totalRevenue = assetMetrics.reduce((sum, a) => sum + a.revenue, 0);
  const totalActiveBookings = assetMetrics.reduce((sum, a) => sum + a.activeBookings, 0);

  const AssetCard = ({ asset }) => {
    const Icon = assetTypeIcons[asset.category] || assetTypeIcons.default;
    
    return (
      <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
        <CardContent className="p-0">
          <div className="relative h-48 overflow-hidden rounded-t-xl">
            <img 
              src={asset.image_url} 
              alt={asset.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            
            <div className="absolute top-3 right-3 flex gap-2">
              <Badge className={`${
                asset.activeBookings > 0 
                  ? 'bg-green-500/30 text-green-300' 
                  : 'bg-gray-500/30 text-gray-300'
              }`}>
                <Icon className="w-3 h-3 mr-1" />
                {asset.category?.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                {asset.title}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-xl">
                  ${asset.price}
                </span>
                {asset.activeBookings > 0 && (
                  <Badge className="bg-blue-500/30 text-blue-300">
                    {asset.activeBookings} Active
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <div className="text-green-400 font-bold">${asset.revenue.toFixed(0)}</div>
                <div className="text-gray-400">Revenue</div>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <div className="text-blue-400 font-bold">{asset.totalBookings}</div>
                <div className="text-gray-400">Bookings</div>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <div className="text-purple-400 font-bold">
                  {asset.is_rental ? 'Rental' : 'Service'}
                </div>
                <div className="text-gray-400">Type</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-white/5 border-white/20"
                onClick={() => navigate(createPageUrl("ProviderHub") + "?tab=services&edit=" + asset.id)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-white/5 border-white/20"
                onClick={() => navigate(createPageUrl("ProviderHub") + "?tab=earnings&asset=" + asset.id)}
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Stats
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{allAssets.length}</div>
            <div className="text-purple-300 text-sm">Total Assets</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">${totalRevenue.toFixed(0)}</div>
            <div className="text-green-300 text-sm">Total Revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{totalActiveBookings}</div>
            <div className="text-blue-300 text-sm">Active Bookings</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {Object.keys(assetsByCategory).length}
            </div>
            <div className="text-yellow-300 text-sm">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(assetsByCategory).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')} ({assetsByCategory[cat].length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date">Newest First</SelectItem>
                <SelectItem value="revenue">Highest Revenue</SelectItem>
                <SelectItem value="bookings">Most Bookings</SelectItem>
                <SelectItem value="price">Highest Price</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 border-l border-white/20 pl-3">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-purple-600' : 'bg-white/5 border-white/20'}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-purple-600' : 'bg-white/5 border-white/20'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={() => navigate(createPageUrl("ProviderHub") + "?tab=services")}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid/List */}
      {isLoading ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <div className="text-gray-400">Loading assets...</div>
          </CardContent>
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Assets Found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || filterCategory !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Start adding your first asset to get started'}
            </p>
            <Button
              onClick={() => navigate(createPageUrl("ProviderHub") + "?tab=services")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredAssets.map(asset => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Category Breakdown */}
      {Object.keys(assetsByCategory).length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(assetsByCategory).map(([category, assets]) => {
                const Icon = assetTypeIcons[category] || assetTypeIcons.default;
                const categoryRevenue = assets.reduce((sum, a) => {
                  const assetBookings = bookings.filter(b => b.service_id === a.id && b.status === 'completed');
                  return sum + assetBookings.reduce((s, b) => s + (b.total_price || 0), 0);
                }, 0);

                return (
                  <div
                    key={category}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition cursor-pointer"
                    onClick={() => setFilterCategory(category)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold capitalize">
                          {category.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-gray-400 text-sm">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-green-400 font-bold text-lg">
                      ${categoryRevenue.toFixed(0)}
                    </div>
                    <div className="text-gray-400 text-xs">Total Revenue</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}