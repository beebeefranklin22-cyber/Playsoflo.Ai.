import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Sparkles, ChevronRight, CheckCircle2, Circle, 
  Brain, Target, Zap, Music, Wallet, ShoppingBag,
  Car, Home, Users, TrendingUp, MessageCircle, Video
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SmartOnboarding() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiPersonalization, setAiPersonalization] = useState(null);
  const [userPreferences, setUserPreferences] = useState({
    interests: [],
    primary_use: '',
    location_sharing: false,
    notifications_enabled: true
  });

  useEffect(() => {
    const initOnboarding = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Check if already onboarded
        if (user.onboarding_completed) {
          navigate(createPageUrl("Home"));
          return;
        }

        // Simplified onboarding without AI calls
        const defaultPersonalization = {
          welcome_message: 'Your all-in-one lifestyle super-app is ready to explore!',
          featured_tools: ['Music & Entertainment', 'Marketplace', 'Wallet', 'Social Feed', 'Real Estate', 'AI Studio'],
          suggested_actions: ['Explore the marketplace', 'Set up your wallet', 'Connect with friends', 'Try AI tools'],
          recommended_hubs: ['creator', 'provider'],
          suggested_interests: ['Music & Entertainment', 'Food & Dining', 'Technology']
        };

        setAiPersonalization(defaultPersonalization);
        setUserPreferences(prev => ({
          ...prev,
          interests: defaultPersonalization.suggested_interests || []
        }));
        setLoading(false);
      } catch (error) {
        console.error('Onboarding init error:', error);
        setLoading(false);
      }
    };

    initOnboarding();
  }, []);

  const availableInterests = [
    "Music & Entertainment", "Luxury Lifestyle", "Food & Dining", "Travel & Adventure",
    "Real Estate", "Cryptocurrency", "Art & Culture", "Nightlife",
    "Sports & Fitness", "Fashion", "Technology", "Gaming"
  ];

  const completeOnboarding = async () => {
    try {
      await base44.auth.updateMe({
        interests: userPreferences.interests,
        primary_use: userPreferences.primary_use,
        onboarding_completed: true,
        notification_preferences: {
          app_updates: userPreferences.notifications_enabled,
          promotions: userPreferences.notifications_enabled,
          new_features: userPreferences.notifications_enabled
        }
      });

      toast.success('Welcome to PlaySoFlo! 🎉');
      navigate(createPageUrl("Home"));
    } catch (error) {
      toast.error('Failed to complete onboarding');
    }
  };

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to PlaySoFlo',
      description: aiPersonalization?.welcome_message || 'Your all-in-one lifestyle super-app',
      icon: Sparkles
    },
    {
      id: 'interests',
      title: 'What interests you?',
      description: 'Help us personalize your experience',
      icon: Target
    },
    {
      id: 'features',
      title: 'Explore Key Features',
      description: 'Discover what you can do',
      icon: Zap
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description: 'Start exploring',
      icon: CheckCircle2
    }
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <div className="text-center">
          <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl">Personalizing your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
        />
      </div>

      {/* Steps Indicator */}
      <div className="absolute top-8 left-0 right-0 px-6">
        <div className="max-w-4xl mx-auto flex justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                  idx <= currentStep 
                    ? 'bg-purple-500 border-purple-400' 
                    : 'bg-white/10 border-white/20'
                }`}>
                  {idx < currentStep ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className={`w-5 h-5 ${idx <= currentStep ? 'text-white' : 'text-gray-400'}`} />
                  )}
                </div>
                <p className={`text-xs mt-2 hidden md:block ${
                  idx <= currentStep ? 'text-white' : 'text-gray-500'
                }`}>
                  {step.id}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="h-full flex items-center justify-center px-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-2xl py-24"
          >
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
                >
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-black text-white mb-4">
                  Welcome, {currentUser?.full_name?.split(' ')[0]}!
                </h1>
                <p className="text-xl text-gray-300 mb-12 max-w-xl mx-auto leading-relaxed">
                  {aiPersonalization?.welcome_message || 
                   'Get ready to explore a world of lifestyle experiences, services, and connections.'}
                </p>
                <Button
                  onClick={() => setCurrentStep(1)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-xl py-6 px-12 rounded-full"
                >
                  Let's Get Started
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 1: Interests */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-4 text-center">
                  What interests you?
                </h2>
                <p className="text-gray-400 mb-8 text-center">
                  Select at least 3 to personalize your feed
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {availableInterests.map((interest) => {
                    const isSelected = userPreferences.interests.includes(interest);
                    return (
                      <motion.button
                        key={interest}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setUserPreferences(prev => ({
                            ...prev,
                            interests: isSelected
                              ? prev.interests.filter(i => i !== interest)
                              : [...prev.interests, interest]
                          }));
                        }}
                        className={`p-6 rounded-2xl border-2 transition ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-white/5 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <p className="text-white font-semibold text-center">{interest}</p>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setCurrentStep(0)}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/20 py-6"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={userPreferences.interests.length < 3}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 py-6"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Features Tour */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-4xl font-bold text-white mb-4 text-center">
                  Your Personalized Features
                </h2>
                <p className="text-gray-400 mb-8 text-center">
                  Based on your interests, here's what you can explore
                </p>

                <div className="space-y-4 mb-8">
                  {aiPersonalization?.featured_tools?.slice(0, 6).map((tool, idx) => {
                    const iconMap = {
                      'Music': Music,
                      'Wallet': Wallet,
                      'Marketplace': ShoppingBag,
                      'Travel': Car,
                      'Social': Users,
                      'Creator': Video,
                      'Real Estate': Home
                    };
                    
                    const Icon = Object.entries(iconMap).find(([key]) => 
                      tool.toLowerCase().includes(key.toLowerCase())
                    )?.[1] || Sparkles;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 glass-effect border border-white/10 rounded-2xl hover:bg-white/10 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">{tool}</h3>
                            <p className="text-gray-400 text-sm">
                              {aiPersonalization?.suggested_actions?.[idx] || 'Explore this feature'}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/20 py-6"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 py-6"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-black text-white mb-4">
                  You're All Set!
                </h1>
                <p className="text-xl text-gray-300 mb-12 max-w-xl mx-auto">
                  Your personalized PlaySoFlo experience is ready. Let's explore!
                </p>

                {/* AI Suggested First Actions */}
                {aiPersonalization?.suggested_actions && (
                  <div className="mb-12">
                    <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      AI Suggests You Try:
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {aiPersonalization.suggested_actions.slice(0, 4).map((action, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
                          <p className="text-gray-300 text-sm">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={completeOnboarding}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-xl py-6 px-12 rounded-full"
                >
                  Start Exploring
                  <Sparkles className="w-6 h-6 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}