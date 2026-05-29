import { useEffect } from "react";

// Exposes a global helper to open the order tracker from non-React code (e.g. sidebar).
// Rendered as a proper component so it never returns a function into JSX.
export default function OrderTrackerBridge({ onOpen }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__openOrderTracker = (orderId, orderType) => onOpen(orderId, orderType);
    return () => {
      delete window.__openOrderTracker;
    };
  }, [onOpen]);

  return null;
}