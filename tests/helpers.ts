/**
 * Test helpers — mock implementations of Homebridge platform, accessory, and Loxone handler.
 */

/** Mock Characteristic with onSet/onGet chaining */
class MockCharacteristic {
  value: any = null;
  private _onSet?: (v: any) => void;
  private _onGet?: () => any;

  onSet(fn: (v: any) => void) {
    this._onSet = fn;
    return this;
  }

  onGet(fn: () => any) {
    this._onGet = fn;
    return this;
  }

  setProps(_props: any) {
    return this;
  }

  updateValue(v: any) {
    this.value = v;
    return this;
  }

  setValue(v: any) {
    this._onSet?.(v);
  }

  getValue() {
    return this._onGet?.() ?? this.value;
  }
}

/** Mock HomeKit Service */
class MockService {
  characteristics: Record<string, MockCharacteristic> = {};
  name?: string;
  subtype?: string;

  getCharacteristic(char: any): MockCharacteristic {
    const key = typeof char === 'string' ? char : char?.UUID ?? char;
    if (!this.characteristics[key]) {
      this.characteristics[key] = new MockCharacteristic();
    }
    return this.characteristics[key];
  }

  setCharacteristic(char: any, value: any) {
    this.getCharacteristic(char).updateValue(value);
    return this;
  }
}

/** Mock PlatformAccessory */
export class MockAccessory {
  UUID: string;
  displayName: string;
  context: any = { device: {} };
  private services: Record<string, MockService> = {};

  constructor(name: string, uuid: string) {
    this.UUID = uuid;
    this.displayName = name;
  }

  getService(serviceType: any): MockService | undefined {
    const key = typeof serviceType === 'string' ? serviceType : serviceType?.UUID ?? 'default';
    return this.services[key];
  }

  addService(serviceType: any, name?: string, subtype?: string): MockService {
    const key = typeof serviceType === 'string' ? serviceType : serviceType?.UUID ?? 'default';
    const svc = new MockService();
    svc.name = name;
    svc.subtype = subtype;
    this.services[key] = svc;
    return svc;
  }
}

/** Mock LoxoneHandler */
export class MockLoxoneHandler {
  commands: Array<{ uuid: string; command: string }> = [];
  listeners: Record<string, Array<(msg: any) => void>> = {};
  cache: Record<string, any> = {};

  sendCommand(uuid: string, command: string) {
    this.commands.push({ uuid, command });
  }

  registerListenerForUUID(uuid: string, callback: (msg: any) => void) {
    if (!this.listeners[uuid]) {
      this.listeners[uuid] = [];
    }
    this.listeners[uuid].push(callback);
  }

  getLastCachedValue(uuid: string) {
    return this.cache[uuid];
  }

  pushCachedState(accessory: any, uuid: string) {
    const cached = this.cache[uuid];
    if (cached !== undefined) {
      accessory.callBack({ uuid, value: cached });
    }
  }

  simulateEvent(uuid: string, value: any) {
    const callbacks = this.listeners[uuid] || [];
    callbacks.forEach(cb => cb({ uuid, value }));
  }
}

/** Characteristic UUID constants matching Homebridge */
const CharacteristicUUIDs = {
  On: 'On',
  Brightness: 'Brightness',
  Hue: 'Hue',
  Saturation: 'Saturation',
  ColorTemperature: 'ColorTemperature',
  CurrentTemperature: 'CurrentTemperature',
  CurrentRelativeHumidity: 'CurrentRelativeHumidity',
  CurrentAmbientLightLevel: 'CurrentAmbientLightLevel',
  CarbonDioxideDetected: 'CarbonDioxideDetected',
  CarbonDioxideLevel: 'CarbonDioxideLevel',
  AirQuality: 'AirQuality',
  VOCDensity: 'VOCDensity',
  OccupancyDetected: 'OccupancyDetected',
  Name: 'Name',
  ConfiguredName: 'ConfiguredName',
  Manufacturer: 'Manufacturer',
  Model: 'Model',
  SerialNumber: 'SerialNumber',
};

/** Service UUID constants */
const ServiceUUIDs = {
  Lightbulb: { UUID: 'Lightbulb' },
  Switch: { UUID: 'Switch' },
  Outlet: { UUID: 'Outlet' },
  TemperatureSensor: { UUID: 'TemperatureSensor' },
  HumiditySensor: { UUID: 'HumiditySensor' },
  LightSensor: { UUID: 'LightSensor' },
  CarbonDioxideSensor: { UUID: 'CarbonDioxideSensor' },
  AirQualitySensor: { UUID: 'AirQualitySensor' },
  OccupancySensor: { UUID: 'OccupancySensor' },
  AccessoryInformation: { UUID: 'AccessoryInformation' },
};

/** Create a mock platform */
export function createMockPlatform(configOverrides: Record<string, any> = {}) {
  const handler = new MockLoxoneHandler();

  const platform = {
    Service: ServiceUUIDs,
    Characteristic: CharacteristicUUIDs,
    LoxoneHandler: handler,
    config: {
      options: { MoodSwitches: 'enabled' },
      ...configOverrides,
    },
    log: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {},
    },
    api: {
      hap: {
        uuid: {
          generate: (input: string) => `uuid-${input}`,
        },
      },
      platformAccessory: MockAccessory,
      registerPlatformAccessories: () => {},
      unregisterPlatformAccessories: () => {},
    },
    accessories: [] as MockAccessory[],
    mappedAccessories: new Set<string>(),
    AccessoryCount: 0,
    accessoryNameMap: new Map<string, string>(),
    usedNames: new Set<string>(),
    generateUniqueName: (room: string, base: string, _uuid?: string) => `${room} ${base}`,
  };

  return { platform, handler };
}

/** Create a mock device for testing */
export function createMockDevice(overrides: Record<string, any> = {}) {
  return {
    name: 'Test Device',
    type: 'Switch',
    uuidAction: 'test-uuid-action',
    room: 'Test Room',
    cat: 'test-cat',
    defaultRating: 1,
    isFavorite: false,
    isSecured: false,
    restrictions: 0,
    details: {},
    states: {},
    subControls: {},
    ...overrides,
  };
}
