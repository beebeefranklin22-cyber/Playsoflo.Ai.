import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Client-side rate limiting with distributed tracking
class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.violations = new Map();
  }

  async checkLimit(key, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const userKey = `${key}_${Math.floor(now / windowMs)}`;
    
    const current = this.limits.get(userKey) || { count: 0, resetAt: now + windowMs };
    
    if (current.count >= maxRequests) {
      // Log violation
      const violationKey = `${key}_violations`;
      const violations = this.violations.get(violationKey) || 0;
      this.violations.set(violationKey, violations + 1);
      
      if (violations > 5) {
        // Suspicious activity - escalate
        await this.logSecurityEvent('RATE_LIMIT_EXCESSIVE_VIOLATIONS', {
          key,
          violations: violations + 1,
          threshold: maxRequests
        });
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: current.resetAt
      };
    }
    
    this.limits.set(userKey, {
      count: current.count + 1,
      resetAt: current.resetAt
    });
    
    return {
      allowed: true,
      remaining: maxRequests - (current.count + 1),
      resetAt: current.resetAt
    };
  }

  async logSecurityEvent(eventType, metadata) {
    try {
      await base44.entities.ErrorLog.create({
        error_message: `Security Event: ${eventType}`,
        error_type: 'global_error',
        error_stack: JSON.stringify(metadata),
        url: window.location.href,
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (value.resetAt < now) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup old entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

export function useRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const [isLimited, setIsLimited] = useState(false);
  
  const checkAndExecute = async (fn) => {
    const result = await rateLimiter.checkLimit(identifier, maxRequests, windowMs);
    
    if (!result.allowed) {
      setIsLimited(true);
      toast.error(`Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)}s`);
      return null;
    }
    
    setIsLimited(false);
    return fn();
  };

  return { checkAndExecute, isLimited };
}

export default RateLimiter;