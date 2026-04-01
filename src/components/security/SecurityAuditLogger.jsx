import { base44 } from '@/api/base44Client';

// Comprehensive security audit logging
export class SecurityAuditLogger {
  static async logEvent(eventType, details = {}) {
    const auditEvent = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      ...details
    };

    // Log to console in development
    if (import.meta.env.NODE_ENV === 'development') {
      console.log('[SECURITY AUDIT]', auditEvent);
    }

    try {
      // Store in ErrorLog entity for centralized monitoring
      await base44.entities.ErrorLog.create({
        error_message: `Audit: ${eventType}`,
        error_type: 'global_error',
        error_stack: JSON.stringify(auditEvent),
        url: window.location.href,
        user_agent: navigator.userAgent
      });
    } catch (err) {
      console.error('Failed to log audit event:', err);
    }
  }

  // Log authentication events
  static async logAuth(action, success, metadata = {}) {
    await this.logEvent('AUTH_EVENT', {
      action,
      success,
      ...metadata
    });
  }

  // Log data access
  static async logDataAccess(entityName, operation, recordId = null) {
    await this.logEvent('DATA_ACCESS', {
      entity: entityName,
      operation,
      record_id: recordId
    });
  }

  // Log permission changes
  static async logPermissionChange(targetUser, change) {
    await this.logEvent('PERMISSION_CHANGE', {
      target_user: targetUser,
      change
    });
  }

  // Log sensitive operations
  static async logSensitiveOperation(operation, metadata = {}) {
    await this.logEvent('SENSITIVE_OPERATION', {
      operation,
      ...metadata
    });
  }

  // Log failed operations
  static async logFailure(operation, reason, metadata = {}) {
    await this.logEvent('OPERATION_FAILURE', {
      operation,
      reason,
      ...metadata
    });
  }

  // Log security policy violations
  static async logViolation(violationType, details = {}) {
    await this.logEvent('SECURITY_VIOLATION', {
      violation_type: violationType,
      severity: details.severity || 'medium',
      ...details
    });
  }
}

// React hook for audit logging
export function useSecurityAudit() {
  const logAction = async (action, metadata = {}) => {
    try {
      const user = await base44.auth.me();
      await SecurityAuditLogger.logEvent(action, {
        user_email: user?.email,
        ...metadata
      });
    } catch (err) {
      console.error('Audit log failed:', err);
    }
  };

  return { logAction };
}

export default SecurityAuditLogger;