import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, Upload, FileText, Car, User, Shield, 
  ChevronRight, ChevronLeft, Loader2, AlertCircle, Award,
  Briefcase, Plus, Trash2, Sparkles, TrendingUp, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const type = new URLSearchParams(location.search).get('type') || 'driver';
  
  const [currentStep, setCurrentStep] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form data
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    address: "",
    bio: ""
  });

  const [documents, setDocuments] = useState({
    drivers_license: null,
    insurance: null,
    vehicle_registration: null,
    certifications: []
  });

  const [vehicleData, setVehicleData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    license_plate: "",
    vehicle_type: "sedan"
  });

  const [providerData, setProviderData] = useState({
    service_category: "",
    business_name: "",
    years_experience: "",
    certifications: []
  });

  const [services, setServices] = useState([]);
  const [generatingAI, setGeneratingAI] = useState({ description: false, pricing: false, index: null });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Pre-fill data if exists
      setProfileData({
        full_name: user.full_name || "",
        phone: user.phone || "",
        address: user.address || "",
        bio: user.bio || ""
      });

      if (user.driver_vehicle_info) {
        setVehicleData(user.driver_vehicle_info);
      }

      // Set current step from saved progress
      const savedStep = type === 'driver' 
        ? user.onboarding_status?.driver_onboarding_step || 0
        : user.onboarding_status?.provider_onboarding_step || 0;
      setCurrentStep(savedStep);
    };
    fetchUser();
  }, [type]);

  const uploadDocument = async (file, docType) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocuments(prev => ({ ...prev, [docType]: file_url }));
      toast.success(`${docType} uploaded successfully`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const saveProgressMutation = useMutation({
    mutationFn: async (step) => {
      const statusKey = type === 'driver' ? 'driver_onboarding_step' : 'provider_onboarding_step';
      await base44.auth.updateMe({
        onboarding_status: {
          ...currentUser.onboarding_status,
          [statusKey]: step
        }
      });
    }
  });

  const addService = () => {
    if (services.length >= 3) {
      toast.error('Maximum 3 services during onboarding');
      return;
    }
    setServices([...services, {
      title: "",
      category: providerData.service_category || "plumbing",
      price: 100,
      description: "",
      price_type: "fixed"
    }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index, field, value) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const generateDescription = async (index) => {
    const service = services[index];
    if (!service.title || !service.category) {
      toast.error('Please enter a title and category first');
      return;
    }
    
    setGeneratingAI({ description: true, pricing: false, index });
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert service provider copywriter. Create a compelling, professional service description for the following:

Service Title: ${service.title}
Category: ${service.category}

The description should:
- Be 2-3 sentences long
- Highlight the key benefits to customers
- Sound professional yet approachable
- Include relevant details about what's included
- End with a call to action

Generate only the description text, nothing else.`,
        add_context_from_internet: false
      });
      
      updateService(index, 'description', response);
      toast.success('Description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingAI({ description: false, pricing: false, index: null });
    }
  };

  const suggestPricing = async (index) => {
    const service = services[index];
    if (!service.title || !service.category) {
      toast.error('Please enter a title and category first');
      return;
    }
    
    setGeneratingAI({ description: false, pricing: true, index });
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a pricing expert for service marketplaces. Based on market trends and industry standards, suggest an optimal price for:

Service: ${service.title}
Category: ${service.category}
Current Price Type: ${service.price_type}

Provide a competitive price that balances profitability and market demand. Consider:
- Industry standard rates
- Skill level required
- Time/effort involved
- Local market conditions

Respond with ONLY a single number (the suggested price in USD). No explanation, just the number.`,
        add_context_from_internet: true
      });
      
      const suggestedPrice = parseFloat(response.trim());
      if (!isNaN(suggestedPrice)) {
        updateService(index, 'price', suggestedPrice);
        toast.success(`Suggested price: $${suggestedPrice}`);
      }
    } catch (error) {
      toast.error('Failed to generate pricing suggestion');
    } finally {
      setGeneratingAI({ description: false, pricing: false, index: null });
    }
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      // Save profile data
      await base44.auth.updateMe({
        ...profileData,
        driver_vehicle_info: type === 'driver' ? vehicleData : currentUser.driver_vehicle_info,
        is_provider: type === 'provider',
        onboarding_status: {
          ...currentUser.onboarding_status,
          [`${type}_onboarding_completed`]: true,
          [`${type}_onboarding_step`]: 999
        }
      });

      // Create service listings for providers
      if (type === 'provider' && services.length > 0) {
        for (const service of services) {
          await base44.entities.MarketplaceItem.create({
            title: service.title,
            category: service.category,
            price: service.price,
            price_type: service.price_type,
            description: service.description,
            image_url: "",
            escrow_required: false
          });
        }
      }

      // Create verification records for documents
      if (type === 'driver') {
        if (documents.drivers_license) {
          await base44.entities.ProviderVerification.create({
            provider_email: currentUser.email,
            verification_type: "drivers_license",
            document_url: documents.drivers_license,
            status: "pending"
          });
        }
        if (documents.insurance) {
          await base44.entities.ProviderVerification.create({
            provider_email: currentUser.email,
            verification_type: "insurance",
            document_url: documents.insurance,
            status: "pending"
          });
        }
        if (documents.vehicle_registration) {
          await base44.entities.ProviderVerification.create({
            provider_email: currentUser.email,
            verification_type: "vehicle_registration",
            document_url: documents.vehicle_registration,
            status: "pending"
          });
        }
      } else {
        // Provider certifications
        for (const cert of documents.certifications) {
          await base44.entities.ProviderVerification.create({
            provider_email: currentUser.email,
            verification_type: "certification",
            document_url: cert,
            status: "pending"
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['current-user']);
      if (type === 'provider') {
        toast.success('Welcome! Your services are now live. Application submitted for verification.');
        navigate(createPageUrl('ProviderHub'));
      } else {
        toast.success('Application submitted! We\'ll review and get back to you within 24-48 hours.');
        navigate(createPageUrl('Profile'));
      }
    }
  });

  const nextStep = async () => {
    const newStep = currentStep + 1;
    await saveProgressMutation.mutateAsync(newStep);
    setCurrentStep(newStep);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const driverSteps = [
    { title: "Profile Setup", icon: User },
    { title: "Documents", icon: FileText },
    { title: "Vehicle Info", icon: Car },
    { title: "Review & Submit", icon: CheckCircle }
  ];

  const providerSteps = [
    { title: "Profile Setup", icon: User },
    { title: "Service Details", icon: Briefcase },
    { title: "Create Services", icon: Star },
    { title: "Documents", icon: FileText },
    { title: "Review & Submit", icon: CheckCircle }
  ];

  const steps = type === 'driver' ? driverSteps : providerSteps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {type === 'driver' ? 'Driver' : 'Service Provider'} Onboarding
          </h1>
          <p className="text-gray-400">Complete all steps to get approved</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition ${
                    idx < currentStep 
                      ? 'bg-green-500 border-green-500' 
                      : idx === currentStep
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-gray-800 border-gray-700'
                  }`}>
                    {idx < currentStep ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    idx <= currentStep ? 'text-white' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    idx < currentStep ? 'bg-green-500' : 'bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
          >
            {/* Step 0: Profile Setup */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
                
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Full Name *</label>
                  <Input
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Phone Number *</label>
                  <Input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Address *</label>
                  <Input
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Bio</label>
                  <Textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="bg-white/10 border-white/20 text-white"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Driver Documents / Provider Service Details */}
            {currentStep === 1 && type === 'driver' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Upload Documents</h2>
                
                {/* Driver's License */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">Driver's License *</h3>
                      <p className="text-gray-400 text-sm">Upload a clear photo of your license</p>
                    </div>
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  {documents.drivers_license ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Uploaded</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadDocument(e.target.files[0], 'drivers_license')}
                      />
                      <div className="flex items-center gap-2 text-purple-400 hover:text-purple-300">
                        <Upload className="w-5 h-5" />
                        <span>Choose File</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Insurance */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">Car Insurance *</h3>
                      <p className="text-gray-400 text-sm">Current insurance policy</p>
                    </div>
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  {documents.insurance ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Uploaded</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => uploadDocument(e.target.files[0], 'insurance')}
                      />
                      <div className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
                        <Upload className="w-5 h-5" />
                        <span>Choose File</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Vehicle Registration */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">Vehicle Registration *</h3>
                      <p className="text-gray-400 text-sm">Vehicle registration document</p>
                    </div>
                    <Car className="w-6 h-6 text-green-400" />
                  </div>
                  {documents.vehicle_registration ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Uploaded</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => uploadDocument(e.target.files[0], 'vehicle_registration')}
                      />
                      <div className="flex items-center gap-2 text-green-400 hover:text-green-300">
                        <Upload className="w-5 h-5" />
                        <span>Choose File</span>
                      </div>
                    </label>
                  )}
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 text-purple-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && type === 'provider' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-6">Service Details</h2>
                
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Service Category *</label>
                  <Select 
                    value={providerData.service_category}
                    onValueChange={(v) => setProviderData({ ...providerData, service_category: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="landscaping">Landscaping</SelectItem>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Business Name</label>
                  <Input
                    value={providerData.business_name}
                    onChange={(e) => setProviderData({ ...providerData, business_name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Years of Experience *</label>
                  <Input
                    type="number"
                    value={providerData.years_experience}
                    onChange={(e) => setProviderData({ ...providerData, years_experience: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Vehicle Info (Driver) / Documents (Provider) */}
            {currentStep === 2 && type === 'driver' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-6">Vehicle Information</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Make *</label>
                    <Input
                      value={vehicleData.make}
                      onChange={(e) => setVehicleData({ ...vehicleData, make: e.target.value })}
                      placeholder="Toyota, Tesla, etc."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Model *</label>
                    <Input
                      value={vehicleData.model}
                      onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                      placeholder="Camry, Model 3, etc."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Year *</label>
                    <Input
                      type="number"
                      value={vehicleData.year}
                      onChange={(e) => setVehicleData({ ...vehicleData, year: parseInt(e.target.value) })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Color *</label>
                    <Input
                      value={vehicleData.color}
                      onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                      placeholder="Black, White, etc."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">License Plate *</label>
                  <Input
                    value={vehicleData.license_plate}
                    onChange={(e) => setVehicleData({ ...vehicleData, license_plate: e.target.value.toUpperCase() })}
                    placeholder="ABC1234"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Vehicle Type *</label>
                  <Select 
                    value={vehicleData.vehicle_type}
                    onValueChange={(v) => setVehicleData({ ...vehicleData, vehicle_type: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Create Services (Provider) */}
            {currentStep === 2 && type === 'provider' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create Your Services</h2>
                    <p className="text-gray-400 text-sm">Add 1-3 services to get started</p>
                  </div>
                  {services.length < 3 && (
                    <Button
                      onClick={addService}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  )}
                </div>

                {services.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                    <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">Add Your First Service</h3>
                    <p className="text-gray-400 mb-4">
                      Ronron AI will help you create professional listings with optimized descriptions and pricing
                    </p>
                    <Button onClick={addService} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Get Started
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {services.map((service, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-white font-bold">Service #{index + 1}</h3>
                          <Button
                            onClick={() => removeService(index)}
                            size="sm"
                            variant="outline"
                            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-gray-400 text-sm mb-2 block">Service Title *</label>
                            <Input
                              value={service.title}
                              onChange={(e) => updateService(index, 'title', e.target.value)}
                              placeholder="e.g., Professional Home Cleaning"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-gray-400 text-sm mb-2 block">Category *</label>
                              <Select 
                                value={service.category}
                                onValueChange={(v) => updateService(index, 'category', v)}
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="plumbing">Plumbing</SelectItem>
                                  <SelectItem value="electrical">Electrical</SelectItem>
                                  <SelectItem value="cleaning">Cleaning</SelectItem>
                                  <SelectItem value="landscaping">Landscaping</SelectItem>
                                  <SelectItem value="photography">Photography</SelectItem>
                                  <SelectItem value="catering">Catering</SelectItem>
                                  <SelectItem value="personal_chef">Personal Chef</SelectItem>
                                  <SelectItem value="barber_beauty">Barber/Beauty</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-gray-400 text-sm mb-2 block">Price Type</label>
                              <Select 
                                value={service.price_type}
                                onValueChange={(v) => updateService(index, 'price_type', v)}
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed Price</SelectItem>
                                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                                  <SelectItem value="per_day">Per Day</SelectItem>
                                  <SelectItem value="negotiable">Negotiable</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-gray-400 text-sm">Price (USD) *</label>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => suggestPricing(index)}
                                disabled={generatingAI.pricing && generatingAI.index === index || !service.title}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {generatingAI.pricing && generatingAI.index === index ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    AI Suggesting...
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    AI Suggest Price
                                  </>
                                )}
                              </Button>
                            </div>
                            <Input
                              type="number"
                              value={service.price}
                              onChange={(e) => updateService(index, 'price', parseFloat(e.target.value))}
                              placeholder="100"
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-gray-400 text-sm">Description</label>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => generateDescription(index)}
                                disabled={generatingAI.description && generatingAI.index === index || !service.title}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {generatingAI.description && generatingAI.index === index ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    AI Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI Generate
                                  </>
                                )}
                              </Button>
                            </div>
                            <Textarea
                              value={service.description}
                              onChange={(e) => updateService(index, 'description', e.target.value)}
                              placeholder="Describe your service..."
                              className="bg-white/10 border-white/20 text-white"
                              rows={3}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {services.length < 3 && (
                      <Button
                        onClick={addService}
                        variant="outline"
                        className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Service ({services.length}/3)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Documents (Provider) */}
            {currentStep === 3 && type === 'provider' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Professional Documents</h2>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      Upload any relevant certifications, licenses, or qualifications for your service category.
                    </div>
                  </div>
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      for (const file of files) {
                        setUploading(true);
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        setDocuments(prev => ({
                          ...prev,
                          certifications: [...prev.certifications, file_url]
                        }));
                        setUploading(false);
                      }
                      toast.success('Documents uploaded');
                    }}
                  />
                  <div className="p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-purple-500/50 transition text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-white mb-2">Upload Certifications</p>
                    <p className="text-gray-400 text-sm">Click to select files or drag and drop</p>
                  </div>
                </label>

                {documents.certifications.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">{documents.certifications.length} file(s) uploaded</p>
                    {documents.certifications.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Document {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Final Step: Review & Submit */}
            {((currentStep === 3 && type === 'driver') || (currentStep === 4 && type === 'provider')) && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Review & Submit</h2>
                
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                  <Award className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-white font-bold text-center mb-2">Almost There!</h3>
                  <p className="text-gray-300 text-center text-sm">
                    Review your information and submit for approval. Our team will review your application within 24-48 hours.
                  </p>
                </div>

                {/* Summary */}
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-2">Profile Information</h4>
                    <div className="text-gray-400 text-sm space-y-1">
                      <p>Name: {profileData.full_name}</p>
                      <p>Phone: {profileData.phone}</p>
                      <p>Address: {profileData.address}</p>
                    </div>
                  </div>

                  {type === 'driver' && (
                   <div className="bg-white/5 rounded-xl p-4">
                     <h4 className="text-white font-medium mb-2">Vehicle</h4>
                     <div className="text-gray-400 text-sm space-y-1">
                       <p>{vehicleData.year} {vehicleData.make} {vehicleData.model}</p>
                       <p>Color: {vehicleData.color}</p>
                       <p>License: {vehicleData.license_plate}</p>
                     </div>
                   </div>
                  )}

                  {type === 'provider' && services.length > 0 && (
                   <div className="bg-white/5 rounded-xl p-4">
                     <h4 className="text-white font-medium mb-2">Services ({services.length})</h4>
                     <div className="space-y-3">
                       {services.map((service, idx) => (
                         <div key={idx} className="bg-white/5 rounded-lg p-3">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <p className="text-white font-medium">{service.title}</p>
                               <p className="text-gray-400 text-xs capitalize">{service.category}</p>
                             </div>
                             <div className="text-green-400 font-bold">${service.price}</div>
                           </div>
                           {service.description && (
                             <p className="text-gray-400 text-xs mt-2 line-clamp-2">{service.description}</p>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                  )}

                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-2">Documents</h4>
                    <div className="text-gray-400 text-sm space-y-2">
                      {type === 'driver' ? (
                        <>
                          <div className="flex items-center gap-2">
                            {documents.drivers_license ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span>Driver's License</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {documents.insurance ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span>Insurance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {documents.vehicle_registration ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span>Vehicle Registration</span>
                          </div>
                        </>
                      ) : (
                        <p>{documents.certifications.length} certification(s) uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                onClick={prevStep}
                disabled={currentStep === 0}
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={
                   (currentStep === 0 && (!profileData.full_name || !profileData.phone || !profileData.address)) ||
                   (currentStep === 1 && type === 'driver' && (!documents.drivers_license || !documents.insurance || !documents.vehicle_registration)) ||
                   (currentStep === 1 && type === 'provider' && !providerData.service_category) ||
                   (currentStep === 2 && type === 'driver' && (!vehicleData.make || !vehicleData.model || !vehicleData.license_plate)) ||
                   (currentStep === 2 && type === 'provider' && services.length === 0)
                  }
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => completeOnboardingMutation.mutate()}
                  disabled={completeOnboardingMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completeOnboardingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}