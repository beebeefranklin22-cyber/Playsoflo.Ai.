# Error Handling Components

## Overview
Comprehensive error handling with user-friendly messages and backend logging.

## Components

### GlobalErrorHandler
Catches unhandled errors globally.
- Promise rejection handling
- Automatic backend logging
- User-friendly toast notifications
- Error categorization

**Usage:**
```jsx
<GlobalErrorHandler>
  <App />
</GlobalErrorHandler>
```

### ErrorBoundaryWithLogging
React error boundary with backend logging.
- Component error catching
- Stack trace logging
- Recovery UI
- PostHog integration

**Usage:**
```jsx
<ErrorBoundaryWithLogging>
  <YourComponent />
</ErrorBoundaryWithLogging>
```

### UserFriendlyError
Displays contextual error messages.
- Pre-configured error types
- Retry actions
- Custom actions
- Animated UI

**Usage:**
```jsx
<UserFriendlyError
  type="network"
  title="Connection Lost"
  message="Check your internet"
  onRetry={retryAction}
  action={{ label: "Go Home", onClick: goHome }}
/>
```

## Error Types
- `network` - Connection issues
- `auth` - Authentication errors
- `permission` - Access denied
- `payment` - Payment failures
- `generic` - General errors

## Error Logging
All errors are automatically logged to the `ErrorLog` entity:
- `error_message` - Error description
- `error_stack` - Stack trace
- `error_type` - Category
- `url` - Page where error occurred
- `user_agent` - Browser info

## Best Practices
1. Wrap entire app in `GlobalErrorHandler`
2. Use `ErrorBoundaryWithLogging` for routes
3. Show `UserFriendlyError` for known errors
4. Always provide retry actions
5. Log errors with context
6. Never show technical details to users