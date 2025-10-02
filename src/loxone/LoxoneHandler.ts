import { LoxonePlatform } from '../LoxonePlatform';
import { StructureFile, Controls, MSInfo, Control, Room, CatValue } from './StructureFile';
import LoxoneClient from 'loxone-ts-api';
import LoxoneValueEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneValueEvent.js';
import LoxoneTextEvent from 'loxone-ts-api/dist/LoxoneEvents/LoxoneTextEvent.js';
import FileMessage from 'loxone-ts-api/dist/WebSocketMessages/FileMessage';

/**
 * Represents a handler for Loxone communication.
 */
class LoxoneHandler {
  private loxoneClient: LoxoneClient;
  public msInfo: MSInfo = {} as MSInfo;
  public LoxoneItems: Controls = {} as Controls;
  public structureFile: StructureFile | undefined;
  private log: any;
  private host: string;
  private port: number;
  private tls: boolean;
  private username: string;
  private password: string;
  private uuidCallbacks: Record<string, ((val: any) => void)[]> = {};
  private uuidCache: Record<string, any> = {};

  /**
   * Creates an instance of LoxoneHandler.
   * @param {LoxonePlatform} platform - The Loxone platform instance.
   */
  constructor(platform: LoxonePlatform) {
    this.LoxoneItems = {};
    this.structureFile = undefined;
    this.log = platform.log;
    this.host = platform.config.host;
    this.port = platform.config.port;
    this.tls = platform.config.TLS;
    this.username = platform.config.username;
    this.password = platform.config.password;
    this.uuidCallbacks = {};
    this.uuidCache = {};

    this.loxoneClient = new LoxoneClient(`${this.host}:${this.port}`, this.username, this.password, {
      messageLogEnabled: false,
      logAllEvents: false,
    });

    //if (this.debug) this.loxoneClient.setLogLevel(LogLevel.DEBUG);

    this.loxoneClient.on('event_value', this.handleLoxoneEvent.bind(this));
    this.loxoneClient.on('event_text', this.handleLoxoneEvent.bind(this));
  }

  /**
   * Connects to the Loxone Miniserver.
   */
  public async connect(): Promise<void> {
    this.log.info(`Trying to connect to Miniserver at ${this.host}:${this.port} (TLS=${this.tls})`);
    await this.loxoneClient.connect();
    await this.parseLoxoneConfig();
    await this.loxoneClient.enableUpdates();
    this.log.info('[LoxoneHandler] Connected and structure file loaded');
  }

  /**
   * Parses the structure file and enriches Loxone items with room and category information.
   */
  private async parseLoxoneConfig(): Promise<void> {
    
    const config = await this.loxoneClient.getStructureFile();
    await this.loxoneClient.parseStructureFile(); // No real use yet. Lets see what we can do with it later.

    this.msInfo = config.msInfo;
    const LoxoneRooms: Record<string, Room> = { ...config.rooms };
    const LoxoneCats: Record<string, CatValue> = { ...config.cats };
    this.LoxoneItems = { ...config.controls };

    for (const uuid in this.LoxoneItems) {
      const Item = this.LoxoneItems[uuid];
      Item.room = LoxoneRooms[Item.room]?.name || 'undefined';
      Item.catIcon = LoxoneCats[Item.cat]?.image || 'undefined';
      Item.cat = LoxoneCats[Item.cat]?.type || 'undefined';
    }
  }

  /**
   * Handles incoming Loxone events and dispatches them to registered callbacks.
   * @param {LoxoneValueEvent | LoxoneTextEvent} evt - The Loxone event.
   * @private
   */
  private handleLoxoneEvent(evt: LoxoneValueEvent | LoxoneTextEvent) {
    const uuid = evt.uuid.stringValue;
    const value = (evt as any).value ?? (evt as any).text;
    this.uuidCache[uuid] = value;
    if (this.uuidCallbacks[uuid]) {
      const message = { uuid, value };
      this.uuidCallbacks[uuid].forEach(cb => cb(message));
      this.uuidCache[uuid] = message; // store in cache
    }
  }

  /**
   * Registers a listener for the specified UUID.
   * @param {string} uuid - The UUID to listen for.
   * @param {Function} callback - The callback function to be called when an event is received for the UUID.
   */
  public registerListenerForUUID(uuid: string, callback: (message: string) => void): void {
    this.loxoneClient.addUuidToWatchList(uuid);

    if (Object.prototype.hasOwnProperty.call(this.uuidCallbacks, uuid)) {
      this.uuidCallbacks[uuid].push(callback);
    } else {
      this.uuidCallbacks[uuid] = [callback];
    }

    if (uuid in this.uuidCache) {
      this.uuidCallbacks[uuid].forEach(cb => cb(this.uuidCache[uuid]));
    }
  }

  /**
   * Sends a command to the Loxone Miniserver.
   * @param {string} uuid - The UUID of the device.
   * @param {string} action - The action to be performed.
   */
  public async sendCommand(uuid: string, action: string): Promise<any> {
    return await this.loxoneClient.control(uuid, String(action))
      .catch((err: any) => this.log.error(`sendCommand failed: ${err}`));
  }

  /**
   * Gets securedDetails from item.
   * @param {string} uuid - The UUID of the device.
   */
  public async getsecuredDetails(uuid: string): Promise<FileMessage> {
    return await this.loxoneClient.sendFileCommand(`jdev/sps/io/${uuid}/securedDetails`);
  }

  /**
   * Gets the last cached value for the specified UUID.
   * @param {string} uuid - The UUID of the device.
   * @returns {string} The last cached value for the UUID.
   */
  public getLastCachedValue(uuid: string): string {
    return this.uuidCache[uuid];
  }

  /**
   * Simulates a binary event from cache for a specific UUID.
   * This allows triggering the accessory callback handler even if Loxone did not push the value.
   *
   * @param accessory - The LoxoneAccessory instance (must have ItemStates defined)
   * @param uuid - The UUID of the state to simulate
   */
  public pushCachedState(accessory: { device: any; ItemStates: any; callBackHandler: (msg: any) => void }, uuid: string): void {
    const value = this.getLastCachedValue(uuid);

    if (value === undefined) {
      this.log.debug(`[pushCachedState] No cached value found for UUID: ${uuid}`);
      return;
    }

    const itemState = accessory.ItemStates?.[uuid];
    if (!itemState) {
      this.log.warn(`[pushCachedState] UUID not registered in ItemStates for device ${accessory.device?.name}`);
      return;
    }

    const message = {
      uuid,
      state: itemState.state,
      service: itemState.service,
      value,
    };

    this.log.debug(`[pushCachedState] Pushing Cached state for ${accessory.device?.name} [${itemState.state}] = ${value}`);
    accessory.callBackHandler(message);
  }
}

export default LoxoneHandler;