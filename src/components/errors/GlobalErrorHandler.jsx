import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Global Error Handler
 * Catches unhandled errors and provides user-friendly messages
 */
export default function GlobalErrorHandler({ children }) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = async (event) => {
      event.preventDefault();
      
      const error = event.reason;
      console.error('[GlobalErrorHandler] Unhandled rejection:', error);

      // Log to backend
      try {
        await base44.entities.ErrorLog.create({
          error_message: error?.message || String(error),
          error_stack: error?.stack || '',
          error_type: 'promise_rejection',
          url: window.location.href,
          user_agent: navigator.userAgent
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      // Show user-friendly message
      const userMessage = getUserFriendlyMessage(error);
      toast.error(userMessage, {
        duration: 5000,
        action: {
          label: 'Report',
          onClick: () => reportError(error)
        }
      });
    };

    // Handle global errors
    const handleGlobalError = async (event) => {
      event.preventDefault();
      
      const error = event.error;
      console.error('[GlobalErrorHandler] Global error:', error);

      // Log to backend
      try {
        await base44.entities.ErrorLog.create({
          error_message: error?.message || event.message,
          error_stack: error?.stack || '',
          error_type: 'global_error',
          url: window.location.href,
          user_agent: navigator.userAgent,
          component_stack: `Line: ${event.lineno}, Column: ${event.colno}`
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      // Show user-friendly message
      const userMessage = getUserFriendlyMessage(error || event);
      toast.error(userMessage, {
        duration: 5000
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return children;
}

// Convert technical errors to user-friendly messages
function getUserFriendlyMessage(error) {
  const message = error?.message || String(error);

  // Network errors
  if (message.includes('fetch') || message.includes('network')) {
    return 'Connection issue. Please check your internet and try again.';
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized')) {
    return 'Session expired. Please log in again.';
  }

  // Payment errors
  if (message.includes('payment') || message.includes('stripe')) {
    return 'Payment processing failed. Please try again or use a different payment method.';
  }

  // Permission errors
  if (message.includes('permission') || message.includes('forbidden')) {
    return "You don't have permission to perform this action.";
  }

  // Timeout errors
  if (message.includes('timeout')) {
    return 'Request took too long. Please try again.';
  }

  // Validation errors
  if (message.includes('invalid') || message.includes('validation')) {
    return 'Please check your input and try again.';
  }

  // Default message
  return 'Something went wrong. Our team has been notified.';
}

// Report error to support
async function reportError(error) {
  try {
    await base44.entities.SupportTicket.create({
      subject: 'Error Report',
      description: `Automatic error report:\n\n${error?.message || String(error)}\n\nStack: ${error?.stack || 'N/A'}`,
      priority: 'medium',
      status: 'open'
    });
    toast.success('Error reported. Our team will investigate.');
  } catch (err) {
    console.error('Failed to report error:', err);
    toast.error('Failed to submit error report.');
  }
}