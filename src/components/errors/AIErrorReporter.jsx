import { useEffect } from "react";
import { aiErrorMonitor } from "@/functions/aiErrorMonitor";
import { getLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

/**
 * Drop-in replacement for GlobalErrorHandler.
 * Routes all unhandled errors through the AI monitor backend.
 * Shows i18n-aware user messages with auto-resolve hints.
 */
export default function AIErrorReporter({ children }) {
  useEffect(() => {
    const report = async (errorData) => {
      try {
        const res = await aiErrorMonitor({
          error_message: errorData.message,
          error_stack: errorData.stack,
          error_type: errorData.type,
          url: window.location.href,
          user_agent: navigator.userAgent,
          component_stack: errorData.componentStack,
          locale: getLocale(),
        });

        const data = res?.data;

        // Show user-facing message based on AI category
        const msgKey = `error.${data?.analysis?.category}`;
        const userMsg = t(msgKey, t('error.generic'));

        const hint = data?.analysis?.auto_resolve_hint;
        const showRetry = hint === 'retry';

        toast.error(userMsg, {
          duration: 6000,
          action: showRetry ? {
            label: t('action.submit', 'Retry'),
            onClick: () => window.location.reload(),
          } : undefined,
        });

        // Log AI severity to console for devs
        if (data?.analysis?.severity) {
          console.warn(`[AI Error Monitor] ${data.analysis.severity.toUpperCase()} | ${data.analysis.category} | ${data.analysis.root_cause}`);
        }
      } catch (reportErr) {
        // Fallback silent fail — never crash the crash handler
        console.error('[AIErrorReporter] Failed to report:', reportErr);
        toast.error(t('error.generic'));
      }
    };

    const handleRejection = (event) => {
      event.preventDefault();
      report({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
        type: 'promise_rejection',
      });
    };

    const handleError = (event) => {
      event.preventDefault();
      report({
        message: event.error?.message || event.message,
        stack: event.error?.stack || '',
        type: 'global_error',
        componentStack: `Line: ${event.lineno}, Col: ${event.colno}`,
      });
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return children;
}