# Security Components

## Overview
Components for input validation, XSS protection, CSRF prevention, and rate limiting.

## Components

### SecureInput
Input component with built-in XSS protection and validation.
- DOMPurify sanitization
- SQL injection prevention
- Pattern validation
- Custom validators

**Usage:**
```jsx
<SecureInput
  type="text"
  maxLength={500}
  sanitize={true}
  validate={(value) => {
    if (value.length < 3) return "Too short";
    return null;
  }}
  onChange={(e) => setValue(e.target.value)}
/>
```

### SecureForm
Form wrapper with CSRF protection and rate limiting.
- Automatic rate limiting
- Authentication checks
- Error logging
- Submission tracking

**Usage:**
```jsx
<SecureForm
  onSubmit={handleSubmit}
  maxSubmitsPerMinute={5}
  requireAuth={true}
>
  {({ isSubmitting }) => (
    <>
      <SecureInput name="username" />
      <Button disabled={isSubmitting}>Submit</Button>
    </>
  )}
</SecureForm>
```

### useRateLimiter
Hook for rate limiting any action.
- Configurable time window
- Attempt tracking
- Custom callbacks

**Usage:**
```jsx
const { checkLimit, attemptCount } = useRateLimiter(5, 60000);

const handleAction = () => {
  if (!checkLimit()) return;
  // Perform action
};
```

## Security Best Practices
1. Always use `SecureInput` for user input
2. Sanitize HTML content with DOMPurify
3. Implement rate limiting on sensitive operations
4. Validate all inputs on both client and server
5. Log security events to ErrorLog entity
6. Never trust client-side validation alone