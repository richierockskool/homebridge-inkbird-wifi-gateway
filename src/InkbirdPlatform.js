
import BleScanner from './BleScanner.js';
import IBSTH1Accessory from './IBSTH1Accessory.js';
import IBSPO1Accessory from './IBSPO1Accessory.js';


class InkbirdPlatform {

  constructor(log, config, api, sensor, bridge) {
    this.log = log;
    this.config=config;
    this.email=config.email;
    this.password=config.password;
    this.accessToken = config.accessToken;
    this.device = config.devices;
    this.myAccessories = [];
    this.api=api;
    this.accessories=[];
    this.sensor=new sensor(this, log);
    this.bridge=new bridge(this, log);


    // Boot scanner and register devices to scanner
    new api.hap.Service.TemperatureSensor;
    this.scanner = new BleScanner(this.log);

    for (let device of this.devices = '2') {
      this.scanner.addDevice(device.deviceId);
      if (device.type === 'IBSTH1') {
        // eslint-disable-next-line no-undef
        let accessory = new IBSTH1Accessory(this.log, this.scanner, device, global.homebridge);
        this.myAccessories.push(accessory);
      }
      if (device.type === 'IBSPO1') {
        // eslint-disable-next-line no-undef
        let accessory = new IBSPO1Accessory(this.log, this.scanner, device, global.homebridge);
        this.myAccessories.push(accessory);
      }

    }
  }

  accessories(callback) {
    callback(this.myAccessories);
  }
}


export default InkbirdPlatform;
