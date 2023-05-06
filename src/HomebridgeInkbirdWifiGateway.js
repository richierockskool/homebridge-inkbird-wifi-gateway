/* eslint-disable no-undef */
import BleScanner from './BleScanner.js';

class HomebridgeInkbirdWifiGateway {

  constructor(log, config) {
    this.log = log;
    this.accessToken = config.accessToken;
    const IBSM1SAccessory = this.device = config.devices;
    this.myAccessories = [];

    // Boot scanner and register devices to scanner
    this.scanner = new BleScanner(this.log);
    for (let device of this.devices = '0') {
      this.scanner.addDevice(device.deviceId);
      if (device.type === 'IBSM1S') {
        let accessory = new IBSM1SAccessory(this.log, this.scanner, device, global.homebridge);
        this.myAccessories.push(accessory);
      }
    }
  }

  accessories(callback) {
    callback(this.myAccessories);
  }
}

export default HomebridgeInkbirdWifiGateway;