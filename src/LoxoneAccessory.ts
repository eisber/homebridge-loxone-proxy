import { PlatformAccessory } from 'homebridge';
import { LoxonePlatform } from './LoxonePlatform';
import { Control } from './loxone/StructureFile';

export class LoxoneAccessory {
  Accessory: PlatformAccessory | undefined;
  Service: Record<string, unknown> = {};
  ItemStates: Record<string, { service: string; state: string }> = {};
  private displayNameCount: Record<string, number> = {}; // for name uniqueness

  constructor(readonly platform: LoxonePlatform, readonly device: Control) {
    if (this.platform.AccessoryCount >= 149) {
      this.platform.log.info(`[${device.type}Item] Max HomeKit Accessories limit reached. Item not mapped: ${device.name}`);
      return;
    }

    if (!this.isSupported()) {
      this.platform.log.debug(`[${device.type}Item] Skipping unsupported item: ${device.name}`);
      return;
    }

    this.setupAccessory();
  }

  protected isSupported(): boolean {
    return true;
  }

  private setupAccessory(): void {
    const uuid = this.platform.api.hap.uuid.generate(this.device.uuidAction);
    this.Accessory = this.getOrCreateAccessory(uuid);

    this.Accessory.context.device = this.device;
    this.Accessory.context.mapped = true;

    this.configureServices(this.Accessory);
    this.setupListeners();

    this.platform.mappedAccessories.add(this.Accessory.UUID);
    this.platform.AccessoryCount++;
  }

  private getOrCreateAccessory(uuid: string): PlatformAccessory {
    let accessory = this.platform.accessories.find((acc) => acc.UUID === uuid);
    const baseName = this.device.name ?? 'Unnamed';
    const roomName = this.device.room ?? 'Unknown';

    if (!accessory) {
      const uniqueName = this.generateUniqueName(roomName, baseName);
      accessory = new this.platform.api.platformAccessory(uniqueName, uuid);

      this.platform.api.registerPlatformAccessories('homebridge-loxone-proxy', 'LoxonePlatform', [accessory]);
      this.platform.log.debug(`[${this.device.type}Item] Adding new accessory: ${uniqueName} (original: ${this.device.name})`);
    } else {
      this.platform.log.debug(
        `[${this.device.type}Item] Restoring accessory from cache: ${accessory.displayName} (original: ${this.device.name})`,
      );
    }

    const accessoryInfoService = accessory.getService(this.platform.Service.AccessoryInformation);
    if (accessoryInfoService) {
      accessoryInfoService
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Loxone')
        .setCharacteristic(this.platform.Characteristic.Model, this.device.room)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.uuidAction)
        .setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);
    }

    return accessory;
  }

  // Override this in subclasses to add specific HomeKit services
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected configureServices(accessory: PlatformAccessory): void {
    // To be implemented by child classes
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleLoxoneCommand(value: string): void {
    this.platform.log.info(`[${this.device.name}][handleLoxoneCommand] Function Not Implemented`);
  }

  private setupListeners(): void {
    this.platform.log.debug(`[${this.device.name}] Registering Listeners for ${this.device.type}Item`);
    for (const state in this.ItemStates) {
      this.platform.LoxoneHandler.registerListenerForUUID(state, this.callBack.bind(this));
    }
  }

  /** 
   * Centralized callback handler for Loxone state changes
   */
  private callBack = (message: { uuid: string; state: string; service: string; value: string | number }): void => {
    if (message.uuid) {
      const itemState = this.ItemStates[message.uuid];
      message.service = itemState.service;
      message.state = itemState.state;
      this.callBackHandler(message);
    }
  };

  /** 
   * Override this in subclasses to handle state updates
  */
  protected callBackHandler(message: { uuid: string; state: string; service: string; value: string | number }): void {
    this.platform.log.debug(`[${this.device.name}] Callback service: ${message.service}`);
    const updateService = new Function('message', `return this.Service["${message.service}"].updateService(message);`);
    updateService.call(this, message);
  }

  /**
   * Matches device names against aliases with wildcard support
   */
  protected matchAlias(deviceName: string, alias: string): boolean {
    const aliasRegex = alias.trim().replace(/%/g, '.*').replace(/\s+/g, '\\s*');
    return new RegExp(aliasRegex, 'i').test(deviceName.trim());
  }

  /**
   * Sanitizes names by stripping invalid characters and excess spaces
   */
  public sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s']/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Ensures the generated name is unique per room/item combo (adds _1, _2 if needed)
   */
  public generateUniqueName(room: string, base: string): string {
    const sanitizedRoom = this.sanitizeName(room || 'Unknown');
    const sanitizedBase = this.sanitizeName(base || 'Unnamed');
    const fullBase = `${sanitizedRoom} ${sanitizedBase}`;
    let finalName = fullBase;

    if (this.displayNameCount[fullBase] !== undefined) {
      this.displayNameCount[fullBase]++;
      finalName = `${fullBase}_${this.displayNameCount[fullBase]}`;
    } else {
      this.displayNameCount[fullBase] = 0;
    }

    return finalName;
  }
}
