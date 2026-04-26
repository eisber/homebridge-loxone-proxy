import { BaseService } from './BaseService';

/**
 * CarbonDioxideSensor
 * Represents a CO2 sensor service for Homebridge.
 */
export class CarbonDioxideSensor extends BaseService {
  State = {
    CarbonDioxideDetected: false,
    CarbonDioxideLevel: 0,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.CarbonDioxideSensor) ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor);

    this.service.getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .onGet(this.handleCO2DetectedGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.handleCO2LevelGet.bind(this));
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Callback state update for CO2 Sensor: ${message.value}`);
    this.State.CarbonDioxideLevel = message.value;
    this.State.CarbonDioxideDetected = message.value > 1000;

    this.service!
      .getCharacteristic(this.platform.Characteristic.CarbonDioxideDetected)
      .updateValue(this.State.CarbonDioxideDetected);

    this.service!
      .getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .updateValue(this.State.CarbonDioxideLevel);
  }

  handleCO2DetectedGet(): boolean {
    return this.State.CarbonDioxideDetected;
  }

  handleCO2LevelGet(): number {
    return this.State.CarbonDioxideLevel;
  }
}
