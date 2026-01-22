import React, { useCallback } from "react";
import DOMPurify from "dompurify";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Secure input validation and sanitization
const sanitizeInput = (value, type = 'text') => {
  if (!value) return value;

  // Remove potential XSS
  let sanitized = DOMPurify.sanitize(value, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  });

  // Type-specific validation
  switch (type) {
    case 'email':
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
        return null;
      }
      break;
    case 'url':
      // URL validation
      try {
        new URL(sanitized);
      } catch {
        return null;
      }
      break;
    case 'number':
      // Number validation
      sanitized = sanitized.replace(/[^\d.-]/g, '');
      break;
    case 'phone':
      // Phone number validation
      sanitized = sanitized.replace(/[^\d+()-\s]/g, '');
      break;
    case 'currency':
      // Currency validation
      sanitized = sanitized.replace(/[^\d.]/g, '');
      const parts = sanitized.split('.');
      if (parts.length > 2) return null;
      if (parts[1] && parts[1].length > 2) {
        sanitized = parts[0] + '.' + parts[1].substring(0, 2);
      }
      break;
    default:
      // Remove common injection patterns
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
  }

  return sanitized;
};

export const SecureInput = ({ 
  value, 
  onChange, 
  validationType = 'text',
  maxLength = 1000,
  showError = true,
  ...props 
}) => {
  const handleChange = useCallback((e) => {
    const rawValue = e.target.value;
    
    // Length check
    if (rawValue.length > maxLength) {
      if (showError) {
        toast.error(`Input too long. Maximum ${maxLength} characters.`);
      }
      return;
    }

    const sanitized = sanitizeInput(rawValue, validationType);
    
    if (sanitized === null) {
      if (showError) {
        toast.error(`Invalid ${validationType} format`);
      }
      return;
    }

    if (sanitized !== rawValue && showError) {
      toast.warning('Input was sanitized for security');
    }

    onChange({ ...e, target: { ...e.target, value: sanitized } });
  }, [onChange, validationType, maxLength, showError]);

  return <Input {...props} value={value} onChange={handleChange} />;
};

export const SecureTextarea = ({ 
  value, 
  onChange, 
  maxLength = 5000,
  showError = true,
  ...props 
}) => {
  const handleChange = useCallback((e) => {
    const rawValue = e.target.value;
    
    if (rawValue.length > maxLength) {
      if (showError) {
        toast.error(`Input too long. Maximum ${maxLength} characters.`);
      }
      return;
    }

    const sanitized = sanitizeInput(rawValue, 'text');
    
    if (sanitized !== rawValue && showError) {
      toast.warning('Input was sanitized for security');
    }

    onChange({ ...e, target: { ...e.target, value: sanitized } });
  }, [onChange, maxLength, showError]);

  return <Textarea {...props} value={value} onChange={handleChange} />;
};

export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    toast.error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
    return false;
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    toast.error('Invalid file type');
    return false;
  }

  // Check file extension
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    toast.error('Invalid file extension');
    return false;
  }

  return true;
};

export const sanitizeHTML = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
};

export const sanitizeURL = (url) => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      toast.error('Invalid URL protocol');
      return null;
    }
    return parsed.toString();
  } catch {
    toast.error('Invalid URL format');
    return null;
  }
};