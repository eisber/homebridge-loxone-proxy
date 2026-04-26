import { CharacteristicValue } from 'homebridge';
import { BaseService } from './BaseService';

/**
 * AirPurifier
 * Maps Loxone ventilation to HomeKit AirPurifier.
 * CurrentAirPurifierState: 0=Inactive, 1=Idle, 2=Purifying
 * TargetAirPurifierState: 0=Manual, 1=Auto
 */
export class AirPurifier extends BaseService {
  State = {
    Active: true,
    CurrentAirPurifierState: 1, // Idle
    TargetAirPurifierState: 1, // Auto
    RotationSpeed: 0,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.AirPurifier) ||
      this.accessory.addService(this.platform.Service.AirPurifier);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(() => this.State.Active ? 1 : 0)
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .onGet(() => this.State.CurrentAirPurifierState);

    this.service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
      .onGet(() => this.State.TargetAirPurifierState)
      .onSet(this.setTargetState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(() => this.State.RotationSpeed)
      .onSet(this.setRotationSpeed.bind(this));
  }

  updateService(message: { state: string; value: number }): void {
    this.platform.log.debug(`[${this.device.name}] AirPurifier ${message.state}: ${message.value}`);

    switch (message.state) {
    case 'mode':
      this.State.TargetAirPurifierState = message.value === 0 ? 1 : 0; // 0=auto→1, else manual→0
      this.State.Active = message.value !== -1;
      break;
    case 'speed':
      this.State.RotationSpeed = message.value;
      this.State.CurrentAirPurifierState = message.value > 0 ? 2 : 1; // Purifying or Idle
      break;
    }

    this.service!.getCharacteristic(this.platform.Characteristic.Active)
      .updateValue(this.State.Active ? 1 : 0);
    this.service!.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .updateValue(this.State.CurrentAirPurifierState);
    this.service!.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
      .updateValue(this.State.TargetAirPurifierState);
    this.service!.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .updateValue(this.State.RotationSpeed);
  }

  async setActive(value: CharacteristicValue): Promise<void> {
    this.State.Active = !!value;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, value ? 'On' : 'Off');
  }

  async setTargetState(value: CharacteristicValue): Promise<void> {
    this.State.TargetAirPurifierState = value as number;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, value === 1 ? 'auto' : 'manual');
  }

  async setRotationSpeed(value: CharacteristicValue): Promise<void> {
    this.State.RotationSpeed = value as number;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, `setSpeed/${value}`);
  }
}
