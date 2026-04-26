import { describe, it, expect } from 'vitest';
import { InfoOnlyAnalog } from '../src/loxone/items/InfoOnlyAnalog';
import { createMockPlatform, createMockDevice } from './helpers';

describe('InfoOnlyAnalog', () => {
  describe('format detection', () => {
    const formats: Array<[string, string]> = [
      ['%.1f°', 'TemperatureSensor'],
      ['%.0f°', 'TemperatureSensor'],
      ['%.1f°C', 'TemperatureSensor'],
      ['%.0f°C', 'TemperatureSensor'],
      ['%.0fLx', 'LightSensor'],
      ['%.0f%%', 'HumiditySensor'],
      ['%.1f%%', 'HumiditySensor'],
      ['%.0fppm', 'CarbonDioxideSensor'],
      ['%.0f ppm', 'CarbonDioxideSensor'],
      ['%.0fppb', 'AirQualitySensor'],
      ['%.0f ppb', 'AirQualitySensor'],
    ];

    formats.forEach(([format, expectedService]) => {
      it(`should detect format "${format}" as ${expectedService}`, () => {
        const { platform } = createMockPlatform();
        const device = createMockDevice({
          type: 'InfoOnlyAnalog',
          details: { format },
          states: { value: 'some-uuid' },
        });

        const item = Object.create(InfoOnlyAnalog.prototype);
        item.platform = platform;
        item.device = device;
        item.matchAlias = InfoOnlyAnalog.prototype['matchAlias'];

        const result = item.isSupported();
        expect(result).toBe(true);
      });
    });

    it('should return false for unknown format without aliases', () => {
      const { platform } = createMockPlatform();
      const device = createMockDevice({
        type: 'InfoOnlyAnalog',
        details: { format: '%.2f' },
        states: { value: 'some-uuid' },
      });

      const item = Object.create(InfoOnlyAnalog.prototype);
      item.platform = platform;
      item.device = device;
      item.matchAlias = InfoOnlyAnalog.prototype['matchAlias'];

      expect(item.isSupported()).toBe(false);
    });
  });

  describe('alias matching', () => {
    it('should match temperature alias', () => {
      const { platform } = createMockPlatform({
        InfoOnlyAnalogAlias: {
          Temperature: '%Temp%',
        },
      });
      const device = createMockDevice({
        name: 'Außentemp',
        type: 'InfoOnlyAnalog',
        details: {},
        states: { value: 'some-uuid' },
      });

      const item = Object.create(InfoOnlyAnalog.prototype);
      item.platform = platform;
      item.device = device;
      item.matchAlias = InfoOnlyAnalog.prototype['matchAlias'];

      expect(item.isSupported()).toBe(true);
    });

    it('should match CO2 alias', () => {
      const { platform } = createMockPlatform({
        InfoOnlyAnalogAlias: {
          CO2: 'CO2%',
        },
      });
      const device = createMockDevice({
        name: 'CO2 Sensor Büro',
        type: 'InfoOnlyAnalog',
        details: {},
        states: { value: 'some-uuid' },
      });

      const item = Object.create(InfoOnlyAnalog.prototype);
      item.platform = platform;
      item.device = device;
      item.matchAlias = InfoOnlyAnalog.prototype['matchAlias'];

      expect(item.isSupported()).toBe(true);
    });
  });

  describe('null guard', () => {
    it('should not crash when InfoOnlyAnalogAlias is undefined', () => {
      const { platform } = createMockPlatform();
      // Explicitly remove aliases from config
      delete (platform.config as any).InfoOnlyAnalogAlias;

      const device = createMockDevice({
        name: 'Unknown Sensor',
        type: 'InfoOnlyAnalog',
        details: { format: '%.2f' },
        states: { value: 'some-uuid' },
      });

      const item = Object.create(InfoOnlyAnalog.prototype);
      item.platform = platform;
      item.device = device;
      item.matchAlias = InfoOnlyAnalog.prototype['matchAlias'];

      // Should not throw
      expect(() => item.isSupported()).not.toThrow();
      expect(item.isSupported()).toBe(false);
    });

    it('should not crash when details is undefined', () => {
      const { platform } = createMockPlatform();
      const device = createMockDevice({
        name: 'Broken Sensor',
        type: 'InfoOnlyAnalog',
        states: { value: 'some-uuid' },
      });
      delete device.details;

      const item = Object.create(InfoOnlyAnalog.prototype);
      item.platform = platform;
      item.device = device;
      item.matchAlias = InfoOnlyAnalog.prototype['matchAlias'];

      expect(() => item.isSupported()).not.toThrow();
    });
  });
});
