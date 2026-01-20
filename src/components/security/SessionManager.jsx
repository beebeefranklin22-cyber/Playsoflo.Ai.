import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Secure session management with automatic timeout and verification
class SessionManager {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.warningTimeout = 25 * 60 * 1000; // 25 minutes
    this.lastActivity = Date.now();
    this.sessionId = this.generateSessionId();
    this.isActive = true;
    this.listeners = new Set();
  }

  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateActivity() {
    this.lastActivity = Date.now();
    this.notifyListeners('activity');
  }

  checkSession() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    
    if (timeSinceActivity > this.sessionTimeout) {
      this.expireSession();
      return false;
    }
    
    if (timeSinceActivity > this.warningTimeout) {
      this.notifyListeners('warning');
    }
    
    return true;
  }

  async expireSession() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.notifyListeners('expired');
    
    try {
      await base44.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(listener => listener(event));
  }

  async verifySession() {
    try {
      await base44.auth.me();
      return true;
    } catch (err) {
      return false;
    }
  }

  // Detect session hijacking attempts
  async detectHijacking() {
    const currentFingerprint = this.generateFingerprint();
    const storedFingerprint = localStorage.getItem('session_fingerprint');
    
    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      await this.logSecurityEvent('SESSION_HIJACKING_ATTEMPT', {
        stored: storedFingerprint,
        current: currentFingerprint
      });
      return true;
    }
    
    localStorage.setItem('session_fingerprint', currentFingerprint);
    return false;
  }

  generateFingerprint() {
    return btoa(JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }));
  }

  async logSecurityEvent(type, metadata) {
    try {
      await base44.entities.ErrorLog.create({
        error_message: `Session Security: ${type}`,
        error_type: 'global_error',
        error_stack: JSON.stringify(metadata),
        url: window.location.href,
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }
}

export const sessionManager = new SessionManager();

// React hook for session management
export function useSessionManager() {
  const [sessionStatus, setSessionStatus] = useState('active');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Update activity on user interactions
    const updateActivity = () => sessionManager.updateActivity();
    
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    // Check session every minute
    const checkInterval = setInterval(() => {
      const isValid = sessionManager.checkSession();
      if (!isValid) {
        setSessionStatus('expired');
      }
    }, 60000);

    // Verify session on mount
    sessionManager.verifySession().then(valid => {
      if (!valid) {
        setSessionStatus('invalid');
        base44.auth.redirectToLogin();
      }
    });

    // Check for hijacking
    sessionManager.detectHijacking().then(hijacked => {
      if (hijacked) {
        toast.error('Security alert: Session anomaly detected');
        base44.auth.logout();
      }
    });

    // Subscribe to session events
    const unsubscribe = sessionManager.subscribe((event) => {
      if (event === 'expired') {
        setSessionStatus('expired');
        toast.error('Session expired due to inactivity');
        setTimeout(() => base44.auth.redirectToLogin(), 2000);
      } else if (event === 'warning') {
        setSessionStatus('warning');
        toast.warning('Session expiring soon. Please interact to continue.');
      } else if (event === 'activity') {
        setSessionStatus('active');
      }
    });

    return () => {
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(checkInterval);
      unsubscribe();
    };
  }, [navigate]);

  return { sessionStatus, timeRemaining };
}

export default SessionManager;