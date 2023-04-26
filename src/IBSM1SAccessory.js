class IBSM1SAccessory {

  constructor(log, scanner, device, homebridge) {

    this.log = log;
    this.name = device.name;
    this.currentTemperature = 0;
    this.currentRelativeHumidity = 0;
    this.currentBatteryLevel = 0;
    this.currentBatteryLowStatus;

    scanner.on(device.deviceId, this._handleDeviceEvent.bind(this));

    // Services
    const Service = homebridge.hap.Service;

    // Information Service
    this.Characteristic = homebridge.hap.Characteristic;
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(this.Characteristic.Manufacturer, 'Inkbird')
      .setCharacteristic(this.Characteristic.Model, 'IBS M1S')
      .setCharacteristic(this.Characteristic.SerialNumber, device.deviceId);

    // Battery Service
    this.batteryService = new Service.Battery(); // create a new Battery service
    this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
      .on('get', this.handleStatusLowBatteryGet.bind(this));

    // Humidity Service
    this.humidityService = new Service.HumiditySensor();
    this.humidityService.getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
      .on('get', this.handleCurrentRelativeHumidityGet.bind(this));


    // Temperature Service
    this.temperatureService = new Service.TemperatureSensor();
    this.temperatureService.getCharacteristic(this.Characteristic.CurrentTemperature)
      .on('get', this.handleCurrentTemperatureGet.bind(this));


    this.services = [];
    this.services.push(this.informationService);
    this.services.push(this.batteryService);
    this.services.push(this.humidityService);
    this.services.push(this.temperatureService);
  }

  _handleDeviceEvent(data) {
    this.currentBatteryLevel = data.battery;
    this.currentTemperature = data.temperature;
    this.currentRelativeHumidity = data.humidity;
  }

  getServices() {
    return this.services;
  }

  handleStatusLowBatteryGet(callback) {
    let val;
    if (this.currentBatteryLevel > 15) {
      val = this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    } else {
      val = this.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
    }
    callback(null, val);
  }

  handleCurrentRelativeHumidityGet(callback) {
    callback(null, this.currentRelativeHumidity);
  }

  handleCurrentTemperatureGet(callback) {
    callback(null, this.currentTemperature);
  }

}

export default IBSM1SAccessory;