import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Eye, EyeOff } from 'lucide-react';

/**
 * SafeAreaDebugger - Toggle visual debugging for safe areas
 * Usage: Add <SafeAreaDebugger /> anywhere in your app during development
 * Remove or comment out for production builds
 */
export default function SafeAreaDebugger() {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    if (debugMode) {
      document.body.classList.add('debug-safe-areas');
    } else {
      document.body.classList.remove('debug-safe-areas');
    }
  }, [debugMode]);

  // Only show in development or when explicitly enabled
  if (import.meta.env.PROD && !window.location.search.includes('debug=true')) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-[9998]">
      <Button
        onClick={() => setDebugMode(!debugMode)}
        className={`${
          debugMode 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-gray-700 hover:bg-gray-600'
        } shadow-lg`}
        size="sm"
      >
        {debugMode ? (
          <>
            <EyeOff className="w-4 h-4 mr-2" />
            Hide Debug
          </>
        ) : (
          <>
            <Eye className="w-4 h-4 mr-2" />
            Debug Safe Areas
          </>
        )}
      </Button>
      {debugMode && (
        <div className="absolute bottom-full mb-2 right-0 bg-black/90 text-white text-xs p-3 rounded-lg whitespace-nowrap">
          <p className="font-bold mb-1">Safe Area Values:</p>
          <p>Top: {getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')}</p>
          <p>Bottom: {getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')}</p>
          <p>Left: {getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left')}</p>
          <p>Right: {getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right')}</p>
        </div>
      )}
    </div>
  );
}