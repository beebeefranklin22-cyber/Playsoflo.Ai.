import { Signal, Wifi, WifiOff, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StreamQualityIndicator({ quality, networkQuality, connectionState, compact = false }) {
  const getQualityColor = () => {
    if (connectionState !== 'CONNECTED') return 'text-red-500';
    if (networkQuality <= 2) return 'text-red-500';
    if (networkQuality <= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getQualityIcon = () => {
    if (connectionState === 'RECONNECTING') {
      return <WifiOff className="w-4 h-4 text-yellow-500 animate-pulse" />;
    }
    if (connectionState === 'DISCONNECTED') {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    if (networkQuality <= 2) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    if (networkQuality <= 4) {
      return <Signal className="w-4 h-4 text-yellow-500" />;
    }
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  };

  const getQualityText = () => {
    if (connectionState === 'RECONNECTING') return 'Reconnecting...';
    if (connectionState === 'DISCONNECTED') return 'Disconnected';
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2"
      >
        {getQualityIcon()}
        <span className={`text-xs font-medium ${getQualityColor()}`}>
          {getQualityText()}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 glass-effect rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-2">
        {getQualityIcon()}
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${getQualityColor()}`}>
            {getQualityText()}
          </span>
          <span className="text-xs text-gray-400">Stream Quality</span>
        </div>
      </div>
      
      {/* Signal bars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-1 rounded-full transition-all ${
              bar <= networkQuality
                ? getQualityColor().replace('text-', 'bg-')
                : 'bg-gray-700'
            }`}
            style={{ height: `${bar * 3}px` }}
          />
        ))}
      </div>
    </motion.div>
  );
}