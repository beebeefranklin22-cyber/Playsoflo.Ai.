import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, TrendingUp, Zap, Star,
  ChevronRight, Eye, Award, Target
} from "lucide-react";
import { motion } from "framer-motion";

export default function Discover() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("foryou");
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch personalized recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ["ai-recommendations", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const recs = await base44.entities.AIRecommendation.filter({
        user_email: currentUser.email,
        interacted: false
      });
      return recs.sort((a, b) => b.score - a.score);
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch trending content
  const { data: trending = [] } = useQuery({
    queryKey: ["trending-content"],
    queryFn: async () => {
      const [experiences, services, posts] = await Promise.all([
        base44.entities.Experience.list('-rating'),
        base44.entities.MarketplaceItem.list('-rating'),
        base44.entities.SocialPost.list('-likes_count')
      ]);

      return [
        ...experiences.slice(0, 5).map(e => ({ ...e, type: "experience" })),
        ...services.slice(0, 5).map(s => ({ ...s, type: "service" })),
        ...posts.slice(0, 5).map(p => ({ ...p, type: "post" }))
      ];
    },
    initialData: []
  });

  // Generate AI insights about trending content
  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI content analyst for PlaySoFlo. Analyze the following trending content and user behavior to generate insights.

Trending Content:
${trending.slice(0, 10).map(t => `- ${t.title || t.caption} (${t.type}): ${t.rating || t.likes_count || 0} engagement`).join('\n')}

User Interests: ${currentUser?.saved_experiences?.length || 0} saved experiences

Generate insights about:
1. What's hot right now (2 sentences)
2. Emerging trends (2 sentences)  
3. Recommendation for the user (2 sentences)

Return as JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            whats_hot: { type: "string" },
            emerging_trends: { type: "string" },
            personal_recommendation: { type: "string" }
          }
        }
      });

      setAiInsights(response);
    } catch (error) {
      console.error("Error generating insights:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (currentUser && !aiInsights && trending.length > 0) {
      generateInsights();
    }
  }, [currentUser, trending]);

  const markRecommendationInteracted = useMutation({
    mutationFn: async (recId) => {
      await base44.entities.AIRecommendation.update(recId, {
        interacted: true
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-purple-950 pb-20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-400" />
            Discover
          </h1>
          <p className="text-gray-300 text-lg">
            AI-powered recommendations just for you
          </p>
        </motion.div>

        {/* AI Insights Card */}
        {aiInsights && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <h3 className="text-white font-bold">What's Hot</h3>
                  </div>
                  <p className="text-gray-300 text-sm">{aiInsights.whats_hot}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <h3 className="text-white font-bold">Emerging Trends</h3>
                  </div>
                  <p className="text-gray-300 text-sm">{aiInsights.emerging_trends}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <h3 className="text-white font-bold">For You</h3>
                  </div>
                  <p className="text-gray-300 text-sm">{aiInsights.personal_recommendation}</p>
                </div>

                <Button
                  onClick={generateInsights}
                  disabled={loadingInsights}
                  variant="outline"
                  className="w-full"
                >
                  {loadingInsights ? "Analyzing..." : "Refresh Insights"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="foryou">For You</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
          </TabsList>

          {/* For You Tab */}
          <TabsContent value="foryou" className="space-y-4">
            {recommendations.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Building Your Profile
                  </h3>
                  <p className="text-gray-400">
                    Explore the app to get personalized recommendations
                  </p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec, idx) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-500/30 text-purple-200">
                              {rec.score}% Match
                            </Badge>
                            <Badge className="bg-white/10 text-gray-300 capitalize">
                              {rec.recommendation_type}
                            </Badge>
                          </div>
                          <p className="text-white font-medium text-lg mb-2">
                            {rec.ai_summary}
                          </p>
                          <p className="text-gray-400 text-sm flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            {rec.reason}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            markRecommendationInteracted.mutate(rec.id);
                            if (rec.recommendation_type === "experience") {
                              navigate(createPageUrl("explore"));
                            } else if (rec.recommendation_type === "service") {
                              navigate(createPageUrl("Marketplace"));
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Explore
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                      {rec.based_on && rec.based_on.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {rec.based_on.map((factor, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {trending.slice(0, 10).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          #{idx + 1}
                        </div>
                        <div className="flex-1">
                          <Badge className="mb-2 bg-orange-500/20 text-orange-300 capitalize">
                            {item.type}
                          </Badge>
                          <h3 className="text-white font-bold mb-2">
                            {item.title || item.caption}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400" />
                              {item.rating || item.likes_count || 0}
                            </span>
                            {item.category && (
                              <span className="capitalize">
                                {item.category.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Popular Tab */}
          <TabsContent value="popular" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {trending.sort((a, b) => (b.rating || b.likes_count || 0) - (a.rating || a.likes_count || 0)).slice(0, 9).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <Award className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                      <Badge className="mb-2 capitalize">{item.type}</Badge>
                      <h3 className="text-white font-bold mb-2">
                        {item.title || item.caption}
                      </h3>
                      <div className="flex items-center justify-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-yellow-400" />
                        <span className="font-bold">
                          {item.rating || Math.floor((item.likes_count || 0) / 10)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}