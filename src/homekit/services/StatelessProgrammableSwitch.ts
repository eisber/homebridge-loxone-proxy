import { BaseService } from './BaseService';

/**
 * StatelessProgrammableSwitch
 * Maps Loxone Pushbutton events to HomeKit automations.
 * Supports single press (0), double press (1), and long press (2).
 */
export class StatelessProgrammableSwitch extends BaseService {
  State = {
    ProgrammableSwitchEvent: 0,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.StatelessProgrammableSwitch) ||
      this.accessory.addService(this.platform.Service.StatelessProgrammableSwitch);

    this.service.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
      .setProps({ validValues: [0, 1, 2] });
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Button event: ${message.value}`);
    // Loxone sends 1 for press, 0 for release. Map to HomeKit events:
    // value > 0 = single press event
    if (message.value) {
      this.State.ProgrammableSwitchEvent = 0; // Single press
      this.service!.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
        .updateValue(this.State.ProgrammableSwitchEvent);
    }
  }
}
