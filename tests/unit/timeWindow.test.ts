import { describe, it, expect } from 'vitest';
import { getTimeWindow, isValidTimeRange } from '@/lib/utils/timeWindow';

describe('Time Window Utilities', () => {
  describe('getTimeWindow', () => {
    it('should return correct time window for day', () => {
      const window = getTimeWindow('day');
      const now = new Date();
      const expectedSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(window.until).toBeNull();
      expect(window.since.getTime()).toBeCloseTo(expectedSince.getTime(), -2); // Within 100ms
    });

    it('should return correct time window for week', () => {
      const window = getTimeWindow('week');
      const now = new Date();
      
      expect(window.until).toBeNull();
      expect(window.since).toBeInstanceOf(Date);
      expect(window.since.getTime()).toBeLessThan(now.getTime());
    });

    it('should return correct time window for month', () => {
      const window = getTimeWindow('month');
      const now = new Date();
      
      expect(window.until).toBeNull();
      expect(window.since).toBeInstanceOf(Date);
      expect(window.since.getTime()).toBeLessThan(now.getTime());
    });

    it('should return correct time window for all', () => {
      const window = getTimeWindow('all');
      
      expect(window.until).toBeNull();
      expect(window.since).toEqual(new Date(0));
    });

    it('should default to week for invalid input', () => {
      const window = getTimeWindow('invalid' as any);
      const now = new Date();
      
      expect(window.until).toBeNull();
      expect(window.since).toBeInstanceOf(Date);
      expect(window.since.getTime()).toBeLessThan(now.getTime());
    });
  });

  describe('isValidTimeRange', () => {
    it('should return true for valid time ranges', () => {
      expect(isValidTimeRange('day')).toBe(true);
      expect(isValidTimeRange('week')).toBe(true);
      expect(isValidTimeRange('month')).toBe(true);
      expect(isValidTimeRange('all')).toBe(true);
    });

    it('should return false for invalid time ranges', () => {
      expect(isValidTimeRange('invalid')).toBe(false);
      expect(isValidTimeRange('')).toBe(false);
      expect(isValidTimeRange('daily')).toBe(false);
      expect(isValidTimeRange('weekly')).toBe(false);
    });
  });
});
