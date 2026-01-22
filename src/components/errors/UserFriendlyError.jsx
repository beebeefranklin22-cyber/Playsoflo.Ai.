import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, WifiOff, Lock, AlertTriangle } from "lucide-react";

/**
 * User-Friendly Error Display
 * Shows contextual error messages with actions
 */
export default function UserFriendlyError({ 
  type = "generic",
  title,
  message,
  action,
  onRetry,
  className = ""
}) {
  const errorConfigs = {
    network: {
      icon: WifiOff,
      title: "Connection Lost",
      message: "Check your internet connection and try again.",
      color: "text-blue-400",
      bg: "from-blue-500/20 to-cyan-500/20"
    },
    auth: {
      icon: Lock,
      title: "Authentication Required",
      message: "Please log in to continue.",
      color: "text-yellow-400",
      bg: "from-yellow-500/20 to-orange-500/20"
    },
    permission: {
      icon: Lock,
      title: "Access Denied",
      message: "You don't have permission for this action.",
      color: "text-red-400",
      bg: "from-red-500/20 to-pink-500/20"
    },
    payment: {
      icon: AlertTriangle,
      title: "Payment Failed",
      message: "There was an issue processing your payment.",
      color: "text-orange-400",
      bg: "from-orange-500/20 to-red-500/20"
    },
    generic: {
      icon: AlertCircle,
      title: "Something Went Wrong",
      message: "An unexpected error occurred. Please try again.",
      color: "text-gray-400",
      bg: "from-gray-500/20 to-gray-700/20"
    }
  };

  const config = errorConfigs[type] || errorConfigs.generic;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br ${config.bg} backdrop-blur-xl rounded-2xl border border-white/10 p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg mb-1">
            {title || config.title}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {message || config.message}
          </p>

          <div className="flex gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-white/10 hover:bg-white/20 border border-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {action && (
              <Button
                onClick={action.onClick}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {action.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}