// Input sanitization and validation utilities
import { toast } from 'sonner';

export class InputSanitizer {
  // Sanitize HTML to prevent XSS
  static sanitizeHTML(input) {
    if (!input) return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  // Validate and sanitize email
  static sanitizeEmail(email) {
    if (!email) return '';
    
    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  // Sanitize URL
  static sanitizeURL(url) {
    if (!url) return '';
    
    try {
      const parsed = new URL(url);
      // Only allow http and https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      return parsed.href;
    } catch (err) {
      throw new Error('Invalid URL format');
    }
  }

  // Sanitize file name
  static sanitizeFileName(fileName) {
    if (!fileName) return '';
    
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 255);
  }

  // Validate numeric input
  static validateNumber(value, min = -Infinity, max = Infinity) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      throw new Error('Invalid number');
    }
    
    if (num < min || num > max) {
      throw new Error(`Number must be between ${min} and ${max}`);
    }
    
    return num;
  }

  // Check for SQL injection patterns (defense in depth)
  static detectSQLInjection(input) {
    if (!input) return false;
    
    const sqlPatterns = [
      /(\bunion\b.*\bselect\b)/i,
      /(\bselect\b.*\bfrom\b)/i,
      /(\bdrop\b.*\btable\b)/i,
      /(\binsert\b.*\binto\b)/i,
      /(\bdelete\b.*\bfrom\b)/i,
      /(\bupdate\b.*\bset\b)/i,
      /(;.*--)/,
      /('.*or.*'.*=.*')/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Check for XSS patterns
  static detectXSS(input) {
    if (!input) return false;
    
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /expression\(/i
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Comprehensive validation
  static validate(input, type = 'text') {
    if (this.detectSQLInjection(input)) {
      throw new Error('Potential SQL injection detected');
    }
    
    if (this.detectXSS(input)) {
      throw new Error('Potential XSS attack detected');
    }
    
    switch (type) {
      case 'email':
        return this.sanitizeEmail(input);
      case 'url':
        return this.sanitizeURL(input);
      case 'html':
        return this.sanitizeHTML(input);
      case 'filename':
        return this.sanitizeFileName(input);
      default:
        return input.trim();
    }
  }

  // Validate object with schema
  static validateObject(obj, schema) {
    const errors = [];
    
    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];
      
      if (rules.required && !value) {
        errors.push(`${key} is required`);
        continue;
      }
      
      if (value && rules.type) {
        try {
          this.validate(value, rules.type);
        } catch (err) {
          errors.push(`${key}: ${err.message}`);
        }
      }
      
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${key} exceeds maximum length of ${rules.maxLength}`);
      }
      
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${key} must be at least ${rules.minLength} characters`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }
}

// React hook for safe input handling
export function useSafeInput(initialValue = '', type = 'text') {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);

  const handleChange = (newValue) => {
    try {
      const sanitized = InputSanitizer.validate(newValue, type);
      setValue(sanitized);
      setError(null);
      return sanitized;
    } catch (err) {
      setError(err.message);
      toast.error(`Input validation failed: ${err.message}`);
      return null;
    }
  };

  return { value, setValue: handleChange, error };
}

export default InputSanitizer;