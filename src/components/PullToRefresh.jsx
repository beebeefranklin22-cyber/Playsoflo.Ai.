import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);
  const isPulling = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e) => {
      // Only allow pull-to-refresh when scrolled to the very top
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = false;
    };

    const onTouchMove = (e) => {
      if (startY.current === null || isRefreshing) return;
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 10) {
        isPulling.current = true;
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD + 20));
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
      startY.current = null;
      isPulling.current = false;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, onRefresh]);

  const showIndicator = pullDistance > 10 || isRefreshing;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex justify-center items-center z-10 pointer-events-none transition-all"
          style={{ height: isRefreshing ? PULL_THRESHOLD : pullDistance, overflow: 'hidden' }}
        >
          <RefreshCw
            className={`w-6 h-6 text-purple-500 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ opacity: progress, transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      )}
      <div
        style={{
          transform: showIndicator ? `translateY(${isRefreshing ? PULL_THRESHOLD : pullDistance}px)` : 'none',
          transition: !isPulling.current ? 'transform 0.3s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}