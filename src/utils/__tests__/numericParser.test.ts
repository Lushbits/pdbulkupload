import { describe, it, expect } from 'vitest';
import { normalizeDecimal } from '../numericParser';

describe('normalizeDecimal', () => {
  describe('basic decimal formats', () => {
    it('parses US/UK decimal format (period)', () => {
      expect(normalizeDecimal('15.50')).toBe(15.5);
      expect(normalizeDecimal('1234.5')).toBe(1234.5);
      expect(normalizeDecimal('0.99')).toBe(0.99);
    });

    it('parses European decimal format (comma)', () => {
      expect(normalizeDecimal('15,50')).toBe(15.5);
      expect(normalizeDecimal('1234,5')).toBe(1234.5);
      expect(normalizeDecimal('0,99')).toBe(0.99);
    });

    it('parses plain integers', () => {
      expect(normalizeDecimal('1234')).toBe(1234);
      expect(normalizeDecimal('0')).toBe(0);
      expect(normalizeDecimal('42')).toBe(42);
    });
  });

  describe('thousand separators', () => {
    it('handles US format with comma thousands and period decimal', () => {
      expect(normalizeDecimal('1,234.50')).toBe(1234.5);
      expect(normalizeDecimal('1,234,567.89')).toBe(1234567.89);
    });

    it('handles European format with period thousands and comma decimal', () => {
      expect(normalizeDecimal('1.234,50')).toBe(1234.5);
      expect(normalizeDecimal('1.234.567,89')).toBe(1234567.89);
    });

    it('handles space as thousands separator', () => {
      expect(normalizeDecimal('1 234,50')).toBe(1234.5);
      expect(normalizeDecimal('1 234.50')).toBe(1234.5);
      expect(normalizeDecimal('1 234 567')).toBe(1234567);
    });
  });

  describe('ambiguous cases (single separator + 3 trailing digits)', () => {
    it('treats single comma with exactly 3 trailing digits as thousands separator', () => {
      // "1,234" → 1234 (thousands separator heuristic)
      expect(normalizeDecimal('1,234')).toBe(1234);
    });

    it('treats single period with exactly 3 trailing digits as thousands separator', () => {
      // "1.234" → 1234 (thousands separator heuristic)
      expect(normalizeDecimal('1.234')).toBe(1234);
    });

    it('treats single comma with non-3 trailing digits as decimal', () => {
      expect(normalizeDecimal('1,23')).toBe(1.23);
      expect(normalizeDecimal('1,2')).toBe(1.2);
      expect(normalizeDecimal('1,2345')).toBe(1.2345);
    });

    it('treats single period with non-3 trailing digits as decimal', () => {
      expect(normalizeDecimal('1.23')).toBe(1.23);
      expect(normalizeDecimal('1.2')).toBe(1.2);
      expect(normalizeDecimal('1.2345')).toBe(1.2345);
    });
  });

  describe('multiple same separators → thousands separators', () => {
    it('multiple commas are all thousands separators', () => {
      expect(normalizeDecimal('1,234,567')).toBe(1234567);
    });

    it('multiple periods are all thousands separators', () => {
      expect(normalizeDecimal('1.234.567')).toBe(1234567);
    });
  });

  describe('sign handling', () => {
    it('handles negative numbers', () => {
      expect(normalizeDecimal('-15,50')).toBe(-15.5);
      expect(normalizeDecimal('-1234.5')).toBe(-1234.5);
      expect(normalizeDecimal('-1.234,5')).toBe(-1234.5);
    });

    it('handles explicit positive sign', () => {
      expect(normalizeDecimal('+15,50')).toBe(15.5);
      expect(normalizeDecimal('+1234')).toBe(1234);
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      expect(normalizeDecimal('  15.50  ')).toBe(15.5);
      expect(normalizeDecimal(' 15,50 ')).toBe(15.5);
    });
  });

  describe('passthrough for native numbers', () => {
    it('returns number values as-is', () => {
      expect(normalizeDecimal(15.5)).toBe(15.5);
      expect(normalizeDecimal(0)).toBe(0);
      expect(normalizeDecimal(-42)).toBe(-42);
    });
  });

  describe('invalid inputs', () => {
    it('returns NaN for null/undefined', () => {
      expect(normalizeDecimal(null)).toBeNaN();
      expect(normalizeDecimal(undefined)).toBeNaN();
    });

    it('returns NaN for empty string', () => {
      expect(normalizeDecimal('')).toBeNaN();
      expect(normalizeDecimal('   ')).toBeNaN();
    });

    it('returns NaN for non-numeric strings', () => {
      expect(normalizeDecimal('abc')).toBeNaN();
      expect(normalizeDecimal('hello')).toBeNaN();
      expect(normalizeDecimal('$15.50')).toBeNaN();
    });
  });

  describe('issue #11 expected behaviour table', () => {
    it('matches all expected conversions from the issue', () => {
      expect(normalizeDecimal('15.50')).toBe(15.5);
      expect(normalizeDecimal('15,50')).toBe(15.5);
      expect(normalizeDecimal('1234')).toBe(1234);
      expect(normalizeDecimal('1234.5')).toBe(1234.5);
      expect(normalizeDecimal('1234,5')).toBe(1234.5);
    });
  });

  describe('salary-specific examples', () => {
    it('handles salary hours like 37,5 or 37.5', () => {
      expect(normalizeDecimal('37,5')).toBe(37.5);
      expect(normalizeDecimal('37.5')).toBe(37.5);
    });

    it('handles salary amounts like 30000,50 or 30000.50', () => {
      expect(normalizeDecimal('30000,50')).toBe(30000.5);
      expect(normalizeDecimal('30000.50')).toBe(30000.5);
    });

    it('handles hourly rates like 15,50 or 15.50', () => {
      expect(normalizeDecimal('15,50')).toBe(15.5);
      expect(normalizeDecimal('15.50')).toBe(15.5);
    });
  });
});
