import { CharacteristicValue } from 'homebridge';
import { BaseService } from './BaseService';

/**
 * HeaterCooler
 * Maps to Loxone heating/cooling controllers (IRoomControllerV2 alternative).
 * CurrentHeaterCoolerState: 0=Inactive, 1=Idle, 2=Heating, 3=Cooling
 * TargetHeaterCoolerState: 0=Auto, 1=Heat, 2=Cool
 */
export class HeaterCooler extends BaseService {
  State = {
    Active: true,
    CurrentTemperature: 20,
    CurrentHeaterCoolerState: 1, // Idle
    TargetHeaterCoolerState: 0, // Auto
    HeatingThresholdTemperature: 20,
    CoolingThresholdTemperature: 26,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(() => this.State.Active ? 1 : 0)
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(() => this.State.CurrentTemperature);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(() => this.State.CurrentHeaterCoolerState);

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(() => this.State.TargetHeaterCoolerState)
      .onSet(this.setTargetState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .onGet(() => this.State.HeatingThresholdTemperature)
      .onSet(this.setHeatingThreshold.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .onGet(() => this.State.CoolingThresholdTemperature)
      .onSet(this.setCoolingThreshold.bind(this));
  }

  updateService(message: { state: string; value: number }): void {
    this.platform.log.debug(`[${this.device.name}] HeaterCooler ${message.state}: ${message.value}`);

    switch (message.state) {
    case 'tempActual':
      this.State.CurrentTemperature = message.value;
      this.service!.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .updateValue(this.State.CurrentTemperature);
      this.deriveCurrentState();
      break;
    case 'tempTarget':
      this.State.HeatingThresholdTemperature = message.value;
      this.service!.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
        .updateValue(this.State.HeatingThresholdTemperature);
      this.deriveCurrentState();
      break;
    case 'operatingMode':
      // 0=Auto, 1=Heat, 2=Cool
      this.State.TargetHeaterCoolerState = Math.min(message.value, 2);
      this.service!.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
        .updateValue(this.State.TargetHeaterCoolerState);
      break;
    }
  }

  private deriveCurrentState(): void {
    if (this.State.CurrentTemperature < this.State.HeatingThresholdTemperature) {
      this.State.CurrentHeaterCoolerState = 2; // Heating
    } else if (this.State.CurrentTemperature > this.State.CoolingThresholdTemperature) {
      this.State.CurrentHeaterCoolerState = 3; // Cooling
    } else {
      this.State.CurrentHeaterCoolerState = 1; // Idle
    }
    this.service!.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .updateValue(this.State.CurrentHeaterCoolerState);
  }

  async setActive(value: CharacteristicValue): Promise<void> {
    this.State.Active = !!value;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, value ? 'On' : 'Off');
  }

  async setTargetState(value: CharacteristicValue): Promise<void> {
    this.State.TargetHeaterCoolerState = value as number;
  }

  async setHeatingThreshold(value: CharacteristicValue): Promise<void> {
    this.State.HeatingThresholdTemperature = value as number;
    this.platform.LoxoneHandler.sendCommand(this.device.uuidAction, `setTarget/${value}`);
  }

  async setCoolingThreshold(value: CharacteristicValue): Promise<void> {
    this.State.CoolingThresholdTemperature = value as number;
  }
}
