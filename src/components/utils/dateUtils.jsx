import { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Formats a date string to the user's local timezone
 * @param {string} dateString - ISO date string from the database
 * @param {string} formatStr - Optional format string (default: relative time)
 * @returns {string} Formatted date in user's local timezone
 */
export function formatLocalTime(dateString, formatStr = null) {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    
    // If no format specified, return relative time (e.g., "2 hours ago")
    if (!formatStr) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Otherwise format according to the specified format in local timezone
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Formats a date to show time in 12-hour format with AM/PM
 */
export function formatTimeOnly(dateString) {
  return formatLocalTime(dateString, 'h:mm a');
}

/**
 * Formats a date to show date and time
 */
export function formatDateTime(dateString) {
  return formatLocalTime(dateString, 'MMM d, yyyy h:mm a');
}

/**
 * Formats a date to show just the date
 */
export function formatDateOnly(dateString) {
  return formatLocalTime(dateString, 'MMM d, yyyy');
}

/**
 * Gets the current time in ISO format (will be stored in UTC, displayed in local)
 */
export function getCurrentISOTime() {
  return new Date().toISOString();
}