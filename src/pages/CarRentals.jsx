import React, { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Car, Shield, MessageCircle, Camera, MapPin, Star,
  AlertTriangle, CheckCircle, Upload, Key, Smartphone,
  ChevronLeft, FileText, Sparkles
} from "lucide-react";
import LocationFilter from "../components/location/LocationFilter";
import CitySelector from "../components/location/CitySelector";
import { useUserLocation } from "../hooks/useUserLocation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import StripePaymentForm from "../components/payment/StripePaymentForm";
import VehiclePhotoDocumentation from "../components/fleet/VehiclePhotoDocumentation";
import RonronVehicleRecommendations from "../components/car/RonronVehicleRecommendations";
import ListCarModal from "../components/car/ListCarModal";

export default function CarRentals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userCity, refreshLocation } = useUserLocation();
  const [locationCity, setLocationCity] = useState("");
  const [locationRadius, setLocationRadius] = useState(null);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedCar, setSelectedCar] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    start_date: "",
    end_date: "",
    delivery_option: "pickup",
    delivery_address: "",
    unlock_method: "app_unlock",
    driver_license_url: "",
    id_verification_url: "",
    selected_add_ons: []
  });

  const [damageForm, setDamageForm] = useState({
    description: "",
    photos: [],
    estimated_cost: 0
  });

  const [showPhotoDoc, setShowPhotoDoc] = useState(false);
  const [photoDocStage, setPhotoDocStage] = useState('pre');
  const [photoDocRental, setPhotoDocRental] = useState(null);
  const [showListCar, setShowListCar] = useState(false);
  const [dateConflictError, setDateConflictError] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const filteredCars = (availableCars) => {
    if (!locationCity) return availableCars;
    const q = locationCity.toLowerCase();
    return availableCars.filter(car => {
      const hay = [car.rental_details?.pickup_location, car.location, car.service_area].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  };

  const { data: availableCars = [] } = useQuery({
    queryKey: ['available-cars'],
    queryFn: async () => {
      const cars = await base44.entities.MarketplaceItem.filter({ 
        is_rental: true,
        availability: "available"
      });
      return cars;
    },
    initialData: [],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000
  });

  const { data: myRentals = [] } = useQuery({
    queryKey: ['my-rentals', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CarRental.filter({
        renter_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: [],
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  const { data: settlements = [] } = useQuery({
    queryKey: ['damage-settlements', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allSettlements = await base44.entities.DamageSettlement.filter({
        $or: [
          { renter_email: currentUser.email },
          { provider_email: currentUser.email }
        ]
      });
      return allSettlements;
    },
    enabled: !!currentUser,
    initialData: [],
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  const createRentalMutation = useMutation({
    mutationFn: async (rentalData) => {
      const response = await base44.functions.invoke('createCarRental', rentalData);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['my-rentals']);
      setShowBookingModal(false);
      setSelectedRental(data.rental);
      setShowPaymentModal(true);
    },
    onError: (error) => {
      const isConflict = error.message?.toLowerCase().includes('unavailable') || error.message?.toLowerCase().includes('already booked') || error.message?.toLowerCase().includes('overlap');
      if (isConflict) {
        setDateConflictError(true);
        setShowBookingModal(true);
        setBookingForm(prev => ({ ...prev, start_date: "", end_date: "" }));
      } else {
        toast.error(error.message || 'Failed to create booking');
      }
    }
  });

  const reportDamageMutation = useMutation({
    mutationFn: async ({ rental_id, ...damageData }) => {
      const response = await base44.functions.invoke('reportCarDamage', {
        rental_id,
        ...damageData
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-rentals']);
      queryClient.invalidateQueries(['damage-settlements']);
      setShowDamageModal(false);
      setDamageForm({ description: "", photos: [], estimated_cost: 0 });
      toast.success('Damage reported. AI is analyzing for automated resolution.');
    }
  });

  const respondToSettlementMutation = useMutation({
    mutationFn: async ({ settlement_id, response, counter_offer }) => {
      const result = await base44.functions.invoke('respondToSettlement', {
        settlement_id,
        response,
        counter_offer
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['damage-settlements']);
      queryClient.invalidateQueries(['my-rentals']);
      setShowSettlementModal(false);
      toast.success('Response recorded successfully!');
    }
  });

  const handleDocumentUpload = async (file, field) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBookingForm(prev => ({ ...prev, [field]: file_url }));
      toast.success("Document uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    }
  };

  const handleDamagePhotoUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDamageForm(prev => ({ 
        ...prev, 
        photos: [...prev.photos, file_url] 
      }));
      toast.success("Damage photo uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    }
  };

  const calculateTotalCost = () => {
    if (!selectedCar || !bookingForm.start_date || !bookingForm.end_date) return 0;

    const days = Math.max(1, Math.ceil(
      (new Date(bookingForm.end_date) - new Date(bookingForm.start_date)) / (1000 * 60 * 60 * 24)
    ));

    const baseCost = (selectedCar.price || 0) * days;
    const insurance = baseCost * 0.15;
    const deliveryFee = bookingForm.delivery_option === "delivery_both_ways" ? 100 :
                       bookingForm.delivery_option === "delivery_to_renter" ? 50 : 0;
    const securityDeposit = selectedCar.rental_details?.security_deposit || selectedCar.price || 500;
    
    // Calculate add-ons cost
    const addOnsCost = bookingForm.selected_add_ons.reduce((sum, addon) => {
      return sum + ((addon.price || 0) * days * (addon.quantity || 1));
    }, 0);

    return {
      days,
      baseCost,
      insurance,
      deliveryFee,
      addOnsCost,
      securityDeposit,
      total: baseCost + insurance + deliveryFee + addOnsCost
    };
  };

  const handleBooking = async () => {
    if (!selectedCar || !bookingForm.start_date || !bookingForm.end_date) {
      toast.error("Please select rental dates");
      return;
    }

    if (new Date(bookingForm.end_date) <= new Date(bookingForm.start_date)) {
      toast.error("End date must be after start date");
      return;
    }

    if (!bookingForm.driver_license_url || !bookingForm.id_verification_url) {
      toast.error("Please upload your driver's license and ID");
      return;
    }

    const costs = calculateTotalCost();

    createRentalMutation.mutate({
      listing_id: selectedCar.id,
      provider_email: selectedCar.provider_email || selectedCar.created_by,
      car_make: selectedCar.rental_details?.specs?.make || selectedCar.title.split(' ')[0] || "Car",
      car_model: selectedCar.rental_details?.specs?.model || selectedCar.title,
      car_year: selectedCar.rental_details?.specs?.year || new Date().getFullYear(),
      license_plate: selectedCar.license_plate || "TBD",
      car_image: selectedCar.image_url,
      rental_type: "daily",
      price_per_unit: selectedCar.price,
      start_date: new Date(bookingForm.start_date).toISOString(),
      end_date: new Date(bookingForm.end_date).toISOString(),
      total_amount: costs.total,
      insurance_included: true,
      insurance_amount: costs.insurance,
      delivery_option: bookingForm.delivery_option,
      delivery_address: bookingForm.delivery_address || "",
      delivery_fee: costs.deliveryFee,
      unlock_method: bookingForm.unlock_method,
      security_deposit: selectedCar.rental_details?.security_deposit || costs.securityDeposit,
      verification_required: true,
      driver_license_url: bookingForm.driver_license_url,
      id_verification_url: bookingForm.id_verification_url,
      mileage_limit: selectedCar.rental_details?.mileage_limit_per_day || 200,
      excess_mileage_fee: selectedCar.rental_details?.excess_mileage_fee || 0.50,
      fuel_policy: selectedCar.rental_details?.fuel_policy || "full_to_full",
      cancellation_policy: "moderate",
      selected_add_ons: bookingForm.selected_add_ons,
      add_ons_total: costs.addOnsCost
    });
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    if (selectedRental) {
      // Trigger pre-rental photo documentation
      setPhotoDocRental(selectedRental);
      setPhotoDocStage('pre');
      setShowPhotoDoc(true);
    }
  };

  return (
    <PageWrapper>
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Car className="w-10 h-10 text-blue-400" />
              Exotic Car Rentals
            </h1>
            <p className="text-gray-300 text-lg">Insured • App Unlock • Delivery Available</p>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-green-400 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Complete Protection & Safety</h3>
                <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-300">
                  <div>✓ Full coverage insurance included</div>
                  <div>✓ AI fraud detection & prevention</div>
                  <div>✓ Photo documentation pre/post rental</div>
                  <div>✓ 24/7 roadside assistance</div>
                  <div>✓ Secure app unlock technology</div>
                  <div>✓ AI-powered damage resolution</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="browse">Browse Cars</TabsTrigger>
            <TabsTrigger value="my-rentals">My Rentals</TabsTrigger>
            <TabsTrigger value="settlements">
              Settlements
              {settlements.filter(s => s.status === 'proposed' && 
                ((s.renter_email === currentUser?.email && s.renter_response === 'pending') ||
                 (s.provider_email === currentUser?.email && s.provider_response === 'pending'))).length > 0 && (
                <Badge className="ml-2 bg-red-500">
                  {settlements.filter(s => s.status === 'proposed' && 
                    ((s.renter_email === currentUser?.email && s.renter_response === 'pending') ||
                     (s.provider_email === currentUser?.email && s.provider_response === 'pending'))).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {/* Location Filter */}
            <LocationFilter
              cityValue={locationCity}
              onCityChange={setLocationCity}
              radiusValue={locationRadius}
              onRadiusChange={setLocationRadius}
              userCity={userCity}
              accentColor="blue"
              onOpenCitySettings={() => setShowCitySelector(true)}
            />

            {/* List Car Button */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Available Cars</h3>
              <Button
                onClick={() => setShowListCar(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Car className="w-4 h-4 mr-2" />
                List Your Car
              </Button>
            </div>

            {/* Ronron AI Recommendations */}
            {currentUser && (
              <div className="mb-8">
                <RonronVehicleRecommendations currentUser={currentUser} />
              </div>
            )}

            {filteredCars(availableCars).length === 0 && availableCars.length > 0 && locationCity && (
              <div className="text-center py-10 mb-4">
                <MapPin className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-white font-semibold">No cars found near "{locationCity}"</p>
                <p className="text-gray-400 text-sm mt-1">Try a different city or clear the location filter.</p>
              </div>
            )}
            {availableCars.length === 0 && (
              <div className="text-center py-16">
                <Car className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No cars available right now</h3>
                <p className="text-gray-400 mb-6">Be the first to list your car for rent!</p>
                <Button onClick={() => setShowListCar(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Car className="w-4 h-4 mr-2" />
                  List Your Car
                </Button>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-6">
              {filteredCars(availableCars).map((car) => (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/10 transition cursor-pointer group">
                    <div className="relative h-48">
                      {car.image_url ? (
                        <img 
                          src={car.image_url} 
                          alt={car.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Car className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        {car.verified_provider && (
                          <Badge className="bg-green-500/90 text-white text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1">
                          <span className="text-white font-bold text-lg">${car.price}</span>
                          <span className="text-gray-300 text-xs ml-1">/day</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-bold text-lg leading-tight">{car.title}</h3>
                        <div className="flex items-center gap-1 text-yellow-400 ml-2 flex-shrink-0">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          <span className="font-medium text-sm">{car.rating || "5.0"}</span>
                        </div>
                      </div>
                      
                      {car.rental_details?.specs?.engine && (
                        <p className="text-blue-400 text-xs mb-2 font-medium">{car.rental_details.specs.engine}</p>
                      )}

                      {car.rental_details?.pickup_location && (
                        <div className="flex items-center gap-1 text-gray-400 text-sm mb-3">
                          <MapPin className="w-3 h-3" />
                          <span>{car.rental_details.pickup_location}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-xs bg-blue-500/20 text-blue-300 rounded-full px-2 py-1">
                          <Smartphone className="w-3 h-3 inline mr-1" />App Unlock
                        </span>
                        <span className="text-xs bg-green-500/20 text-green-300 rounded-full px-2 py-1">
                          <Shield className="w-3 h-3 inline mr-1" />Insured
                        </span>
                        {car.rental_details?.delivery_available && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-1">
                            Delivery
                          </span>
                        )}
                        {car.rental_details?.mileage_limit_per_day && (
                          <span className="text-xs bg-white/10 text-gray-300 rounded-full px-2 py-1">
                            {car.rental_details.mileage_limit_per_day} mi/day
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          setSelectedCar(car);
                          setBookingForm({
                            start_date: "",
                            end_date: "",
                            delivery_option: "pickup",
                            delivery_address: "",
                            unlock_method: "app_unlock",
                            driver_license_url: "",
                            id_verification_url: "",
                            selected_add_ons: []
                          });
                          setShowBookingModal(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Book Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-rentals">
            <div className="space-y-4">
              {myRentals.map((rental) => (
                <Card key={rental.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <img 
                        src={rental.car_image} 
                        alt={rental.car_model}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-bold text-xl mb-1">
                              {rental.car_make} {rental.car_model}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={
                            rental.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            rental.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                            rental.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }>
                            {rental.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="text-sm">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white font-bold ml-2">${rental.total_amount}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-400">Deposit:</span>
                            <span className="text-white font-bold ml-2">${rental.security_deposit}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-400">Insurance:</span>
                            <span className="text-green-400 font-bold ml-2">✓ Included</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-400">Unlock:</span>
                            <span className="text-blue-400 font-bold ml-2">{rental.unlock_method.replace('_', ' ')}</span>
                          </div>
                        </div>

                        {rental.selected_add_ons && rental.selected_add_ons.length > 0 && (
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                            <p className="text-purple-300 text-xs font-semibold mb-2">Selected Add-Ons:</p>
                            <div className="space-y-1">
                              {rental.selected_add_ons.map((addon, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-gray-300">{addon.name} {addon.quantity > 1 ? `(×${addon.quantity})` : ''}</span>
                                  <span className="text-purple-400">${addon.price}/day</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {rental.unlock_code && rental.status === 'active' && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <Key className="w-4 h-4 text-blue-400" />
                              <span className="text-gray-300 text-sm">Unlock Code:</span>
                              <span className="text-blue-400 font-mono font-bold">{rental.unlock_code}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(createPageUrl("Messages"))}
                            className="bg-white/5"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message Provider
                          </Button>
                          {rental.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPhotoDocRental(rental);
                                setPhotoDocStage('post');
                                setShowPhotoDoc(true);
                              }}
                              className="bg-blue-500/10 border-blue-500/30 text-blue-400"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              End Rental (Photos)
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRental(rental);
                              setShowDamageModal(true);
                            }}
                            className="bg-white/5"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Report Damage
                          </Button>
                        </div>
                      </div>
                    </div>

                    {rental.damages_reported && rental.damages_reported.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          Damage Reports ({rental.damages_reported.length})
                        </h4>
                        {rental.damages_reported.map((damage, idx) => (
                          <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-2">
                            <p className="text-gray-300 text-sm">{damage.description}</p>
                            <p className="text-yellow-400 text-xs mt-1">
                              Estimated: ${damage.estimated_cost} • Reported by: {damage.reported_by}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {myRentals.length === 0 && (
                <div className="text-center py-12">
                  <Car className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No rentals yet</h3>
                  <p className="text-gray-400 mb-6">Browse exotic cars and book your first rental</p>
                  <Button onClick={() => setActiveTab("browse")} className="bg-blue-600 hover:bg-blue-700">
                    Browse Cars
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settlements">
            <div className="space-y-4">
              {settlements.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No settlements</h3>
                  <p className="text-gray-400">Damage settlements will appear here</p>
                </div>
              ) : (
                settlements.map((settlement) => {
                  const isRenter = settlement.renter_email === currentUser?.email;
                  const myResponse = isRenter ? settlement.renter_response : settlement.provider_response;
                  const needsResponse = myResponse === 'pending' && settlement.status === 'proposed';

                  return (
                    <Card key={settlement.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-white font-bold text-lg mb-1">
                              🤖 AI Settlement Proposal
                            </h3>
                            <p className="text-gray-400 text-sm">{settlement.damage_description}</p>
                          </div>
                          <Badge className={
                            settlement.status === 'both_accepted' ? 'bg-green-500/20 text-green-400' :
                            settlement.status === 'escalated' ? 'bg-red-500/20 text-red-400' :
                            needsResponse ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {settlement.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            AI Analysis
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-400">Severity:</span>
                              <span className="text-white font-bold ml-2 uppercase">{settlement.ai_analysis?.severity}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Confidence:</span>
                              <span className="text-white font-bold ml-2">{settlement.ai_analysis?.confidence_score}%</span>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm mt-3">{settlement.ai_analysis?.reasoning}</p>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                          <p className="text-gray-400 text-sm mb-1">AI Suggested Settlement</p>
                          <p className="text-white text-3xl font-bold">${settlement.suggested_settlement}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-gray-400 text-xs mb-1">Renter</p>
                            <p className={`font-bold ${
                              settlement.renter_response === 'accepted' ? 'text-green-400' :
                              settlement.renter_response === 'disputed' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              {settlement.renter_response === 'pending' ? '⏳ Pending' :
                               settlement.renter_response === 'accepted' ? '✓ Accepted' :
                               '✗ Disputed'}
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-gray-400 text-xs mb-1">Provider</p>
                            <p className={`font-bold ${
                              settlement.provider_response === 'accepted' ? 'text-green-400' :
                              settlement.provider_response === 'disputed' ? 'text-red-400' :
                              'text-yellow-400'
                            }`}>
                              {settlement.provider_response === 'pending' ? '⏳ Pending' :
                               settlement.provider_response === 'accepted' ? '✓ Accepted' :
                               '✗ Disputed'}
                            </p>
                          </div>
                        </div>

                        {needsResponse && settlement.status !== 'escalated' && (
                          <Button
                            onClick={() => {
                              setSelectedSettlement(settlement);
                              setShowSettlementModal(true);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Review & Respond
                          </Button>
                        )}

                        {settlement.status === 'both_accepted' && (
                          <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-4">
                            <p className="text-green-400 font-semibold flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Settlement Completed: ${settlement.final_settlement_amount || settlement.suggested_settlement}
                            </p>
                          </div>
                        )}

                        {settlement.status === 'escalated' && (
                          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4">
                            <p className="text-red-400 font-semibold">⚠️ Escalated to Admin Review</p>
                            <p className="text-gray-300 text-sm mt-1">{settlement.escalated_reason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AnimatePresence>
          {showBookingModal && selectedCar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => { setShowBookingModal(false); setDateConflictError(false); }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-3xl font-bold text-white mb-6">
                  Book {selectedCar.title}
                </h2>

                <div className="space-y-6">
                  {dateConflictError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-300 font-semibold">These dates are unavailable</p>
                        <p className="text-red-400/80 text-sm mt-1">This car is already booked for the selected period. Please choose different dates.</p>
                      </div>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Start Date</label>
                      <Input
                        type="date"
                        value={bookingForm.start_date}
                        onChange={(e) => { setDateConflictError(false); setBookingForm({...bookingForm, start_date: e.target.value}); }}
                        min={new Date().toISOString().split('T')[0]}
                        className={`bg-white/10 border-white/20 text-white ${dateConflictError ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">End Date</label>
                      <Input
                        type="date"
                        value={bookingForm.end_date}
                        onChange={(e) => { setDateConflictError(false); setBookingForm({...bookingForm, end_date: e.target.value}); }}
                        min={bookingForm.start_date || new Date().toISOString().split('T')[0]}
                        className={`bg-white/10 border-white/20 text-white ${dateConflictError ? 'border-red-500' : ''}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Delivery Option</label>
                    <Select value={bookingForm.delivery_option} onValueChange={(v) => setBookingForm({...bookingForm, delivery_option: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickup">Self Pickup (Free)</SelectItem>
                        <SelectItem value="delivery_to_renter">Deliver to Me (+$50)</SelectItem>
                        <SelectItem value="delivery_both_ways">Deliver & Pickup (+$100)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bookingForm.delivery_option !== "pickup" && (
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Delivery Address</label>
                      <Input
                        value={bookingForm.delivery_address}
                        onChange={(e) => setBookingForm({...bookingForm, delivery_address: e.target.value})}
                        placeholder="Enter full delivery address"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Unlock Method</label>
                    <Select value={bookingForm.unlock_method} onValueChange={(v) => setBookingForm({...bookingForm, unlock_method: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="app_unlock">App Unlock (Recommended)</SelectItem>
                        <SelectItem value="key_exchange">Physical Key Exchange</SelectItem>
                        <SelectItem value="keyless_code">Keyless Entry Code</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Add-Ons Selection */}
                  {selectedCar.add_ons && selectedCar.add_ons.length > 0 && (
                    <div className="border-t border-white/20 pt-4">
                      <label className="text-gray-400 text-sm mb-3 block font-semibold">Available Add-Ons</label>
                      <div className="space-y-2">
                        {selectedCar.add_ons.map((addon) => {
                          const isSelected = bookingForm.selected_add_ons.find(a => a.id === addon.id);
                          return (
                            <div key={addon.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                              <div className="flex-1">
                                <p className="text-white font-medium">{addon.name}</p>
                                {addon.description && (
                                  <p className="text-gray-400 text-xs">{addon.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-green-400 font-bold text-sm">${addon.price}/day</span>
                                <button
                                  onClick={() => {
                                    if (isSelected) {
                                      setBookingForm(prev => ({
                                        ...prev,
                                        selected_add_ons: prev.selected_add_ons.filter(a => a.id !== addon.id)
                                      }));
                                    } else {
                                      setBookingForm(prev => ({
                                        ...prev,
                                        selected_add_ons: [...prev.selected_add_ons, { ...addon, quantity: 1 }]
                                      }));
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                    isSelected 
                                      ? 'bg-green-600 text-white' 
                                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                  }`}
                                >
                                  {isSelected ? '✓ Added' : 'Add'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-yellow-400" />
                      Required Verification Documents
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-gray-300 text-sm mb-2 block">Driver License</label>
                        {bookingForm.driver_license_url ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 text-sm">Uploaded</span>
                          </div>
                        ) : (
                          <>
                            <input
                              id="license-upload"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleDocumentUpload(e.target.files?.[0], 'driver_license_url')}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('license-upload').click()}
                              className="w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload License
                            </Button>
                          </>
                        )}
                      </div>

                      <div>
                        <label className="text-gray-300 text-sm mb-2 block">Government ID</label>
                        {bookingForm.id_verification_url ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 text-sm">Uploaded</span>
                          </div>
                        ) : (
                          <>
                            <input
                              id="id-upload"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleDocumentUpload(e.target.files?.[0], 'id_verification_url')}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('id-upload').click()}
                              className="w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload ID
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {bookingForm.start_date && bookingForm.end_date && (
                    <div className="bg-white/5 rounded-xl p-6 space-y-3">
                      <h3 className="text-white font-bold mb-3">Cost Breakdown</h3>
                      {(() => {
                        const costs = calculateTotalCost();
                        return (
                          <>
                            <div className="flex justify-between text-gray-300 text-sm">
                              <span>Rental Period</span>
                              <span className="font-semibold">{costs.days} day{costs.days !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>Base Rental (${selectedCar.price}/day × {costs.days})</span>
                              <span>${costs.baseCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>Insurance (15%)</span>
                              <span>${costs.insurance.toFixed(2)}</span>
                            </div>
                            {costs.deliveryFee > 0 && (
                              <div className="flex justify-between text-gray-300">
                                <span>Delivery Fee</span>
                                <span>${costs.deliveryFee.toFixed(2)}</span>
                              </div>
                            )}
                            {costs.addOnsCost > 0 && (
                              <div className="flex justify-between text-gray-300">
                                <span>Add-Ons ({bookingForm.selected_add_ons.length} item{bookingForm.selected_add_ons.length !== 1 ? 's' : ''})</span>
                                <span>${costs.addOnsCost.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="border-t border-white/10 pt-3 flex justify-between text-white font-bold text-xl">
                              <span>Total</span>
                              <span>${costs.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-sm">
                              <span>Security Deposit (Refundable)</span>
                              <span>${costs.securityDeposit.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBooking}
                      disabled={createRentalMutation.isLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {createRentalMutation.isLoading ? 'Processing...' : 'Continue to Payment'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPaymentModal && selectedRental && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowPaymentModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-6">Complete Payment</h2>

                <StripePaymentForm
                  amount={selectedRental.total_amount}
                  referenceType="car_rental"
                  referenceId={selectedRental.id}
                  description={`Car Rental: ${selectedRental.car_make} ${selectedRental.car_model}`}
                  onSuccess={handlePaymentSuccess}
                  onError={(error) => {
                    console.error('Payment error:', error);
                    alert('Payment failed. Please try again.');
                  }}
                  metadata={{
                    rental_id: selectedRental.id,
                    car: `${selectedRental.car_make} ${selectedRental.car_model}`
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDamageModal && selectedRental && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowDamageModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                  Report Damage
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Describe the Damage</label>
                    <textarea
                      value={damageForm.description}
                      onChange={(e) => setDamageForm({...damageForm, description: e.target.value})}
                      rows={4}
                      placeholder="Provide detailed description of the damage..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Estimated Repair Cost ($)</label>
                    <Input
                      type="number"
                      value={damageForm.estimated_cost}
                      onChange={(e) => setDamageForm({...damageForm, estimated_cost: Number(e.target.value)})}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Upload Photos</label>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {damageForm.photos.map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img src={photo} alt={`damage-${idx}`} className="w-full h-24 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setDamageForm(prev => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== idx)
                            }))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      id="damage-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDamagePhotoUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('damage-photo-upload').click()}
                      className="w-full"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Add Photo
                    </Button>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">
                      <strong>Note:</strong> Our AI will analyze the photos and description to assess the damage. 
                      Insurance will be notified automatically. Both parties will be able to view this report.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDamageModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => reportDamageMutation.mutate({
                        rental_id: selectedRental.id,
                        ...damageForm
                      })}
                      disabled={!damageForm.description || reportDamageMutation.isLoading}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                    >
                      {reportDamageMutation.isLoading ? 'Submitting...' : 'Submit Report'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettlementModal && selectedSettlement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowSettlementModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                  Review AI Settlement
                </h2>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-2">Damage Description</h3>
                    <p className="text-gray-300">{selectedSettlement.damage_description}</p>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                    <h3 className="text-white font-bold text-xl mb-3">
                      AI Recommended Settlement: ${selectedSettlement.suggested_settlement}
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">{selectedSettlement.ai_analysis?.reasoning}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 mb-1">Confidence</p>
                        <p className="text-white font-bold text-lg">{selectedSettlement.ai_analysis?.confidence_score}%</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-gray-400 mb-1">Severity</p>
                        <p className="text-white font-bold text-lg uppercase">{selectedSettlement.ai_analysis?.severity}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => respondToSettlementMutation.mutate({
                        settlement_id: selectedSettlement.id,
                        response: 'accepted'
                      })}
                      disabled={respondToSettlementMutation.isLoading}
                      className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Accept Settlement (${selectedSettlement.suggested_settlement})
                    </Button>

                    <Button
                      onClick={() => respondToSettlementMutation.mutate({
                        settlement_id: selectedSettlement.id,
                        response: 'disputed'
                      })}
                      disabled={respondToSettlementMutation.isLoading}
                      variant="outline"
                      className="w-full py-6 text-lg bg-white/5"
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Dispute & Request Admin Review
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => setShowSettlementModal(false)}
                    >
                      Close
                    </Button>
                  </div>

                  <p className="text-center text-gray-500 text-xs">
                    Deadline: {new Date(selectedSettlement.auto_resolve_deadline).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <VehiclePhotoDocumentation
          open={showPhotoDoc}
          onClose={() => setShowPhotoDoc(false)}
          rental={photoDocRental}
          stage={photoDocStage}
          onComplete={(data) => {
            setShowPhotoDoc(false);
            if (photoDocStage === 'pre') {
              toast.success('Pre-rental inspection complete! You can now pick up the vehicle.');
              navigate(createPageUrl("Messages"));
            } else {
              if (data.comparison && data.comparison.new_damages_count > 0) {
                toast.warning(`Post-rental inspection complete. ${data.comparison.new_damages_count} new damage(s) detected.`);
              } else {
                toast.success('Post-rental inspection complete! Vehicle returned in good condition.');
              }
              queryClient.invalidateQueries(['my-rentals']);
            }
          }}
        />

        <ListCarModal
          isOpen={showListCar}
          onClose={() => setShowListCar(false)}
          currentUser={currentUser}
          onSuccess={() => {
            setShowListCar(false);
            queryClient.invalidateQueries(['available-cars']);
            toast.success('Car listed successfully!');
          }}
        />

        {showCitySelector && (
          <CitySelector
            user={{ city: userCity }}
            onClose={() => setShowCitySelector(false)}
            onSaved={() => { refreshLocation(); setShowCitySelector(false); }}
          />
        )}
      </div>
    </div>
    </PageWrapper>
  );
}