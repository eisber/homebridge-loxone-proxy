import { BaseService } from './BaseService';

/**
 * FilterMaintenance
 * Alerts when HVAC filter needs changing.
 * FilterChangeIndication: 0=OK, 1=Change needed
 */
export class FilterMaintenance extends BaseService {
  State = {
    FilterChangeIndication: 0,
    FilterLifeLevel: 100,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.FilterMaintenance) ||
      this.accessory.addService(this.platform.Service.FilterMaintenance);

    this.service.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
      .onGet(() => this.State.FilterChangeIndication);

    this.service.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
      .onGet(() => this.State.FilterLifeLevel);
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Filter update: ${message.value}%`);
    this.State.FilterLifeLevel = Math.min(100, Math.max(0, message.value));
    this.State.FilterChangeIndication = this.State.FilterLifeLevel < 10 ? 1 : 0;

    this.service!.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
      .updateValue(this.State.FilterChangeIndication);
    this.service!.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
      .updateValue(this.State.FilterLifeLevel);
  }
}
