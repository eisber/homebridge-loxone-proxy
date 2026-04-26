import { describe, it, expect } from 'vitest';
import { CarbonDioxideSensor } from '../src/homekit/services/CarbonDioxideSensor';
import { AirQualitySensor } from '../src/homekit/services/AirQualitySensor';
import { createMockPlatform, MockAccessory } from './helpers';

describe('CarbonDioxideSensor', () => {
  function createSensor() {
    const { platform } = createMockPlatform();
    const accessory = new MockAccessory('CO2 Sensor', 'uuid-co2');
    accessory.context.device = { name: 'CO2', uuidAction: 'co2-uuid', room: 'Office' };
    return new CarbonDioxideSensor(platform as any, accessory as any);
  }

  it('should detect CO2 above 1000 ppm', () => {
    const sensor = createSensor();
    sensor.updateService({ value: 1500 } as any);
    expect(sensor.State.CarbonDioxideDetected).toBe(true);
    expect(sensor.State.CarbonDioxideLevel).toBe(1500);
  });

  it('should not detect CO2 at or below 1000 ppm', () => {
    const sensor = createSensor();
    sensor.updateService({ value: 800 } as any);
    expect(sensor.State.CarbonDioxideDetected).toBe(false);
    expect(sensor.State.CarbonDioxideLevel).toBe(800);
  });

  it('should return state via getters', () => {
    const sensor = createSensor();
    sensor.State.CarbonDioxideLevel = 600;
    sensor.State.CarbonDioxideDetected = false;
    expect(sensor.handleCO2LevelGet()).toBe(600);
    expect(sensor.handleCO2DetectedGet()).toBe(false);
  });
});

describe('AirQualitySensor', () => {
  function createSensor() {
    const { platform } = createMockPlatform();
    const accessory = new MockAccessory('VOC Sensor', 'uuid-voc');
    accessory.context.device = { name: 'VOC', uuidAction: 'voc-uuid', room: 'Living' };
    return new AirQualitySensor(platform as any, accessory as any);
  }

  it('should map VOC levels to air quality grades', () => {
    const sensor = createSensor();

    sensor.updateService({ value: 200 } as any);
    expect(sensor.State.AirQuality).toBe(1); // Excellent

    sensor.updateService({ value: 500 } as any);
    expect(sensor.State.AirQuality).toBe(2); // Good

    sensor.updateService({ value: 800 } as any);
    expect(sensor.State.AirQuality).toBe(3); // Fair

    sensor.updateService({ value: 1200 } as any);
    expect(sensor.State.AirQuality).toBe(4); // Inferior

    sensor.updateService({ value: 2000 } as any);
    expect(sensor.State.AirQuality).toBe(5); // Poor
  });

  it('should track VOC density', () => {
    const sensor = createSensor();
    sensor.updateService({ value: 450 } as any);
    expect(sensor.State.VOCDensity).toBe(450);
  });

  it('should return state via getters', () => {
    const sensor = createSensor();
    sensor.State.AirQuality = 3;
    sensor.State.VOCDensity = 800;
    expect(sensor.handleAirQualityGet()).toBe(3);
    expect(sensor.handleVOCDensityGet()).toBe(800);
  });
});
