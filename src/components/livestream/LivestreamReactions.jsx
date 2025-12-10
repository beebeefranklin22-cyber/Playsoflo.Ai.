import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsUp, Laugh, Sparkles, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const emojiOptions = [
  { emoji: "❤️", label: "Love", icon: Heart, color: "text-red-400" },
  { emoji: "👍", label: "Like", icon: ThumbsUp, color: "text-blue-400" },
  { emoji: "😂", label: "Laugh", icon: Laugh, color: "text-yellow-400" },
  { emoji: "✨", label: "Amazing", icon: Sparkles, color: "text-purple-400" },
  { emoji: "🔥", label: "Fire", icon: Flame, color: "text-orange-400" }
];

export default function LivestreamReactions({ streamId, currentUser }) {
  const queryClient = useQueryClient();
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  const { data: reactionCounts = {} } = useQuery({
    queryKey: ['livestream-reactions', streamId],
    queryFn: async () => {
      const reactions = await base44.entities.LivestreamReaction.filter({ stream_id: streamId });
      const counts = {};
      reactions.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      });
      return counts;
    },
    refetchInterval: 3000,
    initialData: {}
  });

  const sendReactionMutation = useMutation({
    mutationFn: (data) => base44.entities.LivestreamReaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream-reactions', streamId] });
    }
  });

  const handleReaction = (emoji) => {
    // Add floating emoji animation
    const id = Date.now() + Math.random();
    const newEmoji = {
      id,
      emoji,
      x: Math.random() * 80 + 10,
      y: 80
    };
    
    setFloatingEmojis(prev => [...prev, newEmoji]);
    
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 3000);

    // Send reaction to database
    sendReactionMutation.mutate({
      stream_id: streamId,
      user_email: currentUser.email,
      emoji,
      x_position: newEmoji.x,
      y_position: newEmoji.y
    });
  };

  return (
    <>
      {/* Floating Emojis Animation */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {floatingEmojis.map((item) => (
            <motion.div
              key={item.id}
              initial={{ 
                x: `${item.x}%`, 
                y: `${item.y}%`,
                scale: 0,
                opacity: 1 
              }}
              animate={{ 
                y: `${item.y - 50}%`,
                scale: [1, 1.5, 1],
                opacity: [1, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute text-4xl"
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction Bar */}
      <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-3 border border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          {emojiOptions.map(({ emoji, label, icon: Icon, color }) => (
            <motion.div key={emoji} whileTap={{ scale: 0.9 }}>
              <Button
                onClick={() => handleReaction(emoji)}
                className="bg-white/10 hover:bg-white/20 border-white/10 flex items-center gap-2 relative"
                size="sm"
              >
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-white text-sm">{emoji}</span>
                {reactionCounts[emoji] > 0 && (
                  <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {reactionCounts[emoji] > 99 ? '99+' : reactionCounts[emoji]}
                  </span>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}