import React, { Component } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

export class EnhancedErrorBoundary extends Component {
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
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to backend
    try {
      const errorLog = await base44.entities.ErrorLog.create({
        error_message: error.message || 'Unknown error',
        error_stack: error.stack || '',
        error_type: 'component_error',
        component_stack: errorInfo.componentStack,
        url: window.location.href,
        user_agent: navigator.userAgent,
        resolved: false
      });

      this.setState({ errorId: errorLog.id });

      // Show user-friendly notification
      toast.error('Something went wrong', {
        description: 'We\'ve logged the issue and will fix it soon.',
        action: {
          label: 'Reload',
          onClick: () => window.location.reload()
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-gray-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-red-500/30 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-400 mb-6">
                We've logged this error and will fix it as soon as possible.
              </p>

              {this.state.errorId && (
                <p className="text-xs text-gray-500 mb-6 font-mono">
                  Error ID: {this.state.errorId.slice(0, 8)}
                </p>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full border-white/20 hover:bg-white/5"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
                    <Bug className="w-4 h-4 inline mr-2" />
                    Developer Info
                  </summary>
                  <pre className="mt-2 text-xs text-red-400 bg-black/50 p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced error logging utility
export class ErrorLogger {
  static async logError(error, context = {}) {
    try {
      await base44.entities.ErrorLog.create({
        error_message: error.message || 'Unknown error',
        error_stack: error.stack || '',
        error_type: context.type || 'unknown',
        url: window.location.href,
        user_agent: navigator.userAgent,
        component_stack: context.component || '',
        resolved: false
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  static async logCritical(message, details = {}) {
    await this.logError(new Error(message), { 
      type: 'global_error',
      ...details 
    });
    
    toast.error('Critical Error', {
      description: message,
      duration: 10000
    });
  }

  static async logWarning(message, details = {}) {
    console.warn(message, details);
    // Could send to analytics or monitoring service
  }
}

// Error recovery suggestions
export function getErrorRecovery(error) {
  const message = error?.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch')) {
    return {
      title: 'Connection Issue',
      message: 'Please check your internet connection and try again.',
      actions: [
        { label: 'Retry', action: () => window.location.reload() }
      ]
    };
  }

  if (message.includes('unauthorized') || message.includes('403')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to access this resource.',
      actions: [
        { label: 'Go Home', action: () => window.location.href = '/' }
      ]
    };
  }

  if (message.includes('not found') || message.includes('404')) {
    return {
      title: 'Not Found',
      message: 'The content you\'re looking for doesn\'t exist.',
      actions: [
        { label: 'Go Back', action: () => window.history.back() },
        { label: 'Go Home', action: () => window.location.href = '/' }
      ]
    };
  }

  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    actions: [
      { label: 'Reload', action: () => window.location.reload() }
    ]
  };
}

export default EnhancedErrorBoundary;