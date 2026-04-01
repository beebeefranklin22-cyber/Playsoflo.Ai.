import DOMPurify from 'dompurify';
import { useState } from "react";

class InputSanitizer {
  // Sanitize HTML content to prevent XSS
  static sanitizeHTML(dirty) {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }

  // Sanitize rich text (for messages, comments)
  static sanitizeRichText(dirty) {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false
    });
  }

  // Sanitize plain text (strip all HTML)
  static sanitizePlainText(dirty) {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
  }

  // Sanitize URL to prevent javascript: and data: schemes
  static sanitizeURL(url) {
    if (!url) return '';
    const sanitized = DOMPurify.sanitize(url);
    try {
      const parsed = new URL(sanitized);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return sanitized;
      }
    } catch (e) {
      return '';
    }
    return '';
  }

  // Validate and sanitize email
  static sanitizeEmail(email) {
    if (!email) return '';
    const cleaned = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(cleaned) ? cleaned : '';
  }

  // Sanitize phone number (digits only)
  static sanitizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  // Sanitize numeric input
  static sanitizeNumber(value, { min, max, allowFloat = false } = {}) {
    if (value === null || value === undefined) return null;
    const num = allowFloat ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(num)) return null;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
  }

  // Sanitize search query
  static sanitizeSearchQuery(query) {
    if (!query) return '';
    // Remove special characters that could be used for injection
    return query.replace(/[<>\"'`${}();]/g, '').trim().slice(0, 200);
  }

  // Sanitize file name
  static sanitizeFileName(fileName) {
    if (!fileName) return '';
    // Remove path traversal attempts and dangerous characters
    return fileName
      .replace(/\.\./g, '')
      .replace(/[\/\\:*?"<>|]/g, '')
      .trim()
      .slice(0, 255);
  }

  // Validate price/amount
  static sanitizeAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return 0;
    return Math.round(num * 100) / 100; // Round to 2 decimals
  }

  // Sanitize JSON input
  static sanitizeJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      // Recursively sanitize strings in object
      return JSON.parse(JSON.stringify(parsed, (key, value) => {
        if (typeof value === 'string') {
          return this.sanitizePlainText(value);
        }
        return value;
      }));
    } catch (e) {
      return null;
    }
  }

  // Rate limiting helper
  static createRateLimiter(maxRequests, timeWindow) {
    const requests = new Map();
    
    return (key) => {
      const now = Date.now();
      const userRequests = requests.get(key) || [];
      const recentRequests = userRequests.filter(time => now - time < timeWindow);
      
      if (recentRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      recentRequests.push(now);
      requests.set(key, recentRequests);
      return true;
    };
  }
}

export default InputSanitizer;

// React hook for sanitized input
export function useSanitizedInput(initialValue = '', type = 'text') {
  const [value, setValue] = useState(initialValue);
  const [sanitized, setSanitized] = useState(initialValue);

  const handleChange = (e) => {
    const raw = e.target.value;
    setValue(raw);

    let cleaned;
    switch (type) {
      case 'html':
        cleaned = InputSanitizer.sanitizeHTML(raw);
        break;
      case 'url':
        cleaned = InputSanitizer.sanitizeURL(raw);
        break;
      case 'email':
        cleaned = InputSanitizer.sanitizeEmail(raw);
        break;
      case 'number':
        cleaned = InputSanitizer.sanitizeNumber(raw);
        break;
      default:
        cleaned = InputSanitizer.sanitizePlainText(raw);
    }
    setSanitized(cleaned);
  };

  return [value, sanitized, handleChange];
}