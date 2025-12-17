import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Building, MapPin, Users, TrendingUp, Plus, 
  Edit, ArrowLeft, Package, DollarSign, Star, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function FranchiseHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    franchise_name: '',
    location_address: '',
    location_coords: [25.7617, -80.1918],
    service_radius_miles: 10,
    logo_url: '',
    brand_color: '#3B82F6',
    contact_phone: '',
    contact_email: ''
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: myFranchises = [] } = useQuery({
    queryKey: ['my-franchises', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.DeliveryFranchise.filter({
        owner_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const createFranchiseMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.DeliveryFranchise.create({
        ...data,
        owner_email: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-franchises'] });
      setShowCreateForm(false);
      toast.success('Franchise created successfully!');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 pb-24">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex items-center gap-2 text-white mb-4 hover:opacity-80 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Building className="w-8 h-8" />
                Franchise Management
              </h1>
              <p className="text-cyan-100">Manage your delivery franchises</p>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-white/20 hover:bg-white/30"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Franchise
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {showCreateForm ? (
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-white font-bold text-xl mb-4">Create New Franchise</h2>
              
              <Input
                placeholder="Franchise Name *"
                value={formData.franchise_name}
                onChange={(e) => setFormData({ ...formData, franchise_name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Textarea
                placeholder="Hub Address *"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Service Radius (miles)"
                  value={formData.service_radius_miles}
                  onChange={(e) => setFormData({ ...formData, service_radius_miles: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="Brand Color (hex)"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Contact Phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="Contact Email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createFranchiseMutation.mutate(formData)}
                  disabled={!formData.franchise_name || !formData.location_address}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Create Franchise
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myFranchises.map((franchise) => (
              <Card key={franchise.id} className="bg-white/10 border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-xl mb-1">
                        {franchise.franchise_name}
                      </h3>
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {franchise.location_address}
                      </p>
                    </div>
                    <Badge className={franchise.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20'}>
                      {franchise.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-400">Deliveries</p>
                      <p className="text-white font-bold text-lg">{franchise.total_deliveries || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Drivers</p>
                      <p className="text-white font-bold text-lg">{franchise.total_drivers || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Radius</p>
                      <p className="text-white font-bold">{franchise.service_radius_miles} mi</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Rating</p>
                      <p className="text-yellow-400 font-bold flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400" />
                        {franchise.average_rating?.toFixed(1) || '5.0'}
                      </p>
                    </div>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Edit className="w-4 h-4 mr-2" />
                    Manage Franchise
                  </Button>
                </CardContent>
              </Card>
            ))}

            {myFranchises.length === 0 && (
              <div className="col-span-full text-center py-20">
                <Building className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">No Franchises Yet</h3>
                <p className="text-gray-400 mb-6">Create your first delivery franchise to get started</p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Franchise
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}