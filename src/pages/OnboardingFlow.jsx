
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import {
  Sparkles, Users, Briefcase, Car, Heart, ShoppingBag,
  Music, Shield, CheckCircle, ArrowRight, X,
  Zap, Gift, TrendingUp, Camera, Home
} from "lucide-react";

const roleOptions = [
  {
    id: "customer",
    title: "Explorer",
    description: "Discover experiences, book services, enjoy life",
    icon: Heart,
    gradient: "from-pink-500 to-rose-500",
    features: ["Book experiences", "Order services", "Earn rewards", "Join community"]
  },
  {
    id: "creator",
    title: "Creator",
    description: "Share content, build audience, monetize passion",
    icon: Music,
    gradient: "from-purple-500 to-pink-500",
    features: ["Publish content", "Receive tips", "Collaborate", "Grow fans"]
  },
  {
    id: "provider",
    title: "Provider",
    description: "Offer services, grow business, serve customers",
    icon: Briefcase,
    gradient: "from-blue-500 to-cyan-500",
    features: ["List services", "Get verified", "Build trust", "Earn income"]
  },
  {
    id: "driver",
    title: "Driver",
    description: "Drive on your terms, earn bonuses, get benefits",
    icon: Car,
    gradient: "from-green-500 to-emerald-500",
    features: ["Flexible hours", "Fuel reimbursement", "Insurance", "Bonuses"]
  }
];

const interestOptions = [
  { id: "exotic_cars", label: "Exotic Cars", icon: "🏎️" },
  { id: "yachts", label: "Yachts", icon: "🛥️" },
  { id: "fine_dining", label: "Fine Dining", icon: "🍽️" },
  { id: "nightlife", label: "Nightlife", icon: "🎉" },
  { id: "wellness", label: "Wellness", icon: "🧘" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "real_estate", label: "Real Estate", icon: "🏠" },
  { id: "technology", label: "Technology", icon: "💻" },
  { id: "art_culture", label: "Art & Culture", icon: "🎨" },
  { id: "fitness", label: "Fitness", icon: "💪" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "shopping", label: "Shopping", icon: "🛍️" }
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: "",
    status_message: ""
  });

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setProfileData({
        full_name: user.full_name || "",
        bio: user.bio || "",
        status_message: user.status_message || ""
      });
    }).catch(() => {});
  }, []);

  const { data: onboardingProgress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: async () => {
      if (!currentUser) return null;
      const progress = await base44.entities.OnboardingProgress.filter({
        user_email: currentUser.email
      });
      return progress[0] || null;
    },
    enabled: !!currentUser
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data) => {
      if (onboardingProgress) {
        return await base44.entities.OnboardingProgress.update(onboardingProgress.id, data);
      } else {
        return await base44.entities.OnboardingProgress.create({
          user_email: currentUser.email,
          ...data
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-progress"] });
    }
  });

  const handleRoleSelect = async (roleId) => {
    setSelectedRole(roleId);
    await updateProgressMutation.mutateAsync({
      user_role: roleId,
      current_step: 1,
      completed_steps: ["role_selection"]
    });

    // Update user attributes based on role
    const updates = {};
    if (roleId === "creator") updates.is_creator = true;
    if (roleId === "provider") updates.is_provider = true;
    
    if (Object.keys(updates).length > 0) {
      await base44.auth.updateMe(updates);
    }
    
    setStep(1);
  };

  const handleInterestsNext = async () => {
    await updateProgressMutation.mutateAsync({
      interests: selectedInterests,
      current_step: 2,
      completed_steps: [...(onboardingProgress?.completed_steps || []), "interests"]
    });
    setStep(2);
  };

  const handleProfileComplete = async () => {
    await base44.auth.updateMe(profileData);
    await updateProgressMutation.mutateAsync({
      profile_completed: true,
      current_step: 3,
      completed_steps: [...(onboardingProgress?.completed_steps || []), "profile"]
    });
    setStep(3);
  };

  const handleComplete = async () => {
    await updateProgressMutation.mutateAsync({
      completed: true,
      tour_completed: true
    });

    // Give welcome bonus - changed to 5 SoFloCoin
    if (!currentUser.welcome_bonus_claimed) {
      await base44.auth.updateMe({
        soflo_coins: (currentUser.soflo_coins || 0) + 5,
        welcome_bonus_claimed: true
      });
    }

    navigate(createPageUrl("Home"));
  };

  const handleSkip = () => {
    // Store that user has skipped onboarding so they won't be redirected again this session
    sessionStorage.setItem('onboarding_skipped', 'true');
    navigate(createPageUrl("Home"));
  };

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const roleSpecificSteps = {
    customer: [
      {
        title: "Explore Experiences",
        description: "Browse exotic cars, yachts, and exclusive events",
        icon: Heart,
        action: "Browse Now",
        page: "explore"
      },
      {
        title: "Book Services",
        description: "Access 60+ services from verified providers",
        icon: ShoppingBag,
        action: "View Services",
        page: "Marketplace"
      },
      {
        title: "Earn Rewards",
        description: "Get SoFlo Coins for every experience",
        icon: Gift,
        action: "Learn More",
        page: "Rewards"
      }
    ],
    creator: [
      {
        title: "Create Your Hub",
        description: "Set up your creator profile and start sharing",
        icon: Music,
        action: "Go to Creator Hub",
        page: "CreatorHub"
      },
      {
        title: "Collaborate",
        description: "Connect with other creators for joint projects",
        icon: Users,
        action: "Find Collaborators",
        page: "CollaborationHub"
      },
      {
        title: "Monetize",
        description: "Receive tips and sell products to your fans",
        icon: TrendingUp,
        action: "Start Earning",
        page: "CreatorHub"
      }
    ],
    provider: [
      {
        title: "List Your Service",
        description: "Add your first service to the marketplace",
        icon: Briefcase,
        action: "Add Service",
        page: "ProviderHub"
      },
      {
        title: "Get Verified",
        description: "Build trust with verified credentials",
        icon: Shield,
        action: "Start Verification",
        page: "ProviderHub"
      },
      {
        title: "Grow Your Business",
        description: "Access escrow protection and premium features",
        icon: TrendingUp,
        action: "Learn More",
        page: "ProviderHub"
      }
    ],
    driver: [
      {
        title: "Start Driving",
        description: "Log your first ride and earn fuel reimbursement",
        icon: Car,
        action: "Driver Hub",
        page: "DriverHub"
      },
      {
        title: "Track Earnings",
        description: "Monitor miles, rides, and bonuses",
        icon: TrendingUp,
        action: "View Stats",
        page: "DriverHub"
      },
      {
        title: "Get Bonuses",
        description: "$100 after 7 rides + $50 switch bonus",
        icon: Gift,
        action: "Learn More",
        page: "DriverHub"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text mb-2">
              Welcome to PlaySoFlo
            </h1>
            <p className="text-gray-400">Let's personalize your experience</p>
          </div>
          <Button variant="ghost" onClick={handleSkip} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5 mr-2" />
            Skip
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <p className="text-gray-400 text-sm mt-2">
            Step {step + 1} of {totalSteps}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Role Selection */}
          {step === 0 && (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Path</h2>
                    <p className="text-gray-400">Select your primary role to get started</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {roleOptions.map((role) => (
                      <motion.button
                        key={role.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRoleSelect(role.id)}
                        className={`p-6 rounded-2xl border-2 transition text-left ${
                          selectedRole === role.id
                            ? "border-purple-500 bg-purple-500/20"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${role.gradient} flex items-center justify-center mb-4`}>
                          <role.icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                        <p className="text-gray-400 text-sm mb-4">{role.description}</p>
                        <div className="space-y-2">
                          {role.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 1: Interests */}
          {step === 1 && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <Heart className="w-16 h-16 text-pink-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">What Interests You?</h2>
                    <p className="text-gray-400">Select at least 3 to personalize your feed</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {interestOptions.map((interest) => {
                      const isSelected = selectedInterests.includes(interest.id);
                      return (
                        <motion.button
                          key={interest.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedInterests(selectedInterests.filter(i => i !== interest.id));
                            } else {
                              setSelectedInterests([...selectedInterests, interest.id]);
                            }
                          }}
                          className={`p-4 rounded-xl border-2 transition ${
                            isSelected
                              ? "border-purple-500 bg-purple-500/20"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <div className="text-4xl mb-2">{interest.icon}</div>
                          <div className="text-white text-sm font-medium">{interest.label}</div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(0)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleInterestsNext}
                      disabled={selectedInterests.length < 3}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Profile Setup */}
          {step === 2 && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <Camera className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
                    <p className="text-gray-400">Let others know who you are</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Display Name</label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Bio</label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Status Message</label>
                      <input
                        type="text"
                        value={profileData.status_message}
                        onChange={(e) => setProfileData({...profileData, status_message: e.target.value})}
                        placeholder="What's your vibe?"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleProfileComplete}
                      disabled={!profileData.full_name}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Next Steps */}
          {step === 3 && selectedRole && (
            <motion.div
              key="next-steps"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">You're All Set!</h2>
                    <p className="text-gray-400 mb-4">Here's what you can do next</p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      +5 SoFloCoin Welcome Bonus
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {roleSpecificSteps[selectedRole].map((action, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition cursor-pointer"
                        onClick={() => navigate(createPageUrl(action.page))}
                      >
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                          <action.icon className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-white font-bold mb-2">{action.title}</h3>
                        <p className="text-gray-400 text-sm mb-4">{action.description}</p>
                        <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                          {action.action}
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    onClick={handleComplete}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Go to Home
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
