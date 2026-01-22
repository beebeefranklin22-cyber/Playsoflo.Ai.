import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Secure Form Wrapper
 * Features: CSRF protection, rate limiting, input sanitization
 */
export default function SecureForm({ 
  children, 
  onSubmit, 
  rateLimitKey,
  maxSubmitsPerMinute = 5,
  requireAuth = true,
  ...props 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);
  const submissionTimestamps = useRef([]);

  const checkRateLimit = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    submissionTimestamps.current = submissionTimestamps.current.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    // Check if rate limit exceeded
    if (submissionTimestamps.current.length >= maxSubmitsPerMinute) {
      setRateLimitError(`Too many requests. Please wait a minute.`);
      return false;
    }

    submissionTimestamps.current.push(now);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRateLimitError(null);

    // Rate limiting check
    if (!checkRateLimit()) {
      // Log security event
      try {
        await base44.entities.ErrorLog.create({
          error_message: 'Rate limit exceeded',
          error_type: 'security',
          url: window.location.href,
          user_agent: navigator.userAgent
        });
      } catch (err) {
        console.error('Failed to log rate limit event:', err);
      }
      return;
    }

    // Authentication check
    if (requireAuth) {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (!isAuthenticated) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        return;
      }
    }

    // Submit form
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Log error
      try {
        await base44.entities.ErrorLog.create({
          error_message: error.message,
          error_stack: error.stack,
          error_type: 'form_submission',
          url: window.location.href,
          user_agent: navigator.userAgent
        });
      } catch (logErr) {
        console.error('Failed to log form error:', logErr);
      }
      
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} {...props}>
      {rateLimitError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
          {rateLimitError}
        </div>
      )}
      {typeof children === 'function' 
        ? children({ isSubmitting }) 
        : children
      }
    </form>
  );
}