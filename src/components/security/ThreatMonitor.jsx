import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { anomalyDetector } from './AnomalyDetector';
import InputSanitizer from './InputSanitizer';
import { toast } from 'sonner';

// Real-time threat monitoring and response
class ThreatMonitor {
  constructor() {
    this.threatLevel = 'low';
    this.threats = [];
    this.blockedIPs = new Set();
    this.suspiciousPatterns = new Map();
  }

  // Analyze incoming request
  analyzeRequest(request) {
    const threats = [];
    
    // Check for common attack patterns
    if (request.data) {
      Object.values(request.data).forEach(value => {
        if (typeof value === 'string') {
          if (InputSanitizer.detectXSS(value)) {
            threats.push({ type: 'XSS', severity: 'high', value });
          }
          if (InputSanitizer.detectSQLInjection(value)) {
            threats.push({ type: 'SQL_INJECTION', severity: 'critical', value });
          }
        }
      });
    }
    
    // Check for suspicious headers
    if (request.headers) {
      const suspiciousHeaders = ['X-Forwarded-For', 'X-Real-IP'];
      suspiciousHeaders.forEach(header => {
        if (request.headers[header]) {
          threats.push({ type: 'HEADER_INJECTION', severity: 'medium', header });
        }
      });
    }
    
    return threats;
  }

  // Calculate threat level
  calculateThreatLevel() {
    const recentThreats = this.threats.filter(
      t => Date.now() - t.timestamp < 300000 // Last 5 minutes
    );
    
    const criticalCount = recentThreats.filter(t => t.severity === 'critical').length;
    const highCount = recentThreats.filter(t => t.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (recentThreats.length > 5) return 'medium';
    return 'low';
  }

  // Log threat
  async logThreat(threat) {
    this.threats.push({
      ...threat,
      timestamp: Date.now()
    });
    
    // Keep only last 100 threats
    if (this.threats.length > 100) {
      this.threats.shift();
    }
    
    this.threatLevel = this.calculateThreatLevel();
    
    // Log to backend
    try {
      await base44.entities.ErrorLog.create({
        error_message: `Security Threat: ${threat.type}`,
        error_type: 'global_error',
        error_stack: JSON.stringify(threat),
        url: window.location.href,
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error('Failed to log threat:', err);
    }
  }

  // Automated threat response
  async respondToThreat(threat) {
    switch (threat.severity) {
      case 'critical':
        // Immediate action - logout and block
        toast.error('Critical security threat detected. Session terminated.');
        await base44.auth.logout();
        break;
      
      case 'high':
        // Log and warn user
        toast.warning('Security warning: Suspicious activity detected');
        await this.logThreat(threat);
        break;
      
      case 'medium':
        // Log for review
        await this.logThreat(threat);
        break;
      
      default:
        // Monitor only
        console.warn('Low severity threat:', threat);
    }
  }

  // Check for brute force attempts
  trackAuthAttempt(email, success) {
    const key = `auth_${email}`;
    const attempts = this.suspiciousPatterns.get(key) || [];
    
    attempts.push({ success, timestamp: Date.now() });
    
    // Keep last 10 attempts
    if (attempts.length > 10) {
      attempts.shift();
    }
    
    this.suspiciousPatterns.set(key, attempts);
    
    // Check for brute force
    const recentFailures = attempts.filter(
      a => !a.success && Date.now() - a.timestamp < 300000 // Last 5 min
    );
    
    if (recentFailures.length > 5) {
      this.logThreat({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'high',
        email,
        attempts: recentFailures.length
      });
      return true; // Blocked
    }
    
    return false;
  }
}

export const threatMonitor = new ThreatMonitor();

// React hook for threat monitoring
export function useThreatMonitor() {
  const [threatLevel, setThreatLevel] = useState('low');
  const [recentThreats, setRecentThreats] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setThreatLevel(threatMonitor.threatLevel);
      setRecentThreats([...threatMonitor.threats].slice(-10));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const reportThreat = (type, severity, metadata) => {
    threatMonitor.respondToThreat({ type, severity, ...metadata });
  };

  return { threatLevel, recentThreats, reportThreat };
}

export default ThreatMonitor;