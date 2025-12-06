import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function SwipeableCard({ 
  children, 
  onSwipe,
  index = 0,
  active = false
}) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateZ = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 0.5, 1, 0.5, 0]);

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      setExitX(info.offset.x > 0 ? 1000 : -1000);
      if (onSwipe) onSwipe(direction);
    } else if (Math.abs(info.offset.y) > threshold) {
      const direction = info.offset.y > 0 ? 'down' : 'up';
      if (onSwipe) onSwipe(direction);
    }
  };

  const scale = active ? 1 : 0.95 - (index * 0.05);
  const yPos = active ? 0 : index * 20;

  return (
    <motion.div
      style={{
        x,
        y,
        rotateZ: active ? rotateZ : 0,
        opacity: active ? opacity : 1 - (index * 0.3),
        scale,
        zIndex: active ? 50 : 50 - index,
      }}
      animate={{
        y: yPos,
        x: exitX
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      drag={active}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className="absolute inset-0 touch-none"
    >
      <div 
        className="w-full h-full rounded-3xl shadow-2xl overflow-hidden"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d"
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}