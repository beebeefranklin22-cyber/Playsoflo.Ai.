import { useRef, useCallback } from "react";
import { toast } from "sonner";

/**
 * Rate Limiter Hook
 * Prevents abuse by limiting action frequency
 */
export function useRateLimiter(
  maxAttempts = 5,
  windowMs = 60000, // 1 minute
  onLimitExceeded
) {
  const attempts = useRef([]);

  const checkLimit = useCallback(() => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old attempts outside the time window
    attempts.current = attempts.current.filter(time => time > windowStart);

    // Check if limit exceeded
    if (attempts.current.length >= maxAttempts) {
      const oldestAttempt = attempts.current[0];
      const timeUntilReset = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      
      if (onLimitExceeded) {
        onLimitExceeded(timeUntilReset);
      } else {
        toast.error(`Too many attempts. Please wait ${timeUntilReset} seconds.`);
      }
      
      return false;
    }

    // Record this attempt
    attempts.current.push(now);
    return true;
  }, [maxAttempts, windowMs, onLimitExceeded]);

  const reset = useCallback(() => {
    attempts.current = [];
  }, []);

  return { checkLimit, reset, attemptCount: attempts.current.length };
}

/**
 * Usage:
 * 
 * const { checkLimit } = useRateLimiter(3, 60000);
 * 
 * const handleAction = () => {
 *   if (!checkLimit()) return;
 *   // Perform action
 * };
 */