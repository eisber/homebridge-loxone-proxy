import { CharacteristicValue } from 'homebridge';
import { BaseService } from './BaseService';

/**
 * Faucet
 * Represents a water faucet/valve control.
 */
export class Faucet extends BaseService {
  State = {
    Active: false,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.Faucet) ||
      this.accessory.addService(this.platform.Service.Faucet);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(() => this.State.Active ? 1 : 0)
      .onSet(this.setActive.bind(this));
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Faucet update: ${message.value}`);
    this.State.Active = !!message.value;
    this.service!.getCharacteristic(this.platform.Characteristic.Active)
      .updateValue(this.State.Active ? 1 : 0);
  }

  async setActive(value: CharacteristicValue): Promise<void> {
    this.State.Active = !!value;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, value ? 'On' : 'Off');
  }
}
