/**
 * Format an ISO date string into a human-readable format like "16 Sep 2026"
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
