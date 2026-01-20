import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { rateLimiter } from './RateLimiter';
import { anomalyDetector } from './AnomalyDetector';
import { sessionManager } from './SessionManager';
import { threatMonitor } from './ThreatMonitor';
import InputSanitizer from './InputSanitizer';
import { SecurityAuditLogger } from './SecurityAuditLogger';
import { toast } from 'sonner';

// Zero-trust validation for all operations
export class ZeroTrustValidator {
  static async validateOperation(operation) {
    const validations = [];
    
    // 1. Verify user authentication
    try {
      const user = await base44.auth.me();
      if (!user) {
        validations.push({ passed: false, check: 'authentication', reason: 'No authenticated user' });
        return { valid: false, validations };
      }
      validations.push({ passed: true, check: 'authentication' });
    } catch (err) {
      validations.push({ passed: false, check: 'authentication', reason: err.message });
      return { valid: false, validations };
    }
    
    // 2. Check session validity
    const sessionValid = await sessionManager.verifySession();
    if (!sessionValid) {
      validations.push({ passed: false, check: 'session', reason: 'Invalid session' });
      return { valid: false, validations };
    }
    validations.push({ passed: true, check: 'session' });
    
    // 3. Rate limiting check
    const rateCheck = await rateLimiter.checkLimit(
      operation.identifier || 'global',
      operation.maxRequests || 100,
      operation.windowMs || 60000
    );
    
    if (!rateCheck.allowed) {
      validations.push({ passed: false, check: 'rate_limit', reason: 'Rate limit exceeded' });
      return { valid: false, validations };
    }
    validations.push({ passed: true, check: 'rate_limit' });
    
    // 4. Input validation
    if (operation.data) {
      try {
        Object.entries(operation.data).forEach(([key, value]) => {
          if (typeof value === 'string') {
            InputSanitizer.validate(value);
          }
        });
        validations.push({ passed: true, check: 'input_validation' });
      } catch (err) {
        validations.push({ passed: false, check: 'input_validation', reason: err.message });
        return { valid: false, validations };
      }
    }
    
    // 5. Behavioral analysis
    const isHuman = anomalyDetector.isHumanLikeBehavior();
    if (!isHuman) {
      validations.push({ passed: false, check: 'behavior', reason: 'Bot-like behavior detected' });
      await SecurityAuditLogger.logViolation('BOT_BEHAVIOR', { operation });
      // Don't block entirely, but flag for review
    } else {
      validations.push({ passed: true, check: 'behavior' });
    }
    
    // 6. Check for session hijacking
    const hijacked = await sessionManager.detectHijacking();
    if (hijacked) {
      validations.push({ passed: false, check: 'session_integrity', reason: 'Possible hijacking' });
      return { valid: false, validations };
    }
    validations.push({ passed: true, check: 'session_integrity' });
    
    // 7. Permission verification
    if (operation.requiredRole) {
      const user = await base44.auth.me();
      if (user.role !== operation.requiredRole && user.role !== 'admin') {
        validations.push({ passed: false, check: 'authorization', reason: 'Insufficient permissions' });
        await SecurityAuditLogger.logViolation('UNAUTHORIZED_ACCESS', { operation, user_role: user.role });
        return { valid: false, validations };
      }
      validations.push({ passed: true, check: 'authorization' });
    }
    
    // All checks passed
    return { valid: true, validations };
  }

  // Validate financial operations
  static async validateFinancialOperation(operation) {
    const baseValidation = await this.validateOperation({
      ...operation,
      identifier: `financial_${operation.userId}`,
      maxRequests: 20, // Stricter rate limit
      windowMs: 60000
    });
    
    if (!baseValidation.valid) return baseValidation;
    
    // Additional financial checks
    const financialChecks = [];
    
    // Amount validation
    if (operation.amount) {
      if (operation.amount <= 0 || operation.amount > 100000) {
        financialChecks.push({ passed: false, check: 'amount_range', reason: 'Amount out of acceptable range' });
      } else {
        financialChecks.push({ passed: true, check: 'amount_range' });
      }
    }
    
    // Velocity check - prevent rapid successive transactions
    const key = `txn_velocity_${operation.userId}`;
    const rateCheck = await rateLimiter.checkLimit(key, 5, 60000); // Max 5 txns per minute
    
    if (!rateCheck.allowed) {
      financialChecks.push({ passed: false, check: 'transaction_velocity', reason: 'Too many transactions' });
      await SecurityAuditLogger.logViolation('SUSPICIOUS_TRANSACTION_VELOCITY', { operation });
    } else {
      financialChecks.push({ passed: true, check: 'transaction_velocity' });
    }
    
    const allChecks = [...baseValidation.validations, ...financialChecks];
    const allPassed = allChecks.every(c => c.passed);
    
    return { valid: allPassed, validations: allChecks };
  }

  // Validate data modification
  static async validateDataModification(entityName, operation, data) {
    const validation = await this.validateOperation({
      identifier: `entity_${entityName}`,
      maxRequests: 200,
      windowMs: 60000,
      data
    });
    
    // Log data access
    await SecurityAuditLogger.logDataAccess(entityName, operation);
    
    return validation;
  }
}

// React component for zero-trust enforcement
export function ZeroTrustGuard({ children, level = 'standard' }) {
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validate = async () => {
      try {
        const result = await ZeroTrustValidator.validateOperation({
          identifier: 'page_access',
          maxRequests: level === 'strict' ? 50 : 200,
          windowMs: 60000
        });
        
        if (!result.valid) {
          const failedChecks = result.validations.filter(v => !v.passed);
          console.error('Zero-trust validation failed:', failedChecks);
          toast.error('Security validation failed');
          
          // Redirect to login if authentication failed
          if (failedChecks.some(c => c.check === 'authentication')) {
            await base44.auth.redirectToLogin();
          }
          
          setValidated(false);
        } else {
          setValidated(true);
        }
      } catch (err) {
        console.error('Validation error:', err);
        setValidated(false);
      } finally {
        setLoading(false);
      }
    };
    
    validate();
  }, [level]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-white">Verifying security...</div>
      </div>
    );
  }

  if (!validated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️ Access Denied</div>
          <div className="text-gray-400">Security validation failed</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for validating operations
export function useZeroTrust() {
  const validateOperation = async (operation) => {
    return await ZeroTrustValidator.validateOperation(operation);
  };

  const validateFinancial = async (operation) => {
    return await ZeroTrustValidator.validateFinancialOperation(operation);
  };

  const validateDataOp = async (entityName, operation, data) => {
    return await ZeroTrustValidator.validateDataModification(entityName, operation, data);
  };

  return { validateOperation, validateFinancial, validateDataOp };
}

export default ZeroTrustValidator;