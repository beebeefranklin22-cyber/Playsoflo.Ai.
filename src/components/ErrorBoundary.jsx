import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error';
    console.error('ErrorBoundary caught:', errorMsg, errorInfo);
    
    // Prevent infinite refresh loops
    try {
      const refreshCount = sessionStorage.getItem('error_refresh_count') || 0;
      if (parseInt(refreshCount) > 2) {
        console.error('Too many refreshes - stopping auto-refresh to prevent loop');
        sessionStorage.removeItem('error_refresh_count');
        return;
      }
    } catch (e) {
      // Storage access denied - continue without loop detection
      console.warn('Storage access denied in error boundary');
    }
    
    // Report to diagnostics system (non-blocking)
    if (typeof window !== 'undefined' && window.reportError) {
      try {
        window.reportError({
          error: errorMsg,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      } catch (e) {
        console.error('Error reporting failed:', e);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Don't reload immediately - give state a chance to reset
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-gray-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 border border-red-500/30">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-400 text-center mb-6">
              Don't worry, our AI is analyzing this issue. Try refreshing the page.
            </p>

            <div className="space-y-3">
              <Button 
                onClick={this.handleReset}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => {
                  try {
                    sessionStorage.clear();
                    localStorage.clear();
                  } catch (e) {
                    console.warn('Could not clear storage:', e);
                  }
                  window.location.href = '/';
                }}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Clear Cache & Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}