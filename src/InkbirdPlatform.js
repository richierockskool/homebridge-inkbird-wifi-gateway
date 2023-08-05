import BleScanner from './BleScanner.js';
import IBSTH1Accessory from './IBSTH1Accessory.js';
import IBSPO1Accessory from './IBSPO1Accessory.js';
import IBSM1SGateway from './IBSM1SGateway.js';



export class InkbirdPlatform {

  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.email = config.email;
    this.password = config.password;
    this.accessToken = config.accessToken;
    this.device = config.devices;
    this.myAccessories = [];
    this.api = api;
    this.localUUIDs = [];
    this.showBridge=config.showBridge;
    this.meshNetwork
    this.meshId
    this.networkTopology
    this.networkTopologyId
    this.uuid = ('hap-nodejs').uuid;
    this.Service = ('hap-nodejs').Service;
    this.Characteristic = ('hap-nodejs').Characteristic;

    if(!config.email || !config.password){
      this.log.error('Valid email and password are required in order to communicate with the inkbird, please check the plugin config')
    }


    this.log.info('Starting Inkbird Platform using homebridge API', api.version)
    if(api){
      this.api=api
      this.api.on('didFinishLaunching', () => {
        log.debug('Executed didFinishLaunching callback');
        // run the method to discover / register your devices as accessories


      });
    }
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
    // If the user has configured cloud username and password then get a device list
    let cloudDevices = [];
    try {
      if (!this.config.username || !this.config.password) {
        throw new Error(platformLang.missingCreds);
      }
      this.cloudClient = new httpClient(this);
      this.accountDetails = this.cloudClient.login();
      cloudDevices = this.cloudClient.getDevices();

      // Initialise the cloud configured devices into Homebridge
      cloudDevices.forEach((device) => this.initialiseDevice(device));
    } catch (err) {
      this.cloudClient = false;
      this.accountDetails = {
        key: this.config.userkey,
      };
    }


    // Boot scanner and register devices to scanner new api.hap.Service.TemperatureSensor;
    this.scanner = new BleScanner(this.log);

    for (let device of this.devices = '2') {
      this.scanner.addDevice(device.deviceId);
      if (device.type === 'IBSM1S') {

        let accessory = new IBSM1SGateway(this.log, this.scanner, device, global.homebridge);
        this.myAccessories.push(accessory);
      }
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


  catch(err){
    this.log.error('Error updating service %s', err)
  }

}
export default InkbirdPlatform;

