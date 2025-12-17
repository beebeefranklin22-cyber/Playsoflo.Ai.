import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car, Plus, DollarSign, TrendingUp, BarChart3,
  Calendar, Settings, Eye, Edit, Trash2, Upload, Brain
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AddCarModal from "../components/car/AddCarModal";
import EditCarModal from "../components/car/EditCarModal";
import BulkUploadModal from "../components/car/BulkUploadModal";
import BulkCarUpload from "../components/car/BulkCarUpload";
import FleetAnalytics from "../components/car/FleetAnalytics";
import AvailabilityCalendar from "../components/car/AvailabilityCalendar";
import MaintenanceAlert from "../components/car/MaintenanceAlert";
import PricingOptimizer from "../components/car/PricingOptimizer";
import FleetAIAssistant from "../components/fleet/FleetAIAssistant";
import FleetDisputeResolution from "../components/fleet/FleetDisputeResolution";
import FleetInsightsModule from "../components/fleet/FleetInsightsModule";
import FleetDashboard from "../components/fleet/FleetDashboard";
import ProviderOnboardingFlow from "../components/onboarding/ProviderOnboardingFlow";
import FeatureTooltip from "../components/onboarding/FeatureTooltip";
import HelpModal from "../components/onboarding/HelpModal";

export default function FleetManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedCarForCalendar, setSelectedCarForCalendar] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Check if onboarding needed
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!currentUser) return;
      
      const onboarding = await base44.entities.ProviderOnboarding.filter({
        user_email: currentUser.email,
        provider_type: 'car_rental'
      });

      if (onboarding.length === 0 || !onboarding[0].onboarding_completed) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, [currentUser]);

  const { data: myCars = [] } = useQuery({
    queryKey: ['my-fleet', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MarketplaceItem.filter({
        created_by: currentUser.email,
        category: "automotive"
      });
    },
    enabled: !!currentUser,
    initialData: [],
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  const { data: myRentals = [] } = useQuery({
    queryKey: ['owner-rentals', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CarRental.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: [],
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  const deleteCarMutation = useMutation({
    mutationFn: async (carId) => {
      await base44.entities.MarketplaceItem.delete(carId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-fleet']);
      toast.success("Vehicle deleted successfully");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete vehicle");
    }
  });

  const activeRentals = myRentals.filter(r => ['confirmed', 'active'].includes(r.status));
  const totalEarnings = myRentals
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  
  const availableCars = myCars.filter(c => c.availability === 'available');
  const utilizationRate = myCars.length > 0 ? ((activeRentals.length / myCars.length) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-green-950 via-emerald-950 to-green-950 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Fleet Manager</h1>
            <p className="text-gray-300 text-lg">Manage your rental car fleet efficiently</p>
          </div>
          <div className="flex gap-3">
            <FeatureTooltip
              id="fleet-ai-assistant"
              title="AI Fleet Assistant"
              description="Get AI-powered insights on pricing, maintenance scheduling, and customer inquiries. Ask questions about your fleet performance."
              currentUser={currentUser}
            >
              <Button
                onClick={() => setShowAIAssistant(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
            </FeatureTooltip>

            <FeatureTooltip
              id="fleet-bulk-upload"
              title="Bulk Upload"
              description="Upload multiple vehicles at once using a CSV file. Download the template, fill it out, and upload your entire fleet in seconds."
              currentUser={currentUser}
            >
              <Button
                onClick={() => setShowBulkUpload(true)}
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </FeatureTooltip>

            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Car className="w-8 h-8 text-blue-400" />
                <Badge className="bg-blue-500/30 text-blue-200">Active</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{myCars.length}</div>
              <div className="text-gray-300 text-sm">Total Vehicles</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-400" />
                <Badge className="bg-green-500/30 text-green-200">Revenue</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${totalEarnings.toFixed(0)}
              </div>
              <div className="text-gray-300 text-sm">Total Earnings</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-purple-400" />
                <Badge className="bg-purple-500/30 text-purple-200">Live</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{activeRentals.length}</div>
              <div className="text-gray-300 text-sm">Active Rentals</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <Badge className="bg-orange-500/30 text-orange-200">Available</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{availableCars.length}</div>
              <div className="text-gray-300 text-sm">Ready to Rent</div>
            </CardContent>
          </Card>
        </div>

        {/* AI-Powered Insights */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <MaintenanceAlert cars={myCars} rentals={myRentals} />
          <PricingOptimizer cars={myCars} rentals={myRentals} />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="fleet">My Fleet</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <FleetDashboard cars={myCars} rentals={myRentals} />
          </TabsContent>

          <TabsContent value="fleet" className="space-y-4">
            {myCars.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Car className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">No vehicles yet</h3>
                  <p className="text-gray-400 mb-6">Add your first vehicle to start earning</p>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Vehicle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCars.map((car) => {
                  const carRentals = myRentals.filter(r => r.car_model === car.title);
                  const revenue = carRentals
                    .filter(r => r.status === 'completed')
                    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

                  return (
                    <motion.div
                      key={car.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/10 transition">
                        <div className="relative h-48">
                          <img 
                            src={car.image_url} 
                            alt={car.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3">
                            <Badge className={
                              car.availability === 'available' 
                                ? 'bg-green-500/90 text-white' 
                                : 'bg-red-500/90 text-white'
                            }>
                              {car.availability}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-white font-bold text-lg mb-2">{car.title}</h3>
                          
                          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                            <div>
                              <p className="text-gray-400">Daily Rate</p>
                              <p className="text-white font-bold">${car.price}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Revenue</p>
                              <p className="text-green-400 font-bold">${revenue.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Rentals</p>
                              <p className="text-white font-bold">{carRentals.length}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Active Now</p>
                              <p className="text-purple-400 font-bold">
                                {carRentals.filter(r => r.status === 'active').length}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCarForCalendar(car)}
                              className="flex-1 bg-white/5"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Calendar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCar(car);
                                setShowEditModal(true);
                              }}
                              className="flex-1 bg-white/5"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Delete this vehicle?')) {
                                  deleteCarMutation.mutate(car.id);
                                }
                              }}
                              className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights">
            <FleetInsightsModule cars={myCars} rentals={myRentals} />
          </TabsContent>

          <TabsContent value="analytics">
            <FleetAnalytics cars={myCars} rentals={myRentals} />
            
            {/* Dispute Resolution */}
            <div className="mt-6">
              <FleetDisputeResolution rentals={myRentals} cars={myCars} />
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            {selectedCarForCalendar ? (
              <AvailabilityCalendar 
                car={selectedCarForCalendar} 
                rentals={myRentals}
                onClose={() => setSelectedCarForCalendar(null)}
              />
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Select a vehicle</h3>
                  <p className="text-gray-400">Go to "My Fleet" and click Calendar on any vehicle</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddCarModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          queryClient.invalidateQueries(['my-fleet']);
        }}
      />

      {selectedCar && (
        <EditCarModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCar(null);
          }}
          car={selectedCar}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCar(null);
            queryClient.invalidateQueries(['my-fleet']);
          }}
        />
      )}

      {showBulkUpload && (
        <BulkCarUpload
          currentUser={currentUser}
          onClose={() => setShowBulkUpload(false)}
        />
      )}

      <FleetAIAssistant
        open={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        fleetData={{
          totalVehicles: myCars.length,
          available: availableCars.length,
          rented: myCars.filter(c => c.availability === 'rented').length,
          maintenance: myCars.filter(c => c.availability === 'maintenance').length,
          totalRevenue: totalEarnings,
          activeRentals: activeRentals.length,
          utilizationRate: utilizationRate,
          recentBookings: myRentals.slice(0, 10),
          pendingDisputes: myRentals.filter(r => r.status === 'disputed')
        }}
      />

      {showOnboarding && currentUser && (
        <ProviderOnboardingFlow
          currentUser={currentUser}
          providerType="car_rental"
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {showHelp && (
        <HelpModal topic={showHelp} onClose={() => setShowHelp(null)} />
      )}
    </div>
  );
}