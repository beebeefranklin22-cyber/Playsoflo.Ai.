import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, TrendingUp, Users, Calendar, Zap, Target } from "lucide-react";
import { toast } from "sonner";

export default function CreatorContentSuggestions({ currentUser }) {
  const [loading, setLoading] = useState(false);

  const { data: myContent = [] } = useQuery({
    queryKey: ['my-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myAnalytics = [] } = useQuery({
    queryKey: ['my-analytics', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const analytics = await base44.entities.ViewerAnalytics.list();
      return analytics.filter(a => myContent.some(c => c.id === a.stream_id));
    },
    enabled: !!currentUser && myContent.length > 0,
    initialData: []
  });

  const { data: suggestions, refetch: refreshSuggestions } = useQuery({
    queryKey: ['content-suggestions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      
      setLoading(true);
      try {
        const topCategories = myContent.reduce((acc, c) => {
          acc[c.category] = (acc[c.category] || 0) + 1;
          return acc;
        }, {});

        const avgRetention = myAnalytics.length > 0
          ? myAnalytics.reduce((sum, a) => sum + (a.retention_rate || 0), 0) / myAnalytics.length
          : 0;

        const prompt = `You are a content strategist helping a creator grow their audience. Based on their content history, suggest trending topics and content ideas.

Creator's Profile:
- Main categories: ${Object.keys(topCategories).join(', ')}
- Content count: ${myContent.length}
- Average viewer retention: ${avgRetention.toFixed(1)}%
- Current date: ${new Date().toLocaleDateString()}

Provide 6 actionable content suggestions with:
1. Trending topics in their niche
2. Collaboration opportunities
3. Content format innovations
4. Audience engagement strategies
5. Seasonal/timely content ideas
6. Growth hacks specific to their content type

Return JSON with this structure:
{
  "trending_topics": [{"topic": "Topic", "reason": "Why it's trending", "estimated_reach": "High/Medium/Low"}],
  "collaboration_ideas": [{"idea": "Collaboration type", "benefit": "Expected benefit"}],
  "content_formats": [{"format": "Format name", "description": "How to implement"}],
  "engagement_strategies": [{"strategy": "Strategy", "implementation": "How to do it"}],
  "timely_content": [{"idea": "Content idea", "timing": "When to post"}],
  "growth_tips": [{"tip": "Growth hack", "impact": "Expected impact"}]
}`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              trending_topics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topic: { type: "string" },
                    reason: { type: "string" },
                    estimated_reach: { type: "string" }
                  }
                }
              },
              collaboration_ideas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    idea: { type: "string" },
                    benefit: { type: "string" }
                  }
                }
              },
              content_formats: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    format: { type: "string" },
                    description: { type: "string" }
                  }
                }
              },
              engagement_strategies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    strategy: { type: "string" },
                    implementation: { type: "string" }
                  }
                }
              },
              timely_content: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    idea: { type: "string" },
                    timing: { type: "string" }
                  }
                }
              },
              growth_tips: {
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

        return response;
      } catch (error) {
        toast.error('Failed to generate suggestions');
        return null;
      } finally {
        setLoading(false);
      }
    },
    enabled: !!currentUser && myContent.length > 0,
    staleTime: 600000
  });

  const reachColors = {
    High: 'bg-green-500/20 text-green-300',
    Medium: 'bg-yellow-500/20 text-yellow-300',
    Low: 'bg-blue-500/20 text-blue-300'
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              AI Content Suggestions
            </CardTitle>
            <Button
              onClick={() => refreshSuggestions()}
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Generating...' : 'Refresh Ideas'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myContent.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-yellow-400 mx-auto mb-3 opacity-50" />
              <p className="text-gray-300">Create your first content to get AI-powered suggestions!</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Analyzing trends and generating ideas...</p>
            </div>
          ) : suggestions ? (
            <div className="space-y-6">
              {/* Trending Topics */}
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Trending Topics
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {suggestions.trending_topics?.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-semibold flex-1">{item.topic}</h4>
                        <Badge className={reachColors[item.estimated_reach] || 'bg-gray-500/20 text-gray-300'}>
                          {item.estimated_reach}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaboration Ideas */}
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Collaboration Opportunities
                </h3>
                <div className="space-y-2">
                  {suggestions.collaboration_ideas?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <h4 className="text-white font-semibold mb-1">{item.idea}</h4>
                      <p className="text-gray-400 text-sm">{item.benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Formats */}
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Innovative Formats
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {suggestions.content_formats?.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg">
                      <h4 className="text-white font-semibold mb-1">{item.format}</h4>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timely Content */}
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Timely Content Ideas
                </h3>
                <div className="space-y-2">
                  {suggestions.timely_content?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="text-white font-semibold mb-1">{item.idea}</h4>
                      <p className="text-blue-300 text-sm">⏰ {item.timing}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth Tips */}
              <div>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Growth Strategies
                </h3>
                <div className="space-y-2">
                  {suggestions.growth_tips?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <h4 className="text-white font-semibold mb-1">{item.tip}</h4>
                      <p className="text-gray-400 text-sm">{item.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}