import { useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export function useSecureMutation(options) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const errorLoggedRef = useRef(false);
  const lastErrorTime = useRef(0);

  // Rate limiting - prevent spam
  const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime.current;
    
    if (timeSinceLastError < 1000) {
      toast.warning('Please wait a moment before trying again');
      return false;
    }
    
    return true;
  };

  const mutation = useMutation({
    ...options,
    mutationFn: async (variables) => {
      if (!checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      setIsProcessing(true);
      setAttemptCount(prev => prev + 1);

      try {
        // Input validation
        if (options.validateInput) {
          const validation = options.validateInput(variables);
          if (!validation.valid) {
            throw new Error(validation.error || 'Invalid input');
          }
        }

        const result = await options.mutationFn(variables);
        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    onError: async (error, variables, context) => {
      lastErrorTime.current = Date.now();

      // Log critical errors to database
      if (!errorLoggedRef.current && attemptCount <= 1) {
        errorLoggedRef.current = true;
        try {
          const user = await base44.auth.me().catch(() => null);
          await base44.entities.ErrorLog.create({
            error_message: error?.message || 'Mutation failed',
            error_stack: error?.stack || '',
            error_type: 'global_error',
            user_email: user?.email || 'anonymous',
            url: window.location.href,
            user_agent: navigator.userAgent,
            component_stack: JSON.stringify({
              mutationKey: options.mutationKey,
              variables: typeof variables === 'object' ? JSON.stringify(variables).substring(0, 500) : String(variables)
            })
          });
        } catch (logError) {
          console.warn('Failed to log mutation error:', logError);
        }
      }

      // User-friendly error messages
      const errorMessage = options.getErrorMessage?.(error) || 
                          error?.message || 
                          'Something went wrong. Please try again.';
      
      toast.error(errorMessage, {
        action: attemptCount < 3 ? {
          label: 'Retry',
          onClick: () => mutation.mutate(variables)
        } : undefined
      });

      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      setAttemptCount(0);
      errorLoggedRef.current = false;
      
      // Success feedback
      const successMessage = options.getSuccessMessage?.(data) || 
                            options.successMessage ||
                            'Success!';
      
      if (successMessage) {
        toast.success(successMessage);
      }

      options.onSuccess?.(data, variables, context);
    }
  });

  return {
    ...mutation,
    isProcessing,
    attemptCount
  };
}

// Validation helpers
export const validators = {
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      valid: regex.test(email),
      error: 'Invalid email address'
    };
  },
  
  url: (url) => {
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL' };
    }
  },
  
  minLength: (value, min) => ({
    valid: String(value).length >= min,
    error: `Minimum ${min} characters required`
  }),
  
  maxLength: (value, max) => ({
    valid: String(value).length <= max,
    error: `Maximum ${max} characters allowed`
  }),
  
  required: (value) => ({
    valid: value !== null && value !== undefined && value !== '',
    error: 'This field is required'
  }),
  
  number: (value, min, max) => {
    const num = Number(value);
    if (isNaN(num)) return { valid: false, error: 'Must be a number' };
    if (min !== undefined && num < min) return { valid: false, error: `Must be at least ${min}` };
    if (max !== undefined && num > max) return { valid: false, error: `Must be at most ${max}` };
    return { valid: true };
  },
  
  currency: (value) => {
    const regex = /^\d+(\.\d{1,2})?$/;
    return {
      valid: regex.test(String(value)),
      error: 'Invalid currency format'
    };
  }
};