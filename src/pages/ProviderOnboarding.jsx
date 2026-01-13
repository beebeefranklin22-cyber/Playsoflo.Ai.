import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, ChevronRight, ChevronLeft, User, Calendar, 
  Package, CreditCard, Image, Loader2, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(false);

  // Step 1: Profile Data
  const [profileData, setProfileData] = useState({
    provider_business_name: "",
    provider_phone: "",
    provider_business_address: "",
    provider_website: "",
    provider_category: ""
  });

  // Step 2: Availability Data
  const [availabilityData, setAvailabilityData] = useState({
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "09:00", end: "17:00" },
    sunday: { enabled: false, start: "09:00", end: "17:00" }
  });

  // Step 3: Service Data
  const [serviceData, setServiceData] = useState({
    title: "",
    description: "",
    price: "",
    duration: "",
    category: ""
  });

  // Step 4: Payment Data
  const [paymentData, setPaymentData] = useState({
    stripe_connected: false
  });

  // Step 5: Media & About
  const [mediaData, setMediaData] = useState({
    about_us: "",
    gallery_images: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Load existing data if any
        if (user.provider_business_name) {
          setProfileData({
            provider_business_name: user.provider_business_name || "",
            provider_phone: user.provider_phone || "",
            provider_business_address: user.provider_business_address || "",
            provider_website: user.provider_website || "",
            provider_category: user.provider_category || ""
          });
        }
        if (user.about_us) {
          setMediaData(prev => ({ ...prev, about_us: user.about_us }));
        }

        // Load existing availability
        const availability = await base44.entities.ProviderAvailability.filter({
          provider_email: user.email
        });
        if (availability.length > 0) {
          const av = availability[0];
          setAvailabilityData({
            monday: av.monday || { enabled: true, start: "09:00", end: "17:00" },
            tuesday: av.tuesday || { enabled: true, start: "09:00", end: "17:00" },
            wednesday: av.wednesday || { enabled: true, start: "09:00", end: "17:00" },
            thursday: av.thursday || { enabled: true, start: "09:00", end: "17:00" },
            friday: av.friday || { enabled: true, start: "09:00", end: "17:00" },
            saturday: av.saturday || { enabled: false, start: "09:00", end: "17:00" },
            sunday: av.sunday || { enabled: false, start: "09:00", end: "17:00" }
          });
        }

        // Check Stripe connection
        if (user.stripe_account_id) {
          setPaymentData({ stripe_connected: true });
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe(data);
    },
    onSuccess: async () => {
      const updated = await base44.auth.me();
      setCurrentUser(updated);
      setCompletedSteps(prev => [...new Set([...prev, 1])]);
      toast.success("Profile updated!");
    }
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.ProviderAvailability.filter({
        provider_email: currentUser.email
      });
      if (existing.length > 0) {
        return await base44.entities.ProviderAvailability.update(existing[0].id, data);
      } else {
        return await base44.entities.ProviderAvailability.create({
          provider_email: currentUser.email,
          ...data
        });
      }
    },
    onSuccess: () => {
      setCompletedSteps(prev => [...new Set([...prev, 2])]);
      toast.success("Availability saved!");
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MarketplaceItem.create({
        ...data,
        item_type: "service",
        created_by: currentUser.email
      });
    },
    onSuccess: () => {
      setCompletedSteps(prev => [...new Set([...prev, 3])]);
      toast.success("Service created!");
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return await base44.entities.UserGallery.create({
        user_email: currentUser.email,
        media_url: file_url,
        media_type: "image",
        caption: ""
      });
    },
    onSuccess: () => {
      toast.success("Image uploaded!");
    }
  });

  const handleStep1Submit = () => {
    if (!profileData.provider_business_name || !profileData.provider_phone) {
      toast.error("Please fill in required fields");
      return;
    }
    updateProfileMutation.mutate(profileData);
    setCurrentStep(2);
  };

  const handleStep2Submit = () => {
    saveAvailabilityMutation.mutate(availabilityData);
    setCurrentStep(3);
  };

  const handleStep3Submit = () => {
    if (!serviceData.title || !serviceData.price || !serviceData.duration) {
      toast.error("Please fill in all service details");
      return;
    }
    createServiceMutation.mutate(serviceData);
    setCurrentStep(4);
  };

  const handleStep4Submit = () => {
    setCompletedSteps(prev => [...new Set([...prev, 4])]);
    setCurrentStep(5);
  };

  const handleStep5Submit = async () => {
    setLoading(true);
    try {
      if (mediaData.about_us) {
        await base44.auth.updateMe({ about_us: mediaData.about_us });
      }
      await base44.auth.updateMe({ provider_onboarding_completed: true });
      setCompletedSteps(prev => [...new Set([...prev, 5])]);
      toast.success("Onboarding completed!");
      navigate(createPageUrl("ProviderHub"));
    } catch (error) {
      toast.error("Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      await uploadImageMutation.mutateAsync(file);
      setMediaData(prev => ({
        ...prev,
        gallery_images: [...prev.gallery_images, URL.createObjectURL(file)]
      }));
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const steps = [
    { number: 1, title: "Profile Setup", icon: User },
    { number: 2, title: "Availability", icon: Calendar },
    { number: 3, title: "First Service", icon: Package },
    { number: 4, title: "Payment Setup", icon: CreditCard },
    { number: 5, title: "Media & About", icon: Image }
  ];

  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">Provider Onboarding</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to SoFlo!</h1>
          <p className="text-gray-400">Let's get your business set up in just 5 easy steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Progress</span>
            <span className="text-white font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center gap-2 min-w-[80px]">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    completedSteps.includes(step.number)
                      ? "bg-green-500 text-white"
                      : currentStep === step.number
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {completedSteps.includes(step.number) ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <span className="text-xs text-gray-400 text-center">{step.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-white/10 mx-2 mt-[-20px]" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {React.createElement(steps[currentStep - 1].icon, { className: "w-6 h-6" })}
                  Step {currentStep}: {steps[currentStep - 1].title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Profile Setup */}
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        Business Name <span className="text-red-400">*</span>
                      </label>
                      <Input
                        value={profileData.provider_business_name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, provider_business_name: e.target.value })
                        }
                        placeholder="e.g., John's Photography Studio"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        Business Phone <span className="text-red-400">*</span>
                      </label>
                      <Input
                        value={profileData.provider_phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, provider_phone: e.target.value })
                        }
                        placeholder="+1 (555) 123-4567"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Business Address</label>
                      <Input
                        value={profileData.provider_business_address}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            provider_business_address: e.target.value
                          })
                        }
                        placeholder="123 Main St, Miami, FL 33101"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Website (Optional)</label>
                      <Input
                        value={profileData.provider_website}
                        onChange={(e) =>
                          setProfileData({ ...profileData, provider_website: e.target.value })
                        }
                        placeholder="https://yourwebsite.com"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Service Category</label>
                      <Select
                        value={profileData.provider_category}
                        onValueChange={(value) =>
                          setProfileData({ ...profileData, provider_category: value })
                        }
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photography">Photography</SelectItem>
                          <SelectItem value="videography">Videography</SelectItem>
                          <SelectItem value="catering">Catering</SelectItem>
                          <SelectItem value="event_planning">Event Planning</SelectItem>
                          <SelectItem value="beauty">Beauty & Hair</SelectItem>
                          <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                          <SelectItem value="home_services">Home Services</SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleStep1Submit}
                      disabled={updateProfileMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Step 2: Availability */}
                {currentStep === 2 && (
                  <>
                    <p className="text-gray-400 text-sm">
                      Set your default working hours. You can always customize this later.
                    </p>
                    <div className="space-y-3">
                      {Object.keys(availabilityData).map((day) => (
                        <div
                          key={day}
                          className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex items-center gap-2 w-32">
                            <Switch
                              checked={availabilityData[day].enabled}
                              onCheckedChange={(checked) =>
                                setAvailabilityData({
                                  ...availabilityData,
                                  [day]: { ...availabilityData[day], enabled: checked }
                                })
                              }
                            />
                            <span className="text-white capitalize">{day}</span>
                          </div>
                          {availabilityData[day].enabled && (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={availabilityData[day].start}
                                onChange={(e) =>
                                  setAvailabilityData({
                                    ...availabilityData,
                                    [day]: { ...availabilityData[day], start: e.target.value }
                                  })
                                }
                                className="bg-white/10 border-white/20 text-white"
                              />
                              <span className="text-gray-400">to</span>
                              <Input
                                type="time"
                                value={availabilityData[day].end}
                                onChange={(e) =>
                                  setAvailabilityData({
                                    ...availabilityData,
                                    [day]: { ...availabilityData[day], end: e.target.value }
                                  })
                                }
                                className="bg-white/10 border-white/20 text-white"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="bg-white/5 border-white/20 text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleStep2Submit}
                        disabled={saveAvailabilityMutation.isPending}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {saveAvailabilityMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Continue
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 3: First Service */}
                {currentStep === 3 && (
                  <>
                    <p className="text-gray-400 text-sm">
                      Create your first service listing. Don't worry, you can add more later!
                    </p>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        Service Title <span className="text-red-400">*</span>
                      </label>
                      <Input
                        value={serviceData.title}
                        onChange={(e) => setServiceData({ ...serviceData, title: e.target.value })}
                        placeholder="e.g., Professional Portrait Session"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Description</label>
                      <Textarea
                        value={serviceData.description}
                        onChange={(e) =>
                          setServiceData({ ...serviceData, description: e.target.value })
                        }
                        placeholder="Describe what's included in this service..."
                        rows={4}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">
                          Price (USD) <span className="text-red-400">*</span>
                        </label>
                        <Input
                          type="number"
                          value={serviceData.price}
                          onChange={(e) =>
                            setServiceData({ ...serviceData, price: e.target.value })
                          }
                          placeholder="99.99"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">
                          Duration (minutes) <span className="text-red-400">*</span>
                        </label>
                        <Input
                          type="number"
                          value={serviceData.duration}
                          onChange={(e) =>
                            setServiceData({ ...serviceData, duration: e.target.value })
                          }
                          placeholder="60"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        className="bg-white/5 border-white/20 text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleStep3Submit}
                        disabled={createServiceMutation.isPending}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {createServiceMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Continue
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 4: Payment Setup */}
                {currentStep === 4 && (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Connect your payment account to receive payments from customers.
                    </p>

                    {paymentData.stripe_connected ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                        <h3 className="text-white font-semibold mb-2">Payment Connected!</h3>
                        <p className="text-gray-400 text-sm">
                          Your Stripe account is connected and ready to receive payments.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                        <h3 className="text-white font-semibold mb-2">Connect Stripe</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          We use Stripe to process payments securely. You'll be redirected to complete
                          the setup.
                        </p>
                        <Button
                          onClick={() => navigate(createPageUrl("StripeOnboarding"))}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Connect Stripe Account
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(3)}
                        className="bg-white/5 border-white/20 text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleStep4Submit}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {paymentData.stripe_connected ? "Continue" : "Skip for Now"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 5: Media & About */}
                {currentStep === 5 && (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Add some visual appeal to your profile and tell customers about your business.
                    </p>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">About Your Business</label>
                      <Textarea
                        value={mediaData.about_us}
                        onChange={(e) => setMediaData({ ...mediaData, about_us: e.target.value })}
                        placeholder="Tell customers about your experience, what makes you unique, your approach to service..."
                        rows={6}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Gallery Images</label>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {mediaData.gallery_images.map((img, idx) => (
                          <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-purple-500/50 transition">
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-spin" />
                          ) : (
                            <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          )}
                          <p className="text-gray-400 text-sm">
                            {uploadingImage ? "Uploading..." : "Click to upload images"}
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(4)}
                        className="bg-white/5 border-white/20 text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={handleStep5Submit}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Complete Setup
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}