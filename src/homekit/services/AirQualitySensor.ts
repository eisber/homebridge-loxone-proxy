import { BaseService } from './BaseService';

/**
 * AirQualitySensor
 * Represents an air quality sensor for Homebridge (VOC/PM2.5).
 */
export class AirQualitySensor extends BaseService {
  State = {
    AirQuality: 0,
    VOCDensity: 0,
  };

  setupService(): void {
    this.service =
      this.accessory.getService(this.platform.Service.AirQualitySensor) ||
      this.accessory.addService(this.platform.Service.AirQualitySensor);

    this.service.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.handleAirQualityGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.VOCDensity)
      .onGet(this.handleVOCDensityGet.bind(this));
  }

  updateService(message: { value: number }): void {
    this.platform.log.debug(`[${this.device.name}] Callback state update for AirQuality Sensor: ${message.value}`);
    this.State.VOCDensity = message.value;
    // Map VOC ppb to HomeKit AirQuality enum (0=Unknown, 1=Excellent, 2=Good, 3=Fair, 4=Inferior, 5=Poor)
    this.State.AirQuality = this.vocToAirQuality(message.value);

    this.service!
      .getCharacteristic(this.platform.Characteristic.AirQuality)
      .updateValue(this.State.AirQuality);

    this.service!
      .getCharacteristic(this.platform.Characteristic.VOCDensity)
      .updateValue(this.State.VOCDensity);
  }

  private vocToAirQuality(voc: number): number {
    if (voc <= 300) {
      return 1;
    } // Excellent
    if (voc <= 600) {
      return 2;
    } // Good
    if (voc <= 1000) {
      return 3;
    } // Fair
    if (voc <= 1500) {
      return 4;
    } // Inferior
    return 5; // Poor
  }

  handleAirQualityGet(): number {
    return this.State.AirQuality;
  }

  handleVOCDensityGet(): number {
    return this.State.VOCDensity;
  }
}
