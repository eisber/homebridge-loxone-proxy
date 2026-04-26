import { CharacteristicValue } from 'homebridge';
import { BaseService } from './BaseService';

/**
 * Door
 * Represents a door position sensor/controller.
 * CurrentDoorState: 0=Open, 1=Closed, 2=Opening, 3=Closing, 4=Stopped
 * TargetDoorState: 0=Open, 1=Closed
 */
export class Door extends BaseService {
  State = {
    CurrentPosition: 0,
    TargetPosition: 0,
    PositionState: 2, // 0=Decreasing, 1=Increasing, 2=Stopped
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.Door) ||
      this.accessory.addService(this.platform.Service.Door);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(() => this.State.CurrentPosition);

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(() => this.State.TargetPosition)
      .onSet(this.setTargetPosition.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(() => this.State.PositionState);
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Door update: ${message.value}`);
    this.State.CurrentPosition = Math.round(message.value * 100);
    this.State.TargetPosition = this.State.CurrentPosition;
    this.State.PositionState = 2; // Stopped

    this.service!.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .updateValue(this.State.CurrentPosition);
    this.service!.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .updateValue(this.State.TargetPosition);
    this.service!.getCharacteristic(this.platform.Characteristic.PositionState)
      .updateValue(this.State.PositionState);
  }

  async setTargetPosition(value: CharacteristicValue): Promise<void> {
    this.State.TargetPosition = value as number;
    const loxoneValue = (value as number) / 100;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, loxoneValue.toString());
  }
}
