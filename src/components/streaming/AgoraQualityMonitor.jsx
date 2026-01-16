import { useEffect, useState, useRef } from 'react';
import { Signal, WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AgoraQualityMonitor({ client, isStreaming, onQualityChange }) {
  const [quality, setQuality] = useState('high');
  const [stats, setStats] = useState({
    bitrate: 0,
    frameRate: 0,
    resolution: '',
    packetLoss: 0,
    rtt: 0,
    connectionState: 'connected'
  });
  const [networkQuality, setNetworkQuality] = useState(6);
  const statsIntervalRef = useRef(null);
  const qualityHistoryRef = useRef([]);

  useEffect(() => {
    if (!client || !isStreaming) return;

    // Monitor network quality
    client.on('network-quality', (qualityData) => {
      setNetworkQuality(qualityData.uplinkNetworkQuality);
      analyzeAndAdaptQuality(qualityData);
    });

    // Monitor connection state
    client.on('connection-state-change', (curState, prevState, reason) => {
      setStats(prev => ({ ...prev, connectionState: curState }));
      
      if (curState === 'DISCONNECTED' || curState === 'RECONNECTING') {
        handleConnectionIssue(curState, reason);
      }
    });

    // Get detailed stats every 2 seconds
    statsIntervalRef.current = setInterval(async () => {
      try {
        const localTracks = client.localTracks || [];
        const videoTrack = localTracks.find(t => t.trackMediaType === 'video');
        const audioTrack = localTracks.find(t => t.trackMediaType === 'audio');

        if (videoTrack) {
          const videoStats = videoTrack.getStats();
          const remoteStats = client.getRemoteVideoStats();
          
          setStats(prev => ({
            ...prev,
            bitrate: Math.round((videoStats.sendBitrate || 0) / 1000),
            frameRate: videoStats.sendFrameRate || 0,
            resolution: `${videoStats.sendResolutionWidth}x${videoStats.sendResolutionHeight}`,
            packetLoss: Object.values(remoteStats).reduce((acc, stat) => 
              acc + (stat.packageLossRate || 0), 0) / Math.max(Object.keys(remoteStats).length, 1)
          }));
        }

        // Get RTT (Round Trip Time)
        const transportStats = await client.getRTCStats();
        if (transportStats) {
          setStats(prev => ({
            ...prev,
            rtt: transportStats.RTT || 0
          }));
        }

      } catch (error) {
        console.error('Stats collection error:', error);
      }
    }, 2000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [client, isStreaming]);

  const analyzeAndAdaptQuality = (qualityData) => {
    const uplinkQuality = qualityData.uplinkNetworkQuality;
    qualityHistoryRef.current.push(uplinkQuality);
    
    // Keep last 10 measurements
    if (qualityHistoryRef.current.length > 10) {
      qualityHistoryRef.current.shift();
    }

    // Calculate average quality
    const avgQuality = qualityHistoryRef.current.reduce((a, b) => a + b, 0) / qualityHistoryRef.current.length;

    let newQuality = quality;

    // Adaptive quality logic
    if (avgQuality <= 2) {
      newQuality = 'low';
    } else if (avgQuality <= 4) {
      newQuality = 'medium';
    } else {
      newQuality = 'high';
    }

    if (newQuality !== quality) {
      setQuality(newQuality);
      onQualityChange?.(newQuality);
      console.log(`Stream quality adjusted to: ${newQuality}`);
    }
  };

  const handleConnectionIssue = (state, reason) => {
    console.warn('Connection issue:', state, reason);
    
    if (state === 'RECONNECTING') {
      // Temporarily reduce quality during reconnection
      setQuality('low');
      onQualityChange?.('low');
    }
  };

  const getQualityColor = () => {
    if (networkQuality <= 2) return 'text-red-500';
    if (networkQuality <= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getQualityLabel = () => {
    if (networkQuality <= 2) return 'Poor';
    if (networkQuality <= 4) return 'Fair';
    return 'Excellent';
  };

  const getSignalBars = () => {
    if (networkQuality <= 2) return 1;
    if (networkQuality <= 4) return 2;
    return 3;
  };

  if (!isStreaming) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-24 right-6 z-40 glass-effect rounded-xl p-4 min-w-[200px]"
      >
        {/* Connection Status */}
        <div className="flex items-center gap-3 mb-3">
          {stats.connectionState === 'CONNECTED' ? (
            <Wifi className={`w-5 h-5 ${getQualityColor()}`} />
          ) : stats.connectionState === 'RECONNECTING' ? (
            <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <div>
            <p className="text-white text-sm font-medium">
              {stats.connectionState === 'CONNECTED' ? getQualityLabel() : stats.connectionState}
            </p>
            <p className="text-gray-400 text-xs">Connection</p>
          </div>
        </div>

        {/* Signal Strength */}
        <div className="flex items-center gap-2 mb-3">
          <Signal className={`w-4 h-4 ${getQualityColor()}`} />
          <div className="flex gap-1">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={`w-1 rounded-full transition-all ${
                  bar <= getSignalBars()
                    ? getQualityColor().replace('text-', 'bg-')
                    : 'bg-gray-600'
                }`}
                style={{ height: `${bar * 6}px` }}
              />
            ))}
          </div>
          <span className="text-white text-xs ml-auto">{quality}</span>
        </div>

        {/* Detailed Stats */}
        <div className="space-y-1 text-xs border-t border-white/10 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Bitrate:</span>
            <span className="text-white">{stats.bitrate} kbps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className="text-white">{stats.frameRate}</span>
          </div>
          {stats.resolution && (
            <div className="flex justify-between">
              <span className="text-gray-400">Resolution:</span>
              <span className="text-white">{stats.resolution}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Latency:</span>
            <span className="text-white">{stats.rtt}ms</span>
          </div>
          {stats.packetLoss > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Packet Loss:</span>
              <span className="text-red-400">{stats.packetLoss.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}