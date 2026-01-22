import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Enhanced Error Boundary with Backend Logging
 */
class ErrorBoundaryWithLogging extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    this.setState({ errorInfo });

    // Log to backend
    try {
      const errorLog = await base44.entities.ErrorLog.create({
        error_message: error.message,
        error_stack: error.stack,
        error_type: 'component_error',
        url: window.location.href,
        user_agent: navigator.userAgent,
        component_stack: errorInfo.componentStack
      });

      this.setState({ errorId: errorLog.id });
    } catch (logError) {
      console.error('Failed to log error to backend:', logError);
    }

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('component_error', {
        error: error.message,
        stack: error.stack,
        component: errorInfo.componentStack
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = createPageUrl('Home');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-gray-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-400 mb-6">
              We've been notified and are working on a fix. Try refreshing the page or going home.
            </p>

            {this.state.errorId && (
              <p className="text-xs text-gray-500 mb-6">
                Error ID: {this.state.errorId}
              </p>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="text-left mb-6 bg-black/30 rounded-lg p-4">
                <summary className="text-red-400 cursor-pointer mb-2">
                  Error Details (Dev Only)
                </summary>
                <div className="text-xs text-gray-400 space-y-2">
                  <div>
                    <strong>Message:</strong> {this.state.error?.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 overflow-auto max-h-40 text-[10px]">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 border-white/20 hover:bg-white/10"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWithLogging;