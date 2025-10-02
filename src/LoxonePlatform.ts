import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { Control } from './loxone/StructureFile';
import LoxoneHandler from './loxone/LoxoneHandler';

/**
 * LoxonePlatform
 * This class is the main constructor for the plugin.
 */
export class LoxonePlatform implements DynamicPlatformPlugin {
  public LoxoneHandler;
  public AccessoryCount = 1;
 
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = []; // restored cached accessories
  public mappedAccessories = new Set<string>(); // tracking of mapped UUIDs

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', async () => {
      await this.LoxoneInit();
    });
  }

  /**
   * Initializes the Loxone system and starts accessory mapping
   */
  async LoxoneInit(): Promise<void> {
    this.LoxoneHandler = new LoxoneHandler(this);
    await this.LoxoneHandler.connect(); // handles login and loads structureFile
    await this.mapLoxoneItems(Object.values(this.LoxoneHandler.LoxoneItems)); // Begin mapping items to accessories
    this.removeUnmappedAccessories(); // Clean up any unmapped accessories  
  }

  /**
   * Maps all Loxone items to their HomeKit accessories
   */
  async mapLoxoneItems(items: Control[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemCache: { [key: string]: any } = {};

    const ExcludedItemTypes = this.config.Exclusions?.split(',') ?? [];
    const RoomFilterList = this.config.roomfilter?.list?.split(',') ?? [];
    const RoomFilterType = this.config.roomfilter?.type || 'exclusion';

    for (const item of items) {
      try {
        const itemType = item.type;

        this.log.debug(`[mapLoxoneItems] ${item.name} UUID: ${item.uuidAction}`);

        const isRoomExcluded =
          (RoomFilterType.toLowerCase() === 'exclusion' && RoomFilterList.includes(item.room.toLowerCase())) ||
          (RoomFilterType.toLowerCase() === 'inclusion' && !RoomFilterList.includes(item.room.toLowerCase()));

        if (isRoomExcluded) {
          this.log.debug(`[mapLoxoneItem][RoomExclusion] Skipping Excluded Room: ${item.name} in room ${item.room}`);
        } else if (ExcludedItemTypes.includes(itemType)) {
          this.log.debug(`[mapLoxoneItem][ItemTypeExclusion] Skipping Excluded ItemType: ${item.name} with type ${item.type}`);
        } else {
          if (!itemCache[itemType]) {
            const itemFile = await import(`./loxone/items/${itemType}`);
            itemCache[itemType] = itemFile;
          }

          const itemFile = itemCache[itemType];
          const constructorName = Object.keys(itemFile)[0];
          new itemFile[constructorName](this, item);
        }
      } catch (error) {
        this.log.debug(error instanceof Error ? error.message : String(error));
        this.log.info(`[mapLoxoneItem] Skipping Unsupported ItemType: ${item.name} with type ${item.type}`);
      }
    }
  }

  /**
   * Removes Homebridge-cached accessories that were not re-mapped during this session.
   */
  removeUnmappedAccessories(): void {
    const pluginName = 'homebridge-loxone-proxy';
    const platformName = 'LoxonePlatform';

    this.accessories.forEach((accessory: PlatformAccessory) => {
      if (!this.mappedAccessories.has(accessory.UUID)) {
        this.log.info('[RemoveAccessory] Removing unused accessory:', accessory.displayName);
        this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
      } else {
        this.log.debug('[RemoveAccessory] Keeping mapped accessory:', accessory.displayName);
      }
    });

    this.mappedAccessories.clear(); // Reset after cleanup
  }

  /**
   * Called at Homebridge startup to restore cached accessories
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.debug('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }
}
