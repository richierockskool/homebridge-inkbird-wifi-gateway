
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { HomebridgeInkbirdWifiGateway } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class InkbirdWifiGateway {
  protected service: Service;



  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  public exampleStates = {
    On: false,
    CurrentTemperature: -270,
  };

  static existingAccessory: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCurrentTemperature: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Characteristic: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleManufacturerGet: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleModelGet: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleNameGet: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSerialNumberGet: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleFirmwareRevisionGet: any;


  constructor(
    protected readonly platform: HomebridgeInkbirdWifiGateway,
    protected readonly accessory: PlatformAccessory,

  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.TemperatureSensor)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'InkBird')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.UUID)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'InkBird-Serial')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, 'InkBird')
      .setCharacteristic(this.platform.Characteristic.Name, 'InkBird');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
    this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.CurrentTemperature, accessory.context.device.TemperatureSensor);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onSet(this.setCurrentTemperature.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getCurrentTemperature.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onSet(this.setCurrentTemperature.bind(this));       // SET - bind to the 'setBrightness` method below

    this.service.getCharacteristic(this.Characteristic.Manufacturer)
      .onGet(this.handleManufacturerGet.bind(this));

    this.service.getCharacteristic(this.Characteristic.Model)
      .onGet(this.handleModelGet.bind(this));

    this.service.getCharacteristic(this.Characteristic.Name)
      .onGet(this.handleNameGet.bind(this));
    this.service.getCharacteristic(this.Characteristic.SerialNumber)
      .onGet(this.handleSerialNumberGet.bind(this));
    this.service.getCharacteristic(this.Characteristic.FirmwareRevision)
      .onGet(this.handleFirmwareRevisionGet.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */



    // Example: add two "motion sensor" services to the accessory
    const temperatureSensorOneService = this.accessory.getService('Temperature Sensor One Name') ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, 'Temperature Sensor One Name', 'IBS-PO1/B');

    const temperatureSensorTwoService = this.accessory.getService('Temperature Sensor Two Name') ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, 'Temperature Sensor Two Name', 'IBS-TH1');

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    let temperatureDetected = false;
    setInterval(() => {
      // EXAMPLE - inverse the trigger
      temperatureDetected = !temperatureDetected;

      // push the new value to HomeKit
      temperatureSensorOneService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, temperatureDetected);
      temperatureSensorTwoService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, !temperatureDetected);

      this.platform.log.debug('Triggering temperatureSensorOneService:', !temperatureDetected);
      this.platform.log.debug('Triggering temperatureSensorTwoService:', !temperatureDetected);
    }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;

    this.platform.log.debug('Triggered GET CurrentTemperature', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.


   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.exampleStates.On;
    this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    //throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    const currentValue = -270;

    return currentValue;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */


  async setCurrentTemperature(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.exampleStates.CurrentTemperature = value as number;

    this.platform.log.debug('GET CurrentTemperatue -> ', value);
  }

}