import { describe, it, expect } from 'vitest';
import { AlarmClock } from '../src/loxone/items/AlarmClock';
import { Tracker } from '../src/loxone/items/Tracker';

describe('AlarmClock', () => {
  describe('isSupported', () => {
    it('should be supported when isEnabled state exists', () => {
      const item = Object.create(AlarmClock.prototype);
      item.device = {
        states: { isEnabled: 'some-uuid', isAlarmActive: 'another-uuid' },
      };
      expect(item.isSupported()).toBe(true);
    });

    it('should not be supported when isEnabled state is missing', () => {
      const item = Object.create(AlarmClock.prototype);
      item.device = { states: {} };
      expect(item.isSupported()).toBe(false);
    });

    it('should not be supported when states is undefined', () => {
      const item = Object.create(AlarmClock.prototype);
      item.device = {};
      expect(item.isSupported()).toBe(false);
    });
  });
});

describe('Tracker', () => {
  describe('isSupported', () => {
    it('should be supported when entries state exists', () => {
      const item = Object.create(Tracker.prototype);
      item.device = {
        states: { entries: 'entries-uuid' },
      };
      expect(item.isSupported()).toBe(true);
    });

    it('should not be supported when entries state is missing', () => {
      const item = Object.create(Tracker.prototype);
      item.device = { states: {} };
      expect(item.isSupported()).toBe(false);
    });

    it('should not be supported when states is undefined', () => {
      const item = Object.create(Tracker.prototype);
      item.device = {};
      expect(item.isSupported()).toBe(false);
    });
  });
});
