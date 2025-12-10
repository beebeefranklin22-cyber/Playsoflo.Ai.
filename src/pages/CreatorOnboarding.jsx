import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, ArrowRight, CheckCircle, Target, 
  DollarSign, Package, Lock, Lightbulb, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState("");
  const [goals, setGoals] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (user) => {
      setCurrentUser(user);
      // Check existing progress
      const progress = await base44.entities.OnboardingProgress.filter({ 
        user_email: user.email,
        onboarding_type: 'creator'
      });
      if (progress[0]) {
        setStep(progress[0].current_step || 0);
        setNiche(progress[0].niche || "");
        setGoals(progress[0].goals || []);
      }
    });
  }, []);

  const saveProgressMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.OnboardingProgress.filter({
        user_email: currentUser.email,
        onboarding_type: 'creator'
      });

      if (existing[0]) {
        return await base44.entities.OnboardingProgress.update(existing[0].id, data);
      }
      return await base44.entities.OnboardingProgress.create({
        ...data,
        user_email: currentUser.email,
        onboarding_type: 'creator'
      });
    }
  });

  const niches = [
    "Gaming", "Music", "Sports", "Lifestyle", "Entertainment",
    "News", "Education", "Fitness", "Cooking", "Tech"
  ];

  const goalOptions = [
    "Build audience", "Generate revenue", "Share expertise",
    "Collaborate with others", "Grow brand"
  ];

  const handleNext = async () => {
    if (step === 0 && niche) {
      await saveProgressMutation.mutateAsync({
        current_step: 1,
        niche,
        completed_steps: ['niche_selection']
      });
      setStep(1);
    } else if (step === 1 && goals.length > 0) {
      await saveProgressMutation.mutateAsync({
        current_step: 2,
        niche,
        goals,
        completed_steps: ['niche_selection', 'goals']
      });
      // Generate AI recommendations
      setLoading(true);
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a content strategy advisor. A new creator in the ${niche} niche with these goals: ${goals.join(', ')} wants to start creating content.

Provide actionable recommendations for:
1. 3 content ideas to start with
2. Best monetization strategy (memberships vs PPV vs products)
3. 3 audience engagement tips

Return JSON:
{
  "content_ideas": [{"title": "Idea", "description": "Why it works"}],
  "monetization_strategy": {"primary": "memberships/ppv/products", "reason": "Why"},
  "engagement_tips": [{"tip": "Tip", "impact": "Expected impact"}]
}`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              content_ideas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" }
                  }
                }
              },
              monetization_strategy: {
                type: "object",
                properties: {
                  primary: { type: "string" },
                  reason: { type: "string" }
                }
              },
              engagement_tips: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tip: { type: "string" },
                    impact: { type: "string" }
                  }
                }
              }
            }
          }
        });
        setRecommendations(response);
      } catch (error) {
        toast.error('Failed to generate recommendations');
      }
      setLoading(false);
      setStep(2);
    } else if (step === 2) {
      await saveProgressMutation.mutateAsync({
        current_step: 3,
        niche,
        goals,
        completed_steps: ['niche_selection', 'goals', 'recommendations']
      });
      setStep(3);
    } else if (step === 3) {
      await saveProgressMutation.mutateAsync({
        current_step: 4,
        niche,
        goals,
        completed: true,
        completed_steps: ['niche_selection', 'goals', 'recommendations', 'monetization_setup']
      });
      await base44.auth.updateMe({ is_creator: true });
      toast.success('Onboarding complete! Welcome to the Creator Hub');
      navigate(createPageUrl('CreatorHub'));
    }
  };

  const toggleGoal = (goal) => {
    setGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const steps = [
    { title: "Choose Your Niche", icon: Target },
    { title: "Set Your Goals", icon: Sparkles },
    { title: "Get Recommendations", icon: Lightbulb },
    { title: "Setup Monetization", icon: DollarSign }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 ${idx <= step ? 'text-purple-400' : 'text-gray-600'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      idx < step ? 'bg-green-600' : idx === step ? 'bg-purple-600' : 'bg-gray-700'
                    }`}>
                      {idx < step ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <span className="text-sm font-medium hidden md:block">{s.title}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${idx < step ? 'bg-green-600' : 'bg-gray-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Choose Niche */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Niche</h2>
                    <p className="text-gray-400">What type of content will you create?</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    {niches.map(n => (
                      <button
                        key={n}
                        onClick={() => setNiche(n)}
                        className={`p-4 rounded-xl font-semibold transition ${
                          niche === n
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleNext}
                    disabled={!niche}
                    className="w-full mt-6 bg-purple-600 hover:bg-purple-700 py-6"
                  >
                    Continue <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 1: Goals */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">What Are Your Goals?</h2>
                    <p className="text-gray-400">Select all that apply</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {goalOptions.map(goal => (
                      <button
                        key={goal}
                        onClick={() => toggleGoal(goal)}
                        className={`p-4 rounded-xl font-semibold transition ${
                          goals.includes(goal)
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleNext}
                    disabled={goals.length === 0}
                    className="w-full mt-6 bg-purple-600 hover:bg-purple-700 py-6"
                  >
                    Continue <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: AI Recommendations */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-white text-lg">Generating personalized recommendations...</p>
                    </div>
                  ) : recommendations ? (
                    <>
                      <div className="text-center mb-8">
                        <Lightbulb className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white mb-2">Your Personalized Strategy</h2>
                        <p className="text-gray-400">Based on {niche} content</p>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            Content Ideas to Start
                          </h3>
                          <div className="space-y-2">
                            {recommendations.content_ideas?.map((idea, idx) => (
                              <div key={idx} className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <h4 className="text-white font-semibold mb-1">{idea.title}</h4>
                                <p className="text-gray-400 text-sm">{idea.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-yellow-400" />
                            Recommended Monetization
                          </h3>
                          <Badge className="bg-yellow-500/20 text-yellow-300 mb-2 capitalize">
                            {recommendations.monetization_strategy?.primary}
                          </Badge>
                          <p className="text-gray-300 text-sm">{recommendations.monetization_strategy?.reason}</p>
                        </div>

                        <div>
                          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            Engagement Tips
                          </h3>
                          <div className="space-y-2">
                            {recommendations.engagement_tips?.map((tip, idx) => (
                              <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <h4 className="text-white font-semibold mb-1">{tip.tip}</h4>
                                <p className="text-gray-400 text-sm">{tip.impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleNext}
                        className="w-full mt-6 bg-purple-600 hover:bg-purple-700 py-6"
                      >
                        Setup Monetization <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Monetization Setup */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <DollarSign className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Monetization</h2>
                    <p className="text-gray-400">You can enable more later</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
                      <Lock className="w-8 h-8 text-purple-400 mb-3" />
                      <h3 className="text-white font-bold mb-2">Memberships</h3>
                      <p className="text-gray-400 text-sm mb-4">Recurring monthly revenue from loyal fans</p>
                      <Button className="w-full bg-purple-600" onClick={() => navigate(createPageUrl('CreatorHub') + '?tab=memberships')}>
                        Setup
                      </Button>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl">
                      <Package className="w-8 h-8 text-blue-400 mb-3" />
                      <h3 className="text-white font-bold mb-2">Digital Products</h3>
                      <p className="text-gray-400 text-sm mb-4">Sell presets, guides, courses, and more</p>
                      <Button className="w-full bg-blue-600" onClick={() => navigate(createPageUrl('CreatorHub') + '?tab=products')}>
                        Setup
                      </Button>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                      <Lock className="w-8 h-8 text-yellow-400 mb-3" />
                      <h3 className="text-white font-bold mb-2">PPV Content</h3>
                      <p className="text-gray-400 text-sm mb-4">One-time purchases for exclusive streams</p>
                      <Button className="w-full bg-yellow-600" onClick={() => navigate(createPageUrl('CreatorHub') + '?tab=ppv')}>
                        Setup
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleNext}
                    className="w-full mt-8 bg-green-600 hover:bg-green-700 py-6 text-lg"
                  >
                    Complete Onboarding <CheckCircle className="w-5 h-5 ml-2" />
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