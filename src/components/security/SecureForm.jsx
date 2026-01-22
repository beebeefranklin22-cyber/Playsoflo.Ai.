import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import InputSanitizer from "./InputSanitizer";
import { toast } from "sonner";
import { Shield, AlertTriangle } from "lucide-react";

// Rate limiter for form submissions
const formSubmitLimiter = InputSanitizer.createRateLimiter(5, 60000); // 5 requests per minute

export function SecureInput({ 
  type = "text", 
  value, 
  onChange, 
  maxLength = 500,
  required = false,
  pattern,
  ...props 
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    let sanitized = e.target.value;

    // Apply sanitization based on type
    switch (type) {
      case "email":
        sanitized = InputSanitizer.sanitizeEmail(sanitized);
        setIsValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized));
        break;
      case "url":
        sanitized = InputSanitizer.sanitizeURL(sanitized);
        setIsValid(sanitized.length > 0);
        break;
      case "number":
        sanitized = InputSanitizer.sanitizeNumber(sanitized);
        setIsValid(!isNaN(sanitized));
        break;
      case "tel":
        sanitized = InputSanitizer.sanitizePhone(sanitized);
        setIsValid(sanitized.length >= 10);
        break;
      default:
        sanitized = InputSanitizer.sanitizePlainText(sanitized);
        if (pattern) {
          setIsValid(new RegExp(pattern).test(sanitized));
        }
    }

    // Check length
    if (sanitized.length > maxLength) {
      setError(`Maximum ${maxLength} characters allowed`);
      return;
    }

    setError("");
    setLocalValue(sanitized);
    onChange?.(sanitized);
  };

  return (
    <div className="space-y-1">
      <Input
        type={type}
        value={localValue}
        onChange={handleChange}
        className={!isValid && localValue ? "border-red-500" : ""}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
      {!isValid && localValue && (
        <p className="text-xs text-red-400">Invalid {type}</p>
      )}
    </div>
  );
}

export function SecureTextarea({ 
  value, 
  onChange, 
  maxLength = 2000,
  allowHTML = false,
  ...props 
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e) => {
    let sanitized = allowHTML 
      ? InputSanitizer.sanitizeRichText(e.target.value)
      : InputSanitizer.sanitizePlainText(e.target.value);

    if (sanitized.length > maxLength) {
      toast.error(`Maximum ${maxLength} characters allowed`);
      return;
    }

    setLocalValue(sanitized);
    setCharCount(sanitized.length);
    onChange?.(sanitized);
  };

  return (
    <div className="space-y-1">
      <Textarea
        value={localValue}
        onChange={handleChange}
        {...props}
      />
      <div className="flex justify-between items-center text-xs">
        <span className={charCount > maxLength * 0.9 ? "text-yellow-400" : "text-gray-400"}>
          {charCount} / {maxLength}
        </span>
        {allowHTML && (
          <span className="text-gray-500 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            HTML sanitized
          </span>
        )}
      </div>
    </div>
  );
}

export function SecureForm({ 
  onSubmit, 
  children, 
  rateLimitKey,
  validateBeforeSubmit,
  ...props 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Rate limiting
    if (rateLimitKey && !formSubmitLimiter(rateLimitKey)) {
      toast.error('Too many requests', {
        description: 'Please wait a moment before trying again.'
      });
      return;
    }

    // Custom validation
    if (validateBeforeSubmit) {
      const isValid = await validateBeforeSubmit();
      if (!isValid) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } catch (error) {
      toast.error('Submission failed', {
        description: error.message || 'Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}