import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Car, Truck, Bike, Upload, CheckCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function VehicleManagementModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: 'car',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    license_plate: '',
    max_capacity_lbs: 500,
    cargo_space_cubic_ft: 15,
    can_transport: ['envelope', 'small_box', 'medium_box', 'documents'],
    vehicle_photos: []
  });

  const { data: myVehicles = [] } = useQuery({
    queryKey: ['my-delivery-vehicles', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.DeliveryVehicle.filter({
        driver_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const addVehicleMutation = useMutation({
    mutationFn: async (vehicleData) => {
      return await base44.entities.DeliveryVehicle.create({
        ...vehicleData,
        driver_email: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-delivery-vehicles'] });
      setShowAddForm(false);
      setFormData({
        vehicle_type: 'car',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        license_plate: '',
        max_capacity_lbs: 500,
        cargo_space_cubic_ft: 15,
        can_transport: ['envelope', 'small_box', 'medium_box', 'documents'],
        vehicle_photos: []
      });
      toast.success('Vehicle added successfully!');
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId) => {
      await base44.entities.DeliveryVehicle.delete(vehicleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-delivery-vehicles'] });
      toast.success('Vehicle deleted');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ vehicleId, isActive }) => {
      await base44.entities.DeliveryVehicle.update(vehicleId, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-delivery-vehicles'] });
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        vehicle_photos: [...prev.vehicle_photos, file_url]
      }));
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
  };

  const vehicleIcons = {
    car: Car,
    van: Truck,
    truck: Truck,
    motorcycle: Bike,
    bike: Bike
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">My Vehicles</h2>
              <p className="text-blue-100 text-sm">Manage your delivery fleet</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!showAddForm ? (
            <>
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full bg-green-600 hover:bg-green-700 mb-6 py-6"
              >
                <Car className="w-5 h-5 mr-2" />
                Add New Vehicle
              </Button>

              {myVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <Car className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No vehicles registered</h3>
                  <p className="text-gray-400">Add your first vehicle to start accepting deliveries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myVehicles.map((vehicle) => {
                    const Icon = vehicleIcons[vehicle.vehicle_type] || Car;
                    return (
                      <div key={vehicle.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-start gap-4">
                          {vehicle.vehicle_photos?.[0] ? (
                            <img src={vehicle.vehicle_photos[0]} className="w-24 h-24 object-cover rounded-lg" />
                          ) : (
                            <div className="w-24 h-24 bg-white/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-white font-bold text-lg">
                                  {vehicle.make} {vehicle.model} ({vehicle.year})
                                </h3>
                                <p className="text-gray-400 text-sm">{vehicle.license_plate}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleActiveMutation.mutate({ 
                                    vehicleId: vehicle.id, 
                                    isActive: vehicle.is_active 
                                  })}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                    vehicle.is_active 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}
                                >
                                  {vehicle.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this vehicle?')) {
                                      deleteVehicleMutation.mutate(vehicle.id);
                                    }
                                  }}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-gray-400">Type</p>
                                <p className="text-white font-semibold capitalize">{vehicle.vehicle_type}</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Capacity</p>
                                <p className="text-white font-semibold">{vehicle.max_capacity_lbs} lbs</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Cargo Space</p>
                                <p className="text-white font-semibold">{vehicle.cargo_space_cubic_ft} ft³</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Deliveries</p>
                                <p className="text-white font-semibold">{vehicle.total_deliveries || 0}</p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              {vehicle.insurance_verified && (
                                <div className="px-2 py-1 bg-green-500/20 rounded-md text-green-400 text-xs flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Insurance Verified
                                </div>
                              )}
                              {vehicle.registration_verified && (
                                <div className="px-2 py-1 bg-blue-500/20 rounded-md text-blue-400 text-xs flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Registration Verified
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-white font-bold text-xl mb-4">Add New Vehicle</h3>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Vehicle Type</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bike">Bike</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  placeholder="Make (e.g., Toyota)"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="Model (e.g., Camry)"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  type="number"
                  placeholder="Year"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="Color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="License Plate *"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Max Capacity (lbs)</label>
                  <Input
                    type="number"
                    value={formData.max_capacity_lbs}
                    onChange={(e) => setFormData({ ...formData, max_capacity_lbs: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Cargo Space (cubic ft)</label>
                  <Input
                    type="number"
                    value={formData.cargo_space_cubic_ft}
                    onChange={(e) => setFormData({ ...formData, cargo_space_cubic_ft: Number(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Vehicle Photos (Optional)</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {formData.vehicle_photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          vehicle_photos: prev.vehicle_photos.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  id="vehicle-photo"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        setFormData(prev => ({
                          ...prev,
                          vehicle_photos: [...prev.vehicle_photos, file_url]
                        }));
                        toast.success('Photo uploaded');
                      } catch {
                        toast.error('Upload failed');
                      }
                    }
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('vehicle-photo').click()}
                  className="w-full bg-white/5 border-white/20"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => addVehicleMutation.mutate(formData)}
                  disabled={!formData.license_plate || addVehicleMutation.isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {addVehicleMutation.isLoading ? 'Adding...' : 'Add Vehicle'}
                </Button>
              </div>
            </motion.div>
          )}

          {!showAddForm && myVehicles.length > 0 && (
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm">
                💡 <strong>Tip:</strong> Vehicles with verified insurance and registration get priority for high-value deliveries.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}