import { formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Returns the user's configured timezone (from profile, stored locally).
 * Falls back to the browser's detected timezone.
 */
export function getUserTimezone() {
  try {
    const stored = localStorage.getItem('user_timezone');
    if (stored) return stored;
  } catch {}
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Persist timezone to localStorage so all time displays update without refetch.
 * Called by CitySelector after saving.
 */
export function setUserTimezone(tz) {
  try {
    localStorage.setItem('user_timezone', tz);
  } catch {}
}

/**
 * Formats a date string using the user's configured timezone.
 * @param {string} dateString - ISO date string from the database
 * @param {object} opts - Intl.DateTimeFormat options (e.g. {hour:'2-digit', minute:'2-digit'})
 * @returns {string}
 */
export function formatLocalTime(dateString, opts = null) {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!opts) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return new Intl.DateTimeFormat('en-US', { timeZone: getUserTimezone(), ...opts }).format(date);
  } catch {
    return String(dateString);
  }
}

/**
 * Formats a date to show time in 12-hour format with AM/PM in user's timezone.
 */
export function formatTimeOnly(dateString) {
  return formatLocalTime(dateString, { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Formats a date to show date and time in user's timezone.
 */
export function formatDateTime(dateString) {
  return formatLocalTime(dateString, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

/**
 * Formats a date to show just the date in user's timezone.
 */
export function formatDateOnly(dateString) {
  return formatLocalTime(dateString, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Gets the current time in ISO format (UTC — for storage).
 */
export function getCurrentISOTime() {
  return new Date().toISOString();
}