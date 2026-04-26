import { describe, it, expect } from 'vitest';
import { CarbonMonoxideSensor } from '../src/homekit/services/CarbonMonoxideSensor';
import { Battery } from '../src/homekit/services/Battery';
import { StatelessProgrammableSwitch } from '../src/homekit/services/StatelessProgrammableSwitch';
import { Door } from '../src/homekit/services/Door';
import { HeaterCooler } from '../src/homekit/services/HeaterCooler';
import { AirPurifier } from '../src/homekit/services/AirPurifier';
import { FilterMaintenance } from '../src/homekit/services/FilterMaintenance';
import { Faucet } from '../src/homekit/services/Faucet';
import { createMockPlatform, MockAccessory } from './helpers';

function createService<T>(ServiceClass: new (...args: any[]) => T, name = 'Test'): T {
  const { platform } = createMockPlatform();
  const accessory = new MockAccessory(name, `uuid-${name}`);
  accessory.context.device = { name, uuidAction: `${name}-uuid`, room: 'Room' };
  return new ServiceClass(platform as any, accessory as any);
}

describe('CarbonMonoxideSensor', () => {
  it('should detect CO above 50 ppm', () => {
    const sensor = createService(CarbonMonoxideSensor, 'CO');
    sensor.updateService({ value: 80 } as any);
    expect(sensor.State.CarbonMonoxideDetected).toBe(true);
    expect(sensor.State.CarbonMonoxideLevel).toBe(80);
  });

  it('should not detect CO at or below 50 ppm', () => {
    const sensor = createService(CarbonMonoxideSensor, 'CO');
    sensor.updateService({ value: 30 } as any);
    expect(sensor.State.CarbonMonoxideDetected).toBe(false);
  });
});

describe('Battery', () => {
  it('should set low battery when below 15%', () => {
    const battery = createService(Battery, 'Battery');
    battery.updateService({ value: 10 } as any);
    expect(battery.State.BatteryLevel).toBe(10);
    expect(battery.State.StatusLowBattery).toBe(1);
  });

  it('should set normal battery above 15%', () => {
    const battery = createService(Battery, 'Battery');
    battery.updateService({ value: 80 } as any);
    expect(battery.State.StatusLowBattery).toBe(0);
  });

  it('should clamp battery to 0-100 range', () => {
    const battery = createService(Battery, 'Battery');
    battery.updateService({ value: 150 } as any);
    expect(battery.State.BatteryLevel).toBe(100);
    battery.updateService({ value: -5 } as any);
    expect(battery.State.BatteryLevel).toBe(0);
  });
});

describe('StatelessProgrammableSwitch', () => {
  it('should trigger single press on non-zero value', () => {
    const sw = createService(StatelessProgrammableSwitch, 'Button');
    sw.updateService({ value: 1 } as any);
    expect(sw.State.ProgrammableSwitchEvent).toBe(0); // 0 = single press
  });

  it('should not trigger on zero value (release)', () => {
    const sw = createService(StatelessProgrammableSwitch, 'Button');
    sw.State.ProgrammableSwitchEvent = 99;
    sw.updateService({ value: 0 } as any);
    expect(sw.State.ProgrammableSwitchEvent).toBe(99); // unchanged
  });
});

describe('Door', () => {
  it('should map Loxone 0-1 to HomeKit 0-100%', () => {
    const door = createService(Door, 'Door');
    door.updateService({ value: 0.5 } as any);
    expect(door.State.CurrentPosition).toBe(50);
    expect(door.State.PositionState).toBe(2); // Stopped
  });

  it('should send normalized value on setTargetPosition', async () => {
    const { platform, handler } = createMockPlatform();
    const accessory = new MockAccessory('Door', 'uuid-door');
    accessory.context.device = { name: 'Door', uuidAction: 'door-uuid', room: 'Hall' };
    const door = new Door(platform as any, accessory as any);
    await door.setTargetPosition(75);
    expect(handler.commands[0].command).toBe('0.75');
  });
});

describe('HeaterCooler', () => {
  it('should derive Heating state when temp < threshold', () => {
    const hc = createService(HeaterCooler, 'HVAC');
    hc.State.HeatingThresholdTemperature = 22;
    hc.updateService({ state: 'tempActual', value: 18 } as any);
    expect(hc.State.CurrentHeaterCoolerState).toBe(2); // Heating
  });

  it('should derive Cooling state when temp > cooling threshold', () => {
    const hc = createService(HeaterCooler, 'HVAC');
    hc.State.CoolingThresholdTemperature = 26;
    hc.updateService({ state: 'tempActual', value: 28 } as any);
    expect(hc.State.CurrentHeaterCoolerState).toBe(3); // Cooling
  });

  it('should derive Idle when temp is in range', () => {
    const hc = createService(HeaterCooler, 'HVAC');
    hc.State.HeatingThresholdTemperature = 20;
    hc.State.CoolingThresholdTemperature = 26;
    hc.updateService({ state: 'tempActual', value: 22 } as any);
    expect(hc.State.CurrentHeaterCoolerState).toBe(1); // Idle
  });

  it('should send command on setActive', async () => {
    const { platform, handler } = createMockPlatform();
    const accessory = new MockAccessory('HVAC', 'uuid-hvac');
    accessory.context.device = { name: 'HVAC', uuidAction: 'hvac-uuid', room: 'Living' };
    const hc = new HeaterCooler(platform as any, accessory as any);
    await hc.setActive(0);
    expect(handler.commands[0].command).toBe('Off');
  });
});

describe('AirPurifier', () => {
  it('should set Purifying state when speed > 0', () => {
    const ap = createService(AirPurifier, 'Vent');
    ap.updateService({ state: 'speed', value: 50 } as any);
    expect(ap.State.CurrentAirPurifierState).toBe(2); // Purifying
    expect(ap.State.RotationSpeed).toBe(50);
  });

  it('should set Idle state when speed = 0', () => {
    const ap = createService(AirPurifier, 'Vent');
    ap.updateService({ state: 'speed', value: 0 } as any);
    expect(ap.State.CurrentAirPurifierState).toBe(1); // Idle
  });

  it('should map mode 0 to Auto', () => {
    const ap = createService(AirPurifier, 'Vent');
    ap.updateService({ state: 'mode', value: 0 } as any);
    expect(ap.State.TargetAirPurifierState).toBe(1); // Auto
  });
});

describe('FilterMaintenance', () => {
  it('should indicate change needed below 10%', () => {
    const fm = createService(FilterMaintenance, 'Filter');
    fm.updateService({ value: 5 } as any);
    expect(fm.State.FilterChangeIndication).toBe(1);
    expect(fm.State.FilterLifeLevel).toBe(5);
  });

  it('should indicate OK above 10%', () => {
    const fm = createService(FilterMaintenance, 'Filter');
    fm.updateService({ value: 80 } as any);
    expect(fm.State.FilterChangeIndication).toBe(0);
  });
});

describe('Faucet', () => {
  it('should activate on non-zero value', () => {
    const faucet = createService(Faucet, 'Water');
    faucet.updateService({ value: 1 } as any);
    expect(faucet.State.Active).toBe(true);
  });

  it('should deactivate on zero', () => {
    const faucet = createService(Faucet, 'Water');
    faucet.State.Active = true;
    faucet.updateService({ value: 0 } as any);
    expect(faucet.State.Active).toBe(false);
  });

  it('should send On/Off commands', async () => {
    const { platform, handler } = createMockPlatform();
    const accessory = new MockAccessory('Water', 'uuid-water');
    accessory.context.device = { name: 'Water', uuidAction: 'water-uuid', room: 'Garden' };
    const faucet = new Faucet(platform as any, accessory as any);
    await faucet.setActive(1);
    expect(handler.commands[0].command).toBe('On');
    await faucet.setActive(0);
    expect(handler.commands[1].command).toBe('Off');
  });
});
