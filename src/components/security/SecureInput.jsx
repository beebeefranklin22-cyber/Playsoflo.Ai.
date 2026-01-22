import { forwardRef, useState } from "react";
import DOMPurify from "dompurify";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

/**
 * Secure Input Component with XSS Protection and Validation
 */
const SecureInput = forwardRef(({ 
  type = "text",
  multiline = false,
  validate,
  sanitize = true,
  maxLength = 1000,
  allowedTags = [],
  onChange,
  onBlur,
  value,
  error: externalError,
  ...props 
}, ref) => {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const sanitizeInput = (input) => {
    if (!sanitize || type === "password") return input;
    
    // XSS Protection
    const config = {
      ALLOWED_TAGS: allowedTags.length > 0 ? allowedTags : [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    };
    
    return DOMPurify.sanitize(input, config);
  };

  const validateInput = (input) => {
    // Length validation
    if (input.length > maxLength) {
      return `Maximum ${maxLength} characters allowed`;
    }

    // SQL Injection patterns
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi;
    if (sqlPattern.test(input)) {
      return "Invalid input detected";
    }

    // XSS patterns
    const xssPattern = /<script|javascript:|onerror=|onload=/gi;
    if (xssPattern.test(input)) {
      return "Invalid characters detected";
    }

    // Custom validation
    if (validate) {
      return validate(input);
    }

    return null;
  };

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Sanitize input
    newValue = sanitizeInput(newValue);
    
    // Validate input
    const validationError = validateInput(newValue);
    setError(validationError);

    // Call parent onChange
    if (onChange) {
      onChange({
        ...e,
        target: { ...e.target, value: newValue }
      });
    }
  };

  const handleBlur = (e) => {
    setTouched(true);
    if (onBlur) onBlur(e);
  };

  const showError = (touched && error) || externalError;
  const Component = multiline ? Textarea : Input;

  return (
    <div className="space-y-1">
      <Component
        ref={ref}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={maxLength}
        className={showError ? "border-red-500 focus:ring-red-500" : ""}
        {...props}
      />
      {showError && (
        <div className="flex items-center gap-1 text-red-500 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>{error || externalError}</span>
        </div>
      )}
    </div>
  );
});

SecureInput.displayName = 'SecureInput';

export default SecureInput;