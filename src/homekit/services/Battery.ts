import { BaseService } from './BaseService';

/**
 * Battery
 * Exposes battery level and low-battery status for wireless Loxone devices.
 */
export class Battery extends BaseService {
  State = {
    BatteryLevel: 100,
    StatusLowBattery: 0, // 0 = Normal, 1 = Low
    ChargingState: 2, // 0 = Not Charging, 1 = Charging, 2 = Not Chargeable
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery);

    this.service.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(() => this.State.BatteryLevel);

    this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(() => this.State.StatusLowBattery);

    this.service.getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(() => this.State.ChargingState);
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Battery update: ${message.value}%`);
    this.State.BatteryLevel = Math.min(100, Math.max(0, message.value));
    this.State.StatusLowBattery = this.State.BatteryLevel < 15 ? 1 : 0;

    this.service!.getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .updateValue(this.State.BatteryLevel);
    this.service!.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .updateValue(this.State.StatusLowBattery);
  }
}
