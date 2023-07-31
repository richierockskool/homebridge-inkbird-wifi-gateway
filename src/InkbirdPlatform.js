import BleScanner from './BleScanner.js';
import IBSTH1Accessory from './IBSTH1Accessory.js';
import IBSPO1Accessory from './IBSPO1Accessory.js';


class InkbirdPlatform {

  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.email = config.email;
    this.password = config.password;
    this.accessToken = config.accessToken;
    this.device = config.devices;
    this.myAccessories = [];
    this.api = api;
    if(!config.email || !config.password){
      this.log.error('Valid email and password are required in order to communicate with the inkbird, please check the plugin config')
    }



    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories


    });
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
    for (const deviceDiscovered of devicesDiscovered) {
      const uuid = this.api.hap.uuid.generate(deviceDiscovered.UniqueId);
      const existingAccessory = this.accessories(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new InkbirdPlatform(this, existingAccessory);
      } else {
        this.log.info(InkbirdPlatform);
        const accessory = new this.api.platformAccessory('Inkbird Temperature Sensor', uuid);
        accessory.context.device = InkbirdPlatform;
      }
    }


    // Boot scanner and register devices to scanner new api.hap.Service.TemperatureSensor;
    this.scanner = new BleScanner(this.log);

    for (let device of this.devices = '2') {
      this.scanner.addDevice(device.deviceId);
      if (device.type === 'IBSTH1') {

        let accessory = new IBSTH1Accessory(this.log, this.scanner, device, global.homebridge);
        this.myAccessories.push(accessory);
      }
      if (device.type === 'IBSPO1') {

        let accessory = new IBSPO1Accessory(this.log, this.scanner, device, global.homebridge);
        this.myAccessories.push(accessory);
      }

    }
  }

  accessories(callback) {
    callback(this.myAccessories);


  };
}
export default InkbirdPlatform;

