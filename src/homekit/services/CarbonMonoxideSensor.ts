import { BaseService } from './BaseService';

/**
 * CarbonMonoxideSensor
 * Represents a CO sensor service for Homebridge.
 */
export class CarbonMonoxideSensor extends BaseService {
  State = {
    CarbonMonoxideDetected: false,
    CarbonMonoxideLevel: 0,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.CarbonMonoxideSensor) ||
      this.accessory.addService(this.platform.Service.CarbonMonoxideSensor);

    this.service.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .onGet(() => this.State.CarbonMonoxideDetected);

    this.service.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
      .onGet(() => this.State.CarbonMonoxideLevel);
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] CO Sensor update: ${message.value}`);
    this.State.CarbonMonoxideLevel = message.value;
    this.State.CarbonMonoxideDetected = message.value > 50;

    this.service!.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected)
      .updateValue(this.State.CarbonMonoxideDetected);
    this.service!.getCharacteristic(this.platform.Characteristic.CarbonMonoxideLevel)
      .updateValue(this.State.CarbonMonoxideLevel);
  }
}
