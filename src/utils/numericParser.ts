/**
 * Numeric Parser Utility
 * Handles decimal separator normalization for international number formats.
 *
 * Supports both European (comma decimal) and US/UK (period decimal) formats:
 *   - "15.50"   → 15.5
 *   - "15,50"   → 15.5
 *   - "1,234.5" → 1234.5  (US thousands + decimal)
 *   - "1.234,5" → 1234.5  (EU thousands + decimal)
 *   - "1 234,5" → 1234.5  (space thousands + comma decimal)
 *
 * Ambiguous case heuristic:
 *   If there is exactly one separator (comma or period) followed by exactly 3 digits
 *   and no other separators, it is treated as a thousands separator.
 *   e.g. "1,234" → 1234, "1.234" → 1234
 *   Otherwise a lone separator is treated as decimal.
 *   e.g. "1,23" → 1.23, "15,5" → 15.5
 */

/**
 * Normalize a string numeric value that may use comma or period as decimal separator.
 * Returns a proper JS number, or NaN if the value cannot be parsed.
 */
export function normalizeDecimal(value: unknown): number {
  if (value === null || value === undefined) {
    return NaN;
  }

  // If already a number, return as-is
  if (typeof value === 'number') {
    return value;
  }

  let str = String(value).trim();

  // Empty string → NaN
  if (str === '') {
    return NaN;
  }

  // Handle negative/positive sign prefix
  let sign = 1;
  if (str.startsWith('-')) {
    sign = -1;
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }

  // Remove any currency symbols or whitespace characters used as thousands separators
  // Keep only digits, commas, periods
  // First: remove spaces (they can be thousands separators like "1 234,50")
  str = str.replace(/\s/g, '');

  // Check that remaining string only contains digits, commas, and periods
  if (!/^[\d.,]+$/.test(str)) {
    return NaN;
  }

  const lastComma = str.lastIndexOf(',');
  const lastPeriod = str.lastIndexOf('.');
  const commaCount = (str.match(/,/g) || []).length;
  const periodCount = (str.match(/\./g) || []).length;

  let normalized: string;

  if (lastComma === -1 && lastPeriod === -1) {
    // No separators at all: plain integer like "1234"
    normalized = str;
  } else if (lastComma === -1 && lastPeriod !== -1) {
    // Only periods present
    if (periodCount === 1) {
      // Single period: could be decimal or thousands separator
      // Heuristic: if exactly 3 digits follow, treat as thousands separator
      const afterPeriod = str.slice(lastPeriod + 1);
      if (afterPeriod.length === 3) {
        // e.g. "1.234" → 1234 (thousands separator)
        normalized = str.replace(/\./g, '');
      } else {
        // e.g. "15.50" → decimal
        normalized = str;
      }
    } else {
      // Multiple periods: must be thousands separators (e.g. "1.234.567")
      normalized = str.replace(/\./g, '');
    }
  } else if (lastPeriod === -1 && lastComma !== -1) {
    // Only commas present
    if (commaCount === 1) {
      // Single comma: could be decimal or thousands separator
      // Heuristic: if exactly 3 digits follow, treat as thousands separator
      const afterComma = str.slice(lastComma + 1);
      if (afterComma.length === 3) {
        // e.g. "1,234" → 1234 (thousands separator)
        normalized = str.replace(/,/g, '');
      } else {
        // e.g. "15,50" → 15.50 (decimal separator)
        normalized = str.replace(',', '.');
      }
    } else {
      // Multiple commas: must be thousands separators (e.g. "1,234,567")
      normalized = str.replace(/,/g, '');
    }
  } else {
    // Both commas and periods present
    // The last separator is the decimal separator
    if (lastComma > lastPeriod) {
      // Comma is last → European format: "1.234,50"
      // Periods are thousands separators, comma is decimal
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Period is last → US format: "1,234.50"
      // Commas are thousands separators, period is decimal
      normalized = str.replace(/,/g, '');
    }
  }

  const result = Number(normalized);
  return isNaN(result) ? NaN : sign * result;
}
