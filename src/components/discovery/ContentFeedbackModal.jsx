import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ContentFeedbackModal({ content, currentUser, onClose, onSubmit }) {
  const queryClient = useQueryClient();
  const [feedbackType, setFeedbackType] = useState(null);
  const [reason, setReason] = useState("");

  const feedbackMutation = useMutation({
    mutationFn: (data) => base44.entities.UserInteraction.create(data),
    onSuccess: async () => {
      // Update user interests
      const interests = await base44.entities.UserInterests.filter({ 
        user_email: currentUser.email 
      });

      if (interests[0]) {
        const updated = { ...interests[0] };
        
        if (feedbackType === 'positive') {
          // Boost category preference
          updated.watch_time_by_category = {
            ...updated.watch_time_by_category,
            [content.category]: (updated.watch_time_by_category?.[content.category] || 0) + 100
          };
          
          // Add creator to favorites
          if (!updated.favorite_creators?.includes(content.created_by)) {
            updated.favorite_creators = [...(updated.favorite_creators || []), content.created_by];
          }
        } else if (feedbackType === 'negative') {
          // Reduce category preference
          updated.watch_time_by_category = {
            ...updated.watch_time_by_category,
            [content.category]: Math.max(0, (updated.watch_time_by_category?.[content.category] || 0) - 50)
          };
        }

        await base44.entities.UserInterests.update(interests[0].id, updated);
      }

      queryClient.invalidateQueries({ queryKey: ['user-interactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-interests'] });
      toast.success('Thank you for your feedback!');
      onSubmit();
    }
  });

  const handleSubmit = () => {
    if (!feedbackType) return;

    feedbackMutation.mutate({
      user_email: currentUser.email,
      content_id: content.id,
      interaction_type: feedbackType === 'positive' ? 'feedback_positive' : 'feedback_negative',
      feedback_reason: reason
    });
  };

  const positiveReasons = [
    "Great quality", "Interesting topic", "Good creator",
    "Well produced", "Educational"
  ];

  const negativeReasons = [
    "Not interested in topic", "Poor quality", "Too long",
    "Already seen similar", "Not relevant"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <Card className="bg-gray-900 border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Rate This Content</CardTitle>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">{content.title}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feedback Type */}
            <div className="flex gap-4">
              <button
                onClick={() => setFeedbackType('positive')}
                className={`flex-1 p-4 rounded-xl border-2 transition ${
                  feedbackType === 'positive'
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <ThumbsUp className={`w-8 h-8 mx-auto mb-2 ${
                  feedbackType === 'positive' ? 'text-green-400' : 'text-gray-400'
                }`} />
                <div className="text-white font-semibold">Like</div>
              </button>
              <button
                onClick={() => setFeedbackType('negative')}
                className={`flex-1 p-4 rounded-xl border-2 transition ${
                  feedbackType === 'negative'
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <ThumbsDown className={`w-8 h-8 mx-auto mb-2 ${
                  feedbackType === 'negative' ? 'text-red-400' : 'text-gray-400'
                }`} />
                <div className="text-white font-semibold">Dislike</div>
              </button>
            </div>

            {/* Reason Selection */}
            {feedbackType && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="text-white font-medium mb-2 block">
                  Why? (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(feedbackType === 'positive' ? positiveReasons : negativeReasons).map(r => (
                    <Badge
                      key={r}
                      onClick={() => setReason(r)}
                      className={`cursor-pointer ${
                        reason === r
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!feedbackType || feedbackMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 py-6"
            >
              {feedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}