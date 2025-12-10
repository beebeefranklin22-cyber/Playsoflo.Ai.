import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, ThumbsUp, ThumbsDown, Share2, Eye, 
  Radio, TrendingUp, Heart, X, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ContentFeedbackModal from "../components/discovery/ContentFeedbackModal";

export default function PersonalizedFeed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [feedbackContent, setFeedbackContent] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: userInterests } = useQuery({
    queryKey: ['user-interests', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const interests = await base44.entities.UserInterests.filter({ user_email: currentUser.email });
      return interests[0];
    },
    enabled: !!currentUser
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['user-interactions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.UserInteraction.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: allContent = [] } = useQuery({
    queryKey: ['all-content'],
    queryFn: () => base44.entities.StreamingContent.list(),
    initialData: []
  });

  const { data: allAnalytics = [] } = useQuery({
    queryKey: ['all-analytics'],
    queryFn: () => base44.entities.ViewerAnalytics.list(),
    initialData: []
  });

  // AI-powered recommendations
  const { data: aiRecommendations, refetch: refreshRecommendations } = useQuery({
    queryKey: ['ai-recommendations', currentUser?.email],
    queryFn: async () => {
      if (!currentUser || !userInterests) return [];
      
      setRecommendationsLoading(true);
      try {
        const likedContent = interactions
          .filter(i => i.interaction_type === 'like' || i.interaction_type === 'feedback_positive')
          .slice(0, 5)
          .map(i => {
            const content = allContent.find(c => c.id === i.content_id);
            return content ? `${content.title} (${content.category})` : null;
          })
          .filter(Boolean);

        const notInterestedIds = interactions
          .filter(i => i.interaction_type === 'not_interested')
          .map(i => i.content_id);

        const topCategories = Object.entries(userInterests.watch_time_by_category || {})
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([cat]) => cat);

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a content recommendation AI. Based on user preferences, recommend content IDs from available content.

User Profile:
- Top categories: ${topCategories.join(', ')}
- Liked content: ${likedContent.join(', ')}
- Favorite creators: ${userInterests.favorite_creators?.slice(0, 3).join(', ') || 'None'}

Available Content:
${allContent.filter(c => !notInterestedIds.includes(c.id)).slice(0, 50).map(c => 
  `ID: ${c.id}, Title: ${c.title}, Category: ${c.category}, Creator: ${c.created_by}, Type: ${c.type}`
).join('\n')}

Recommend 10 content IDs that best match user preferences. Use both content-based (similar to liked) and collaborative filtering (popular in their categories).

Return JSON:
{
  "recommended_ids": ["id1", "id2", ...],
  "reasons": {"id1": "Why recommended", "id2": "Why recommended", ...}
}`,
          add_context_from_internet: false,
          response_json_schema: {
            type: "object",
            properties: {
              recommended_ids: {
                type: "array",
                items: { type: "string" }
              },
              reasons: {
                type: "object",
                additionalProperties: { type: "string" }
              }
            }
          }
        });

        return response;
      } catch (error) {
        console.error('AI recommendations error:', error);
        return { recommended_ids: [], reasons: {} };
      } finally {
        setRecommendationsLoading(false);
      }
    },
    enabled: !!currentUser && !!userInterests && allContent.length > 0,
    staleTime: 300000
  });

  // Content-based filtering (similar content)
  const contentBasedRecommendations = () => {
    const liked = interactions.filter(i => i.interaction_type === 'like').slice(0, 5);
    const likedCategories = new Set(
      liked.map(i => allContent.find(c => c.id === i.content_id)?.category).filter(Boolean)
    );
    
    return allContent
      .filter(c => likedCategories.has(c.category))
      .filter(c => !interactions.some(i => i.content_id === c.id))
      .slice(0, 10);
  };

  // Collaborative filtering (popular among similar users)
  const collaborativeRecommendations = () => {
    const userCategories = userInterests?.categories || [];
    
    // Find content popular in user's categories
    const popularInCategories = allContent
      .filter(c => userCategories.includes(c.category))
      .map(c => ({
        ...c,
        views: allAnalytics.filter(a => a.stream_id === c.id).length
      }))
      .sort((a, b) => b.views - a.views)
      .filter(c => !interactions.some(i => i.content_id === c.id))
      .slice(0, 10);

    return popularInCategories;
  };

  const recordInteraction = useMutation({
    mutationFn: (data) => base44.entities.UserInteraction.create({
      ...data,
      user_email: currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-interactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-interests'] });
    }
  });

  const handleLike = async (content) => {
    await recordInteraction.mutateAsync({
      content_id: content.id,
      interaction_type: 'like'
    });
    toast.success('Added to your likes!');
  };

  const handleShare = async (content) => {
    await recordInteraction.mutateAsync({
      content_id: content.id,
      interaction_type: 'share'
    });
    
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: `Check out ${content.title}`,
        url: window.location.origin
      });
    } else {
      toast.success('Link copied!');
    }
  };

  const handleNotInterested = async (contentId) => {
    await recordInteraction.mutateAsync({
      content_id: contentId,
      interaction_type: 'not_interested'
    });
    toast.success('We\'ll show you less like this');
    refreshRecommendations();
  };

  const aiRecommendedContent = aiRecommendations?.recommended_ids
    ?.map(id => allContent.find(c => c.id === id))
    .filter(Boolean) || [];

  const contentBased = contentBasedRecommendations();
  const collaborative = collaborativeRecommendations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-400" />
            Your Personalized Feed
          </h1>
          <p className="text-gray-400">Content curated just for you</p>
        </div>

        {/* AI-Powered Recommendations */}
        {recommendationsLoading ? (
          <Card className="bg-white/5 border-white/10 mb-8">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Analyzing your preferences...</p>
            </CardContent>
          </Card>
        ) : aiRecommendedContent.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                AI Picks For You
              </h2>
              <Button
                onClick={() => refreshRecommendations()}
                variant="outline"
                size="sm"
                className="bg-white/5 text-white border-white/20"
              >
                Refresh
              </Button>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {aiRecommendedContent.slice(0, 8).map(content => (
                <ContentCard
                  key={content.id}
                  content={content}
                  reason={aiRecommendations.reasons?.[content.id]}
                  onLike={() => handleLike(content)}
                  onShare={() => handleShare(content)}
                  onNotInterested={() => handleNotInterested(content.id)}
                  onFeedback={() => setFeedbackContent(content)}
                  onView={() => navigate(createPageUrl('LivestreamViewer') + `?id=${content.id}`)}
                  isLiked={interactions.some(i => i.content_id === content.id && i.interaction_type === 'like')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content-Based Recommendations */}
        {contentBased.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              Because You Liked...
            </h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {contentBased.slice(0, 8).map(content => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onLike={() => handleLike(content)}
                  onShare={() => handleShare(content)}
                  onNotInterested={() => handleNotInterested(content.id)}
                  onFeedback={() => setFeedbackContent(content)}
                  onView={() => navigate(createPageUrl('LivestreamViewer') + `?id=${content.id}`)}
                  isLiked={interactions.some(i => i.content_id === content.id && i.interaction_type === 'like')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Collaborative Filtering */}
        {collaborative.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-400" />
              Popular In Your Categories
            </h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {collaborative.slice(0, 8).map(content => (
                <ContentCard
                  key={content.id}
                  content={content}
                  views={content.views}
                  onLike={() => handleLike(content)}
                  onShare={() => handleShare(content)}
                  onNotInterested={() => handleNotInterested(content.id)}
                  onFeedback={() => setFeedbackContent(content)}
                  onView={() => navigate(createPageUrl('LivestreamViewer') + `?id=${content.id}`)}
                  isLiked={interactions.some(i => i.content_id === content.id && i.interaction_type === 'like')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {feedbackContent && (
          <ContentFeedbackModal
            content={feedbackContent}
            currentUser={currentUser}
            onClose={() => setFeedbackContent(null)}
            onSubmit={() => {
              refreshRecommendations();
              setFeedbackContent(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ContentCard({ content, reason, views, onLike, onShare, onNotInterested, onFeedback, onView, isLiked }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer relative overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-48 object-cover"
                onClick={onView}
              />
            ) : (
              <div 
                className="w-full h-48 bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"
                onClick={onView}
              >
                <Eye className="w-12 h-12 text-white/40" />
              </div>
            )}

            {content.is_live && (
              <Badge className="absolute top-2 left-2 bg-red-500 text-white flex items-center gap-1">
                <Radio className="w-3 h-3" />
                LIVE
              </Badge>
            )}

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2"
                >
                  <Button
                    size="icon"
                    onClick={onLike}
                    className={`${isLiked ? 'bg-pink-600' : 'bg-white/20'} hover:bg-pink-600`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={onShare}
                    className="bg-white/20 hover:bg-blue-600"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={onNotInterested}
                    className="bg-white/20 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-3">
            <h3 className="text-white font-semibold mb-1 line-clamp-2" onClick={onView}>
              {content.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-500/20 text-blue-300 text-xs capitalize">
                {content.category}
              </Badge>
              {views && (
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {views}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs">{content.created_by}</p>
            {reason && (
              <p className="text-purple-400 text-xs mt-2 italic">{reason}</p>
            )}
            <Button
              onClick={onFeedback}
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-gray-400 hover:text-white"
            >
              Give Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}