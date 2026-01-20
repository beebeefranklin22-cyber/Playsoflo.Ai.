import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Behavioral anomaly detection
class AnomalyDetector {
  constructor() {
    this.userBehavior = {
      actionsPerMinute: [],
      typingSpeed: [],
      mouseMovements: [],
      lastActions: [],
      sessionStart: Date.now()
    };
    this.thresholds = {
      maxActionsPerMinute: 120,
      minTypingDelay: 10, // ms - bot detection
      maxFailedAuth: 5,
      suspiciousPatternThreshold: 0.8
    };
  }

  // Track user action
  trackAction(actionType, metadata = {}) {
    const now = Date.now();
    
    this.userBehavior.lastActions.push({
      type: actionType,
      timestamp: now,
      metadata
    });
    
    // Keep only last 100 actions
    if (this.userBehavior.lastActions.length > 100) {
      this.userBehavior.lastActions.shift();
    }
    
    // Check for anomalies
    this.detectAnomalies();
  }

  // Detect unusual patterns
  detectAnomalies() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count actions in last minute
    const recentActions = this.userBehavior.lastActions.filter(
      a => a.timestamp > oneMinuteAgo
    );
    
    // Check for excessive actions
    if (recentActions.length > this.thresholds.maxActionsPerMinute) {
      this.reportAnomaly('EXCESSIVE_ACTIONS', {
        count: recentActions.length,
        threshold: this.thresholds.maxActionsPerMinute
      });
      return true;
    }
    
    // Check for bot-like behavior (very fast repeated actions)
    const typingActions = recentActions.filter(a => a.type === 'keypress');
    if (typingActions.length > 10) {
      const avgDelay = this.calculateAverageDelay(typingActions);
      if (avgDelay < this.thresholds.minTypingDelay) {
        this.reportAnomaly('BOT_BEHAVIOR_DETECTED', {
          avgTypingDelay: avgDelay,
          threshold: this.thresholds.minTypingDelay
        });
        return true;
      }
    }
    
    // Check for rapid identical actions (automation)
    const actionTypes = recentActions.map(a => a.type);
    const repeatedAction = this.findRepeatedPattern(actionTypes);
    if (repeatedAction && repeatedAction.count > 10) {
      this.reportAnomaly('AUTOMATED_BEHAVIOR', {
        action: repeatedAction.type,
        count: repeatedAction.count
      });
      return true;
    }
    
    return false;
  }

  calculateAverageDelay(actions) {
    if (actions.length < 2) return Infinity;
    
    let totalDelay = 0;
    for (let i = 1; i < actions.length; i++) {
      totalDelay += actions[i].timestamp - actions[i - 1].timestamp;
    }
    
    return totalDelay / (actions.length - 1);
  }

  findRepeatedPattern(actions) {
    const counts = {};
    actions.forEach(action => {
      counts[action] = (counts[action] || 0) + 1;
    });
    
    let max = { type: null, count: 0 };
    for (const [type, count] of Object.entries(counts)) {
      if (count > max.count) {
        max = { type, count };
      }
    }
    
    return max.count > 1 ? max : null;
  }

  async reportAnomaly(type, metadata) {
    console.warn(`Security anomaly detected: ${type}`, metadata);
    
    try {
      await base44.entities.ErrorLog.create({
        error_message: `Security Anomaly: ${type}`,
        error_type: 'global_error',
        error_stack: JSON.stringify(metadata),
        url: window.location.href,
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error('Failed to log anomaly:', err);
    }
  }

  // Track mouse movement for human verification
  trackMouseMovement(x, y) {
    this.userBehavior.mouseMovements.push({ x, y, t: Date.now() });
    if (this.userBehavior.mouseMovements.length > 50) {
      this.userBehavior.mouseMovements.shift();
    }
  }

  // Verify human-like behavior
  isHumanLikeBehavior() {
    // Check for mouse movement variance
    if (this.userBehavior.mouseMovements.length < 10) return true;
    
    const movements = this.userBehavior.mouseMovements;
    const variance = this.calculateVariance(movements.map(m => m.x));
    
    // Bots tend to have very low variance in movements
    return variance > 100;
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

export const anomalyDetector = new AnomalyDetector();

// React hook for tracking user behavior
export function useAnomalyDetection() {
  const mouseTrackerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      anomalyDetector.trackMouseMovement(e.clientX, e.clientY);
    };

    const handleKeyPress = () => {
      anomalyDetector.trackAction('keypress');
    };

    const handleClick = (e) => {
      anomalyDetector.trackAction('click', {
        target: e.target.tagName,
        x: e.clientX,
        y: e.clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return {
    trackAction: (type, metadata) => anomalyDetector.trackAction(type, metadata),
    isHuman: () => anomalyDetector.isHumanLikeBehavior()
  };
}

export default AnomalyDetector;