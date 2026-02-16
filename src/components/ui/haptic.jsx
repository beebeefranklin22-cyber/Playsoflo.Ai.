// Haptic feedback utility for native apps
export const triggerHaptic = (type = 'light') => {
  if (window.NativeAppBridge?.triggerHaptic) {
    window.NativeAppBridge.triggerHaptic(type);
  }
};

// Haptic types:
// - 'light': Light tap (e.g., button press, navigation)
// - 'medium': Medium impact (e.g., selection change, refresh)
// - 'heavy': Heavy impact (e.g., errors, warnings, important actions)
// - 'success': Success notification
// - 'warning': Warning notification
// - 'error': Error notification