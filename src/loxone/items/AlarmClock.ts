import { LoxoneAccessory } from '../../LoxoneAccessory';
import { Switch } from '../../homekit/services/Switch';

/**
 * Loxone AlarmClock Item — mapped to HomeKit Switch (on/off for alarm enabled state).
 */
export class AlarmClock extends LoxoneAccessory {

  isSupported(): boolean {
    return !!(this.device.states && this.device.states.isEnabled);
  }

  configureServices(): void {
    this.ItemStates = {
      [this.device.states.isEnabled]: {
        service: 'PrimaryService',
        state: 'active',
      },
    };

    this.Service.PrimaryService = new Switch(this.platform, this.Accessory!);
  }
}
