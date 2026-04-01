import React, { useState, useEffect } from "react";
import SwipeableCard from "./SwipeableCard";

export default function CardStack({ cards = [], onCardChange, currentIndex: externalIndex }) {
  const [currentIndex, setCurrentIndex] = useState(externalIndex || 0);
  const [direction, setDirection] = useState(null);

  useEffect(() => {
    if (externalIndex !== undefined) {
      setCurrentIndex(externalIndex);
    }
  }, [externalIndex]);

  const handleSwipe = (dir) => {
    setDirection(dir);
    let nextIndex;
    
    if (dir === 'right' || dir === 'down') {
      nextIndex = (currentIndex + 1) % cards.length;
    } else {
      nextIndex = (currentIndex - 1 + cards.length) % cards.length;
    }
    
    setCurrentIndex(nextIndex);
    if (onCardChange) {
      onCardChange(nextIndex, cards[nextIndex]);
    }
  };

  const getVisibleCards = () => {
    const visible = [];
    for (let i = 0; i < Math.min(3, cards.length); i++) {
      const index = (currentIndex + i) % cards.length;
      visible.push({
        index,
        data: cards[index],
        stackIndex: i
      });
    }
    return visible;
  };

  const visibleCards = getVisibleCards();

  if (!cards || cards.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-2">No content available</p>
          <p className="text-gray-400 text-sm">Please refresh the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ perspective: "1500px" }}>
      {visibleCards.map((card) => (
        <SwipeableCard
          key={card.index}
          index={card.stackIndex}
          active={card.stackIndex === 0}
          onSwipe={card.stackIndex === 0 ? handleSwipe : undefined}
        >
          {card.data?.content}
        </SwipeableCard>
      ))}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none">
        {cards.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex 
                ? 'w-8 bg-white' 
                : 'w-2 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}