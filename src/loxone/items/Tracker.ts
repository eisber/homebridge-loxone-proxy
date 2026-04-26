import { LoxoneAccessory } from '../../LoxoneAccessory';
import { OccupancySensor } from '../../homekit/services/OccupancySensor';

/**
 * Loxone Tracker Item — mapped to HomeKit OccupancySensor.
 * Presence is detected when the tracker entries list is non-empty.
 */
export class Tracker extends LoxoneAccessory {

  isSupported(): boolean {
    return !!(this.device.states && this.device.states.entries);
  }

  configureServices(): void {
    this.ItemStates = {
      [this.device.states.entries]: {
        service: 'PrimaryService',
        state: 'value',
      },
    };

    this.Service.PrimaryService = new OccupancySensor(this.platform, this.Accessory!);
  }
}
