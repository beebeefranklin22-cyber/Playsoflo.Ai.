import { useEffect, useRef } from 'react';

export default function TVNavigationHandler({ children }) {
  const focusableElements = useRef([]);
  const currentFocus = useRef(0);

  useEffect(() => {
    const isTVOS = /appletv|googletv|roku|smarttv/i.test(navigator.userAgent);
    if (!isTVOS) return;

    // Get all focusable elements
    const updateFocusableElements = () => {
      focusableElements.current = Array.from(
        document.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    updateFocusableElements();

    const handleKeyDown = (e) => {
      if (!focusableElements.current.length) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          currentFocus.current = Math.max(0, currentFocus.current - 1);
          focusableElements.current[currentFocus.current]?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          currentFocus.current = Math.min(
            focusableElements.current.length - 1,
            currentFocus.current + 1
          );
          focusableElements.current[currentFocus.current]?.focus();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          currentFocus.current = Math.max(0, currentFocus.current - 4);
          focusableElements.current[currentFocus.current]?.focus();
          break;
        case 'ArrowRight':
          e.preventDefault();
          currentFocus.current = Math.min(
            focusableElements.current.length - 1,
            currentFocus.current + 4
          );
          focusableElements.current[currentFocus.current]?.focus();
          break;
        case 'Enter':
          focusableElements.current[currentFocus.current]?.click();
          break;
        case 'Escape':
        case 'Back':
          e.preventDefault();
          window.history.back();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Update focusable elements on DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, []);

  return children;
}