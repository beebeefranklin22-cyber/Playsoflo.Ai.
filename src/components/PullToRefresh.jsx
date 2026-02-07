import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 80], [0, 1]);
  const rotate = useTransform(y, [0, 80], [0, 360]);

  const handleDragEnd = async (event, info) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        y.set(0);
      }
    } else {
      y.set(0);
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.2, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="relative"
      >
        <motion.div
          style={{ opacity }}
          className="absolute top-0 left-0 right-0 flex justify-center items-center h-20 -mt-20"
        >
          <motion.div style={{ rotate }} className={isRefreshing ? 'animate-spin' : ''}>
            <RefreshCw className="w-6 h-6 text-purple-500" />
          </motion.div>
        </motion.div>
        {children}
      </motion.div>
    </div>
  );
}