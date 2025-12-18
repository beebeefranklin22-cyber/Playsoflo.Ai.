import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Report to diagnostics system
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
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

            <button 
              onClick={this.handleReset}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}