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
    
    // Send to backend for analysis (silent)
    this.reportErrorToBackend(error, errorInfo);
    
    // Try to recover automatically for non-critical errors
    const isCritical = errorMsg.includes('ChunkLoadError') || 
                       errorMsg.includes('Failed to fetch') ||
                       errorMsg.includes('Network');
    
    if (!isCritical) {
      // Auto-recover after 1 second
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 1000);
    }
  }

  reportErrorToBackend = async (error, errorInfo) => {
    try {
      // Silent background error reporting
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error?.message || error?.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Fail silently
        console.log('Background error logging skipped');
      });
    } catch (e) {
      // Silent fail
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
      // Show minimal loading instead of error
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}