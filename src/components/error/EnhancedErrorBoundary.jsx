import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null,
      isLogging: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo, isLogging: true });

    // Log to database
    try {
      const user = await base44.auth.me().catch(() => null);
      
      const errorLog = await base44.entities.ErrorLog.create({
        error_message: error.message || 'Unknown error',
        error_stack: error.stack || '',
        error_type: 'component_error',
        user_email: user?.email || 'anonymous',
        url: window.location.href,
        user_agent: navigator.userAgent,
        component_stack: errorInfo.componentStack || '',
        resolved: false
      });

      this.setState({ errorId: errorLog.id, isLogging: false });

      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('Error caught by boundary:', error, errorInfo);
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
      this.setState({ isLogging: false });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReport = () => {
    const subject = encodeURIComponent(`Error Report: ${this.state.error?.message || 'Unknown'}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId || 'N/A'}
URL: ${window.location.href}
Time: ${new Date().toISOString()}

Description: [Please describe what you were doing when the error occurred]

Error Details:
${this.state.error?.stack || 'No stack trace available'}
    `);
    
    window.open(`mailto:support@yourapp.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl"
          >
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30"
              >
                <AlertTriangle className="w-10 h-10 text-white" />
              </motion.div>
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold text-white text-center mb-3">
              Oops! Something went wrong
            </h1>
            
            {/* User-Friendly Message */}
            <p className="text-gray-300 text-center mb-6">
              We're sorry for the inconvenience. The issue has been automatically reported to our team.
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <p className="text-gray-400 text-sm text-center">
                  Error ID: <span className="text-purple-400 font-mono">{this.state.errorId}</span>
                </p>
              </div>
            )}

            {/* Error Details (Development) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="bg-black/30 rounded-xl p-4 mb-6">
                <summary className="text-yellow-400 text-sm font-semibold cursor-pointer mb-2">
                  Technical Details (Development Only)
                </summary>
                <div className="space-y-2">
                  <p className="text-red-400 text-xs font-mono break-all">
                    {this.state.error.message}
                  </p>
                  <pre className="text-gray-400 text-xs overflow-auto max-h-40 p-2 bg-black/50 rounded">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={this.handleReload}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full border-white/20 hover:bg-white/10"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>

              <Button
                onClick={this.handleReport}
                variant="outline"
                className="w-full border-white/20 hover:bg-white/10"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            </div>

            {/* Loading State */}
            {this.state.isLogging && (
              <div className="mt-6 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
                <p className="text-gray-400 text-sm mt-2">Logging error details...</p>
              </div>
            )}

            {/* Help Text */}
            <p className="text-gray-500 text-xs text-center mt-6">
              If the problem persists, please contact our support team with the error ID above.
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;