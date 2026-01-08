import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ThumbsUp, Star, Flame, Zap, Gift } from "lucide-react";

const reactionIcons = {
  heart: Heart,
  like: ThumbsUp,
  star: Star,
  fire: Flame,
  zap: Zap,
  gift: Gift
};

const reactionColors = {
  heart: "#ec4899",
  like: "#3b82f6",
  star: "#fbbf24",
  fire: "#f97316",
  zap: "#a855f7",
  gift: "#10b981"
};

export default function ReactionEffects({ streamId }) {
  const [floatingReactions, setFloatingReactions] = useState([]);

  useEffect(() => {
    // Simulate incoming reactions
    const interval = setInterval(() => {
      const types = Object.keys(reactionIcons);
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const newReaction = {
        id: Date.now() + Math.random(),
        type: randomType,
        x: Math.random() * 80 + 10,
        delay: Math.random() * 0.5
      };

      setFloatingReactions(prev => [...prev, newReaction]);

      // Remove after animation
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 4000);
    }, 2000);

    return () => clearInterval(interval);
  }, [streamId]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {floatingReactions.map(reaction => {
          const Icon = reactionIcons[reaction.type];
          const color = reactionColors[reaction.type];
          
          return (
            <motion.div
              key={reaction.id}
              initial={{ 
                y: "100%", 
                x: `${reaction.x}%`,
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                y: "-100%",
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1, 0.8],
                rotate: [0, 10, -10, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 3,
                delay: reaction.delay,
                ease: "easeOut"
              }}
              className="absolute"
              style={{ left: 0, bottom: 0 }}
            >
              <Icon 
                className="w-8 h-8 drop-shadow-lg" 
                style={{ color }}
                fill={color}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}