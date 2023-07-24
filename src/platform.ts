import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic }
  from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { InkbirdWifiGateway } from './platformAccessory';
import InkbirdPlatform from './InkbirdPlatform.js';


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
module.exports = (api: { registerPlatform: (arg0: string, arg1: typeof InkbirdWifiGateway) => void }) => {
  api.registerPlatform('homebridge-inkbird-wifi-gateway', InkbirdWifiGateway);
};
export class InkbirdPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  Accessory!: PlatformAccessory<InkbirdWifiGateway>;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing Inkbird Platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    // EXAMPLE ONLY
    // A real plugin you would discover accessories from the local network, cloud services
    // or a user-defined array in the platform config.
    const devicesDiscovered = [
      {
        UniqueId: 'IBS-M1S',
        DisplayName: 'Backyard Gateway',
      },
      {
        UniqueId: 'IBS-PO1/B',
        DisplayName: 'Pool Temperature Sensor',
      },
      {
        UniqueId: 'IBS-TH1',
        DisplayName: 'Hot Tub Temperature Sensor',
      },
    ];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const deviceDiscovered of devicesDiscovered) {

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(deviceDiscovered.UniqueId);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new InkbirdWifiGateway(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Temperature Sensor:', InkbirdWifiGateway);

        // create a new accessory
        const accessory = new this.api.platformAccessory('Inkbird Temperature Sensor', uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = InkbirdWifiGateway;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new InkbirdWifiGateway(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
      }
    }
    /**
   * REQUIRED - Homebridge will call the "configureAccessory" method once for every cached
   * accessory restored
   */
    this.configureAccessory(this.Accessory); {
      this.log.info('Loading accessory from Homebridge cache:', this.Accessory.displayName);
      this.accessories.push(this.Accessory);
    }
  }
}



export { InkbirdWifiGateway };
