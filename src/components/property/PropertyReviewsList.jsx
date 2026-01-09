import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PropertyReviewsList({ propertyId, hostEmail }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [response, setResponse] = useState("");

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: reviews = [] } = useQuery({
    queryKey: ['property-reviews', propertyId],
    queryFn: () => base44.entities.UserReview.filter({ property_id: propertyId }),
    enabled: !!propertyId,
    initialData: []
  });

  const respondMutation = useMutation({
    mutationFn: async (data) => {
      await base44.asServiceRole.entities.UserReview.update(data.reviewId, {
        host_response: data.response,
        host_response_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['property-reviews']);
      toast.success('Response posted!');
      setRespondingTo(null);
      setResponse("");
    },
    onError: () => {
      toast.error('Failed to post response');
    }
  });

  const handleRespond = (reviewId) => {
    if (!response.trim()) {
      toast.error('Please enter a response');
      return;
    }
    respondMutation.mutate({ reviewId, response });
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <Star className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No reviews yet</p>
      </div>
    );
  }

  const isHost = currentUser?.email === hostEmail;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {review.created_by?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white font-semibold">{review.created_by}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(review.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-gray-300 mb-3">{review.review_text}</p>

          {review.host_response && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <p className="text-emerald-400 font-semibold text-sm">Host Response</p>
              </div>
              <p className="text-gray-300 text-sm">{review.host_response}</p>
              <p className="text-gray-500 text-xs mt-2">
                {new Date(review.host_response_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {isHost && !review.host_response && (
            <div className="mt-4">
              {respondingTo === review.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write your response..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={3}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRespondingTo(null);
                        setResponse("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRespond(review.id)}
                      disabled={respondMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {respondMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Post Response
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRespondingTo(review.id)}
                  className="bg-white/5"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Respond
                </Button>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}