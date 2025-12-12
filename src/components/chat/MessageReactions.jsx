import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '👏'];

export default function MessageReactions({ message, currentUser, onReact }) {
  const [showPicker, setShowPicker] = useState(false);

  const reactions = message.reactions || {};
  const reactionCounts = {};
  
  Object.entries(reactions).forEach(([emoji, users]) => {
    if (users.length > 0) {
      reactionCounts[emoji] = {
        count: users.length,
        hasReacted: users.includes(currentUser?.email)
      };
    }
  });

  const handleReact = (emoji) => {
    onReact(message.id, emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative flex items-center gap-1 mt-1">
      {Object.entries(reactionCounts).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition ${
            data.hasReacted
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          <span>{emoji}</span>
          <span className="font-medium">{data.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 hover:bg-white/10 rounded-full transition"
        >
          <Smile className="w-4 h-4 text-gray-400" />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-white/20 rounded-xl p-2 flex gap-1 shadow-xl z-10"
            >
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}