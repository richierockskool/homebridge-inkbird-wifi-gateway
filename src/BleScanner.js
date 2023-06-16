import Emitter from 'events';
import noble from '@abandonware/noble';

class BleScanner extends Emitter {

  constructor(log) {
    super();
    this.log = log;
    this.devices = new Set();
    this.once('scanStart', () => {
      log('Started BLE scanning.');
    });
    this.once('scanStop', () => {
      //Notify?
      log('Stopped BLE scanning.');
    });
    this.once('stateChange', (state) => {
      log('BLE State %s', state);
      if (state === 'poweredOn') {
        noble.startScanning([], true);
      }
    });

    // eslint-disable-next-line no-undef
    this.on('discover', (peripheral) => {
      if (this.devices.has(peripheral.address)) {
        let buffer= peripheral.advertisement.manufacturerData;
        const expectedCrc16 = buffer[6] * 256 + buffer[5];
        // eslint-disable-next-line eqeqeq
        if (expectedCrc16 != this._getCrc16(buffer.slice(0, 5))) {
          this.log('CRC Error', buffer.toString('hex'));
          return this;
        } else {
          const temperature_raw_value = buffer[1] * 256 + buffer[0];
          let data = {
            temperature: temperature_raw_value >= 0x8000 ?
              (temperature_raw_value - 0x10000) / 100 : temperature_raw_value / 100,
            humidity: (buffer[3] * 256 + buffer[2]) / 100,
            battery: buffer[7],
          };
          this.emit(peripheral.address, data);
        }
      }
      return this;
    });
  }

  destroy() {
    noble.stopScanning();
  }

  addDevice(bleMac) {
    this.devices.add(bleMac);
  }

  /**
     * @param {Buffer} buffer
     */
  _getCrc16(buffer) {
    let crc16 = 0xffff;
    for (let byte of buffer) {
      crc16 ^= byte;
      for (let i = 0; i < 8; i++) {
        const tmp = crc16 & 0x1;
        crc16 >>= 1;
        if (tmp) {
          crc16 ^= 0xa001;
        }
      }
    }
    return crc16;
  }
}

export default BleScanner;
