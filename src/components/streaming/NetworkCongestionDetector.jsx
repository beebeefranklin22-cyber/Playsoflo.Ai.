import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function NetworkCongestionDetector({ client, onCongestionDetected }) {
  const metricsHistoryRef = useRef([]);
  const congestionStateRef = useRef(false);
  const monitorIntervalRef = useRef(null);

  useEffect(() => {
    if (!client) return;

    monitorIntervalRef.current = setInterval(() => {
      detectCongestion();
    }, 3000);

    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
      }
    };
  }, [client]);

  const detectCongestion = async () => {
    try {
      if (!client) return;

      // Get network stats
      const stats = await client.getRTCStats();
      const localTracks = client.localTracks || [];
      const videoTrack = localTracks.find(t => t.trackMediaType === 'video');

      if (!videoTrack) return;

      const videoStats = videoTrack.getStats();

      // Collect metrics
      const metrics = {
        rtt: stats?.RTT || 0,
        packetLoss: videoStats?.sendPacketsLost || 0,
        bitrate: videoStats?.sendBitrate || 0,
        timestamp: Date.now()
      };

      metricsHistoryRef.current.push(metrics);

      // Keep only last 20 measurements (1 minute)
      if (metricsHistoryRef.current.length > 20) {
        metricsHistoryRef.current.shift();
      }

      // Need at least 5 measurements to detect congestion
      if (metricsHistoryRef.current.length < 5) return;

      const isCongested = analyzeCongestion(metricsHistoryRef.current);

      // State change detection
      if (isCongested && !congestionStateRef.current) {
        congestionStateRef.current = true;
        handleCongestionStart();
      } else if (!isCongested && congestionStateRef.current) {
        congestionStateRef.current = false;
        handleCongestionEnd();
      }

    } catch (error) {
      console.error('Congestion detection error:', error);
    }
  };

  const analyzeCongestion = (history) => {
    // Calculate averages
    const avgRTT = history.reduce((sum, m) => sum + m.rtt, 0) / history.length;
    const avgPacketLoss = history.reduce((sum, m) => sum + m.packetLoss, 0) / history.length;
    
    // Calculate trend
    const recentMetrics = history.slice(-5);
    const olderMetrics = history.slice(0, 5);
    
    const recentAvgRTT = recentMetrics.reduce((sum, m) => sum + m.rtt, 0) / recentMetrics.length;
    const olderAvgRTT = olderMetrics.reduce((sum, m) => sum + m.rtt, 0) / olderMetrics.length;
    
    const rttIncrease = ((recentAvgRTT - olderAvgRTT) / olderAvgRTT) * 100;

    // Congestion indicators:
    // 1. High RTT (> 200ms)
    // 2. High packet loss (> 5%)
    // 3. Increasing RTT trend (> 30% increase)
    const highRTT = avgRTT > 200;
    const highPacketLoss = avgPacketLoss > 5;
    const increasingRTT = rttIncrease > 30;

    return (highRTT && highPacketLoss) || (highRTT && increasingRTT);
  };

  const handleCongestionStart = () => {
    console.warn('⚠️ Network congestion detected');
    toast.warning('Poor network detected - reducing stream quality', {
      duration: 3000
    });
    onCongestionDetected?.(true);
  };

  const handleCongestionEnd = () => {
    console.log('✅ Network congestion resolved');
    toast.success('Network improved - restoring stream quality', {
      duration: 3000
    });
    onCongestionDetected?.(false);
  };

  return null;
}