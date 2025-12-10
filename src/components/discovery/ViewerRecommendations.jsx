import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Video, Radio, TrendingUp, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ViewerRecommendations({ currentUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { data: userInterests } = useQuery({
    queryKey: ['user-interests', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const interests = await base44.entities.UserInterests.filter({ user_email: currentUser.email });
      return interests[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: viewHistory = [] } = useQuery({
    queryKey: ['view-history', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ViewerAnalytics.filter({ viewer_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: allContent = [] } = useQuery({
    queryKey: ['all-content'],
    queryFn: () => base44.entities.StreamingContent.list(),
    initialData: []
  });

  const { data: aiRecommendations, refetch: refreshRecommendations } = useQuery({
    queryKey: ['ai-recommendations', currentUser?.email],
    queryFn: async () => {
      if (!currentUser || !userInterests) return [];
      
      setLoading(true);
      try {
        const watchedCategories = Object.keys(userInterests.watch_time_by_category || {});
        const topCategories = watchedCategories.slice(0, 3);
        
        const prompt = `Based on this user's viewing preferences, recommend 5 content topics they might enjoy:
- Favorite categories: ${topCategories.join(', ') || 'entertainment, sports'}
- Content preferences: ${JSON.stringify(userInterests.content_preferences)}
- Total watch time by category: ${JSON.stringify(userInterests.watch_time_by_category)}

Return ONLY a JSON array of 5 recommendations with this structure:
[{"title": "Content Title", "category": "category", "reason": "Why they'd like it", "creator_suggestion": "Suggested creator type"}]`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    category: { type: "string" },
                    reason: { type: "string" },
                    creator_suggestion: { type: "string" }
                  }
                }
              }
            }
          }
        });

        return response.recommendations || [];
      } finally {
        setLoading(false);
      }
    },
    enabled: !!currentUser && !!userInterests,
    staleTime: 300000
  });

  const recommendedContent = allContent
    .filter(c => {
      if (!userInterests) return true;
      const favCategories = Object.keys(userInterests.watch_time_by_category || {});
      return favCategories.includes(c.category);
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI-Powered Recommendations
            </CardTitle>
            <Button
              onClick={() => refreshRecommendations()}
              disabled={loading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Generating...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!userInterests ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-50" />
              <p className="text-gray-300 mb-2">Start watching content to get personalized recommendations!</p>
            </div>
          ) : aiRecommendations && aiRecommendations.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {aiRecommendations.map((rec, idx) => (
                <div key={idx} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition">
                  <div className="flex items-start gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="text-white font-bold mb-1">{rec.title}</h4>
                      <Badge className="bg-purple-500/20 text-purple-300 text-xs mb-2">
                        {rec.category}
                      </Badge>
                      <p className="text-gray-400 text-sm mb-2">{rec.reason}</p>
                      <p className="text-gray-500 text-xs italic">{rec.creator_suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Generating recommendations...</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Based on Your Interests */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Based on Your Interests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {recommendedContent.map(content => (
              <div
                key={content.id}
                onClick={() => navigate(`${createPageUrl("LivestreamViewer")}?id=${content.id}`)}
                className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                {content.thumbnail_url && (
                  <img src={content.thumbnail_url} className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  {content.is_live ? (
                    <Badge className="bg-red-500 text-white flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      LIVE
                    </Badge>
                  ) : (
                    <Video className="w-4 h-4 text-gray-400" />
                  )}
                  <Badge className="bg-blue-500/20 text-blue-300 text-xs capitalize">
                    {content.category}
                  </Badge>
                </div>
                <h4 className="text-white font-semibold mb-1">{content.title}</h4>
                <p className="text-gray-400 text-xs">{content.created_by}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}