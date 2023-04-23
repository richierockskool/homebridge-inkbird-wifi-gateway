// Implements the InkbirdBtTHSensorAccessory class that manages the bluetooth sensor
//
//-----------------------------------------------------------------------
// Date        Author      Change
//-----------------------------------------------------------------------
//

//-----------------------------------------------------------------------
// Global variables
//-----------------------------------------------------------------------

// variables have to be declared explicitly
'use strict';

/** @const {Object} ESTATES               Enumeration for state machine */
const ESTATES = {NOT_READY: 1, STATUS_INVALID: 2, SCANNING: 3, READY4ANSWER: 4};
/** @const {Object} DDMODELS              Dictionary of models containing a dictionary with the config data of a model */
const DDMODELS = {'IBS-MS' : {datalength : 9, localName : 'sps', serviceDat : undefined, serviceUuids : 'fff0'},
  'not in list - try it anyway' : 0};
/** @const {Object} ELOGLEVEL              Enumeration for log levels */
const ELOGLEVEL = {MIN:0, FATAL: 0, ERROR: 1, WARNING: 2, INFO: 3, DEBUG: 4, MAX:4};
/** @const {Object} STRLOGLEVEL            Strings for log levels */
const STRLOGLEVEL = ['Fatal', 'Error', 'Warning', 'Info', 'Debug'];

//-----------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------

// from JavaScript
// eslint-disable-next-line max-len
import { on, stopScanning, startScanning } from '@abandonware/noble/index';                                              // for bluetooth low energy
import moment from 'moment';                                                                // for timestamps for Eve history
import { inherits } from 'util';                                                         // for custom characteristic/service definition

// from InkbirdBtTHSensor
import CRC16_0x18005 from './CRC16_0x18005';

//-----------------------------------------------------------------------
// Classes
//-----------------------------------------------------------------------

/**
 * Main class for the management of the Inkbird temperature and humidity sensors accessory
 */
class cInkbirdBtTHSensorAccessory {
  //-----------------------------------------------------------------------
  /**
    * The accessory constructor initializes the class, loads the config, creates the required services
    * and starts the auto-refresh feature if configured.
    *
    * @param {Object} cLog                Pointer to logging class
    * @param {Object} dConfig             Configuration for the plugin
    * @returns {void}                     nothing
    */
  constructor(cLog, dConfig) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    if (dConfig.loglevel >= ELOGLEVEL.DEBUG) {
      cLog('Start Initialization');
    }

    // Store and initialize values
    self.cLog = cLog;
    self.dConfig = dConfig;
    self.cRawStatus = undefined;                                                      // Cached raw status from doCyclicGetStatus
    self.fTemperature = undefined;                                                      // Temperature in degree Celsius
    self.fHumidity = undefined;                                                      // Relative humidity in %
    self.bExternalSensor = undefined;                                                      // true, if external sensor is connected
    self.fBatteryLevel = undefined;                                                      // Battery level in %
    self.eState = ESTATES.NOT_READY;                                              // State of the state machine (Hardware not ready)
    self.eOldState = undefined;                                                      // State of the state machine in last call
    // eslint-disable-next-line max-len
    self.iTimeoutId = undefined;                                                      // Id of a started timeout to find it again (No Timeout started yet)
    self.fCallbackTemperature = undefined;                                                      // Callback for temperature
    self.fCallbackHumidity = undefined;                                                      // Callback for humidity
    self.fCallbackExtSensor = undefined;                                                      // Callback for external sensor
    self.fCallbackBatteryLevel = undefined;                                                      // Callback for battery level
    self.fCallbackLowBattery = undefined;                                                      // Callback for low battery
    self.bQueryStarted = false;                                                          // true if a query was started to read a value
    self.bHWReady = false;                                                          // Shows if hardware is ready
    self.dcCustomCharacteristic= {};                                                             // Self-defined characteristics

    // Analyse config, use config first, if not set then fall back to default values
    self.iLogLevel = dConfig.loglevel || ELOGLEVEL.INFO;                             // Show infos, warnings, errors and fatal
    self.strName = dConfig.name;
    self.strModel = dConfig.model || '';
    self.dSensorCfg = DDMODELS[self.strModel];
    // eslint-disable-next-line eqeqeq
    if (self.dSensorCfg == undefined) {
      self.Log(ELOGLEVEL.ERROR, `Invalid sensor type ${self.strModel}. See README.md for valid types!`);
    }
    self.strMAC = (dConfig.mac_address || '').toLowerCase();
    self.iUpdateInt = dConfig.update_interval;

    // Create services and characteristics
    // LogLevel
    self.dcCustomCharacteristic.LogLevel = function () {
      // eslint-disable-next-line no-undef
      cCharacteristic.call(this, 'Log Level', global.cUUIDGen.generate('InkbirdBtTHSensorAccessory.LogLevel'));
      this.setProps(
        {
          // eslint-disable-next-line no-undef
          format: cCharacteristic.Formats.UINT8,
          maxValue: ELOGLEVEL.MAX,
          minValue: ELOGLEVEL.MIN,
          minStep: 1,
          // eslint-disable-next-line no-undef
          perms: [cCharacteristic.Perms.READ, cCharacteristic.Perms.WRITE, cCharacteristic.Perms.NOTIFY],
        });
      this.value = 2;
    };
    // eslint-disable-next-line no-undef
    inherits(self.dcCustomCharacteristic.LogLevel, cCharacteristic);

    // External sensor
    self.dcCustomCharacteristic.ExternalSensor = function () {
      // eslint-disable-next-line no-undef
      cCharacteristic.call(this, 'External Sensor', global.cUUIDGen.generate('InkbirdBtTHSensorAccessory.ExternalSensor'));
      this.setProps(
        {
          // eslint-disable-next-line no-undef
          format: cCharacteristic.Formats.BOOL,
          // eslint-disable-next-line no-undef
          perms: [cCharacteristic.Perms.READ, cCharacteristic.Perms.NOTIFY],
        });
      this.value = undefined;
    };
    // eslint-disable-next-line no-undef
    inherits(self.dcCustomCharacteristic.ExternalSensor, cCharacteristic);

    // eslint-disable-next-line no-undef
    self.cAccessoryInfo = new cService.AccessoryInformation();
    // eslint-disable-next-line no-undef
    self.cTemperatureService = new cService.TemperatureSensor(self.strName);
    // eslint-disable-next-line no-undef
    self.cHumidityService = new cService.HumiditySensor(self.strName);
    // eslint-disable-next-line no-undef
    self.cBatteryService = new cService.BatteryService(self.strName);
    // eslint-disable-next-line max-len, no-undef, eqeqeq
    self.cEveHistoryService = new cFakeGatoHistoryService('weather', this, (dConfig.storage != 'googleDrive' ? { storage: 'fs' } : { storage: 'googleDrive', path: 'homebridge' }));

    // Set Noble events
    on('stateChange', state => self.bHWReady = (state === 'poweredOn'));
    on('discover', cPeripheral => self.RunStatemachine(false, true, cPeripheral));

    // Start the autorefresh if configured
    // eslint-disable-next-line eqeqeq
    if (self.iUpdateInt != undefined) {  // If interval is set then
      // Set minimum to 5 seconds
      self.iUpdateInt = Math.max(5, self.iUpdateInt);
      self.Log(ELOGLEVEL.INFO, `Update Intervall ${self.iUpdateInt}s.`);
    }
    self.RunStatemachine(false, false, undefined);
    self.Log(ELOGLEVEL.DEBUG, 'End Initialization');
  }

  /**
    * Function to get the current temperature of the sensor.
    *
    * @param {function} fCallback         Callback function pointer to give back the value once you got it
    * @returns {void}                     Nothing (value is given back via callback function)
    */
  getTemperature(fCallback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    self.Log(ELOGLEVEL.DEBUG, 'Start getting temperature');

    // Store callback function and run statemachine
    self.fCallbackTemperature = fCallback;
    self.bQueryStarted = true;
    self.RunStatemachine(false, false, undefined);
    return;
  }

  /**
    * Function to update the current temperature of the sensor.
    *
    * @param {Object} cError              Error. Not used here. Only for equivalent parameters to homebridge callback function
    * @param {boolean} fValue             Value to be set
    * @returns {void}                     Nothing
    */
  updateTemperature(cError, fValue) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    // eslint-disable-next-line eqeqeq
    if (cError == null) {
      // eslint-disable-next-line no-undef
      self.cTemperatureService.updateCharacteristic(global.cCharacteristic.CurrentTemperature, fValue);
    }
    return;
  }

  /**
    * Function to get the current relative humidity of the sensor.
    *
    * @param {function} fCallback         Callback function pointer to give back the value once you got it
    * @returns {void}                     Nothing (value is given back via callback function)
    */
  getHumidity(fCallback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    self.Log(ELOGLEVEL.DEBUG, 'Start getting humidity');

    // Store callback function and run statemachine
    self.fCallbackHumidity = fCallback;
    self.bQueryStarted = true;
    self.RunStatemachine(false, false, undefined);
    return;
  }

  /**
    * Function to update the current relative humidity of the sensor.
    *
    * @param {Object} cError              Error. Not used here. Only for equivalent parameters to homebridge callback function
    * @param {boolean} fValue             Value to be set
    * @returns {void}                     Nothing
    */
  updateHumidity(cError, fValue) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    // eslint-disable-next-line eqeqeq
    if (cError == null) {
      // eslint-disable-next-line no-undef
      self.cHumidityService.updateCharacteristic(global.cCharacteristic.CurrentRelativeHumidity, fValue);
    }
    return;
  }

  /**
    * Function to get the external sensor flag of the sensor.
    *
    * @param {function} fCallback         Callback function pointer to give back the value once you got it
    * @returns {void}                     Nothing (value is given back via callback function)
    */
  getExternalSensor(fCallback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    self.Log(ELOGLEVEL.DEBUG, 'Start getting external sensor flag');

    // Store callback function and run statemachine
    self.fCallbackExtSensor = fCallback;
    self.bQueryStarted = true;
    self.RunStatemachine(false, false, undefined);
    return;
  }

  /**
    * Function to update the external sensor flag of the sensor.
    *
    * @param {Object} cError              Error. Not used here. Only for equivalent parameters to homebridge callback function
    * @param {boolean} bValue             Value to be set
    * @returns {void}                     Nothing
    */
  updateExternalSensor(cError, bValue) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    // eslint-disable-next-line eqeqeq
    if (cError == null) {
      self.cTemperatureService.updateCharacteristic(self.dcCustomCharacteristic.ExternalSensor, bValue);
    }
    return;
  }

  /**
    * Function to get the battery level of the sensor.
    *
    * @param {function} fCallback         Callback function pointer to give back the value once you got it
    * @returns {void}                     Nothing (value is given back via callback function)
    */
  getBatteryLevel(fCallback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    self.Log(ELOGLEVEL.DEBUG, 'Start getting battery level');

    // Store callback function and run statemachine
    self.fCallbackBatteryLevel = fCallback;
    self.bQueryStarted = true;
    self.RunStatemachine(false, false, undefined);
    return;
  }

  /**
    * Function to update the battery level of the sensor.
    *
    * @param {Object} cError              Error. Not used here. Only for equivalent parameters to homebridge callback function
    * @param {boolean} fValue             Value to be set
    * @returns {void}                     Nothing
    */
  updateBatteryLevel(cError, fValue) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    // eslint-disable-next-line eqeqeq
    if (cError == null) {
      // eslint-disable-next-line no-undef
      self.cBatteryService.updateCharacteristic(global.cCharacteristic.BatteryLevel, fValue);
    }
    return;
  }

  /**
    * Function to get the low battery status of the sensor.
    *
    * @param {function} fCallback         Callback function pointer to give back the value once you got it
    * @returns {void}                     Nothing (value is given back via callback function)
    */
  getLowBatteryStatus(fCallback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    self.Log(ELOGLEVEL.DEBUG, 'Start getting battery low status');

    // Store callback function and run statemachine
    self.fCallbackLowBattery = fCallback;
    self.bQueryStarted = true;
    self.RunStatemachine(false, false, undefined);
    return;
  }

  /**
    * Function to update the low battery status of the sensor.
    *
    * @param {Object} cError              Error. Not used here. Only for equivalent parameters to homebridge callback function
    * @param {boolean} bValue             Value to be set
    * @returns {void}                     Nothing
    */
  updateLowBatteryStatus(cError, bValue) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    // eslint-disable-next-line eqeqeq
    if (cError == null) {
      // eslint-disable-next-line no-undef
      self.cBatteryService.updateCharacteristic(global.cCharacteristic.StatusLowBattery, bValue);
    }
    return;
  }

  /**
    * Function to set the log level
    *
    * @param {number} iLogLevel           New log level to be set
    * @param {function} fCallback         Callback function pointer to give back the value set
    * @returns {void}                     Nothing
    */
  setLogLevel(iLogLevel, fCallback) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    if (iLogLevel < ELOGLEVEL.MIN) {  // Log level to low
      self.Log(ELOGLEVEL.WARNING, `Log level ${iLogLevel} too low. Setting to ${ELOGLEVEL.MIN} (${STRLOGLEVEL[ELOGLEVEL.MIN]}).`);
      self.iLogLevel = ELOGLEVEL.MIN;
    } else if (iLogLevel > ELOGLEVEL.MAX) {  // Log level to high
      self.Log(ELOGLEVEL.WARNING, `Log level ${iLogLevel} too high. Setting to ${ELOGLEVEL.MAX} (${STRLOGLEVEL[ELOGLEVEL.MAX]}).`);
      self.iLogLevel = ELOGLEVEL.MAX;
    } else {  // Ok. Always print log
      self.cLog(`Setting log level to ${STRLOGLEVEL[iLogLevel]}.`);
      self.iLogLevel = iLogLevel;
    }

    fCallback(null, self.iLogLevel);
    return;
  }

  /**
    * Function called by homebridge to get the services of the accessory
    *
    * @returns {Object}                   A list of the available services
    */
  getServices() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;
    self.Log(ELOGLEVEL.DEBUG, 'Getting available services');

    //-----------------------------------------------------------
    // Accessory Info service
    //------------------------
    // eslint-disable-next-line no-undef
    self.cAccessoryInfo.setCharacteristic(global.cCharacteristic.Manufacturer, 'INKBIRD');
    // eslint-disable-next-line no-undef
    self.cAccessoryInfo.setCharacteristic(global.cCharacteristic.SerialNumber, self.strMAC);
    // eslint-disable-next-line no-undef
    self.cAccessoryInfo.setCharacteristic(global.cCharacteristic.Identify, false);
    // eslint-disable-next-line no-undef
    self.cAccessoryInfo.setCharacteristic(global.cCharacteristic.Name, self.strName);
    // eslint-disable-next-line no-undef
    self.cAccessoryInfo.setCharacteristic(global.cCharacteristic.Model, self.strModel);
    // eslint-disable-next-line no-undef
    self.cAccessoryInfo.setCharacteristic(global.cCharacteristic.FirmwareRevision, global.strFWVersion);

    //-----------------------------------------------------------
    // Temperature service
    //------------------------
    self.cTemperatureService
      // eslint-disable-next-line no-undef
      .getCharacteristic(global.cCharacteristic.CurrentTemperature)
      .setProps({minValue: -273.15, maxValue: 1000.0})
      .on('get', self.getTemperature.bind(self));
    self.cTemperatureService
      .addCharacteristic(self.dcCustomCharacteristic.ExternalSensor)
      .on('get', self.getExternalSensor.bind(self));

    //-----------------------------------------------------------
    // Humidity service
    //------------------------
    self.cHumidityService
      // eslint-disable-next-line no-undef
      .getCharacteristic(global.cCharacteristic.CurrentRelativeHumidity)
      .on('get', self.getHumidity.bind(self));
    self.cHumidityService
      .addCharacteristic(self.dcCustomCharacteristic.LogLevel)
      .on('get', (fCallback => fCallback(null, self.iLogLevel)).bind(self))
      .on('set', self.setLogLevel.bind(self));

    //-----------------------------------------------------------
    // Battery service
    //------------------------
    self.cBatteryService
      // eslint-disable-next-line no-undef
      .getCharacteristic(global.cCharacteristic.BatteryLevel)
      .on('get', self.getBatteryLevel.bind(self));
    self.cBatteryService
      // eslint-disable-next-line no-undef
      .getCharacteristic(global.cCharacteristic.ChargingState)
      .on('get', (fCallback => fCallback(null, false)).bind(self));
    self.cBatteryService
      // eslint-disable-next-line no-undef
      .getCharacteristic(global.cCharacteristic.StatusLowBattery)
      .on('get', self.getLowBatteryStatus.bind(self));

    //-----------------------------------------------------------
    // Eve history service
    //------------------------
    // Nothing to do


    return [self.cAccessoryInfo, self.cTemperatureService, self.cHumidityService, self.cBatteryService, self.cEveHistoryService];
  }

  /**
    * Function log a message to the homebridge log if it is important enough
    *
    * @param {*} iLevel                   Maximum log level that will be logged
    * @param {*} strMessage               Message
    * @returns {void}                     Nothing
    */
  Log(iLevel, strMessage) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    if (iLevel <= self.iLogLevel) {
      self.cLog(`${STRLOGLEVEL[iLevel]} - ${strMessage}`);
    }
    return;
  }

  /**
    * Function parses the status and stores the values.
    *
    * @returns {void}                     Nothing
    */
  parseStatus() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    self.fTemperature = undefined;
    self.fHumidity = undefined;
    self.bExternalSensor = undefined;
    self.fBatteryLevel = undefined;

    // Check if value is present
    // eslint-disable-next-line eqeqeq
    if (self.cRawStatus != undefined) {  // Calculate CRC16 ModBus
      self.iCRC = CRC16_0x18005(self.cRawStatus, 0, 4, true, true, 0xFFFF, 0x0);
      // eslint-disable-next-line eqeqeq
      if ((self.dSensorCfg != 0) && (self.iCRC != self.cRawStatus.readUIntLE(5, 2))) {
        // eslint-disable-next-line max-len
        self.Log(ELOGLEVEL.WARNING, `CRC Error (expected ${self.iCRC.toString(16)}, found ${self.cRawStatus.readUIntLE(5, 2).toString(16)}). Ignoring data!!`);
        return;
      }

      self.fTemperature = self.cRawStatus.readIntLE(0, 2)/100;
      self.fHumidity = self.cRawStatus.readUIntLE(2, 2)/100;
      // eslint-disable-next-line eqeqeq
      self.bExternalSensor = self.cRawStatus.readUIntLE(4, 1) == 1;
      self.fBatteryLevel = self.cRawStatus.readUIntLE(7, 1);
      // eslint-disable-next-line max-len
      self.Log(ELOGLEVEL.DEBUG, `CRC Ok (${self.iCRC.toString(16)}), temperature ${self.fTemperature}°C, relative humidity ${self.fHumidity}%, ${self.bExternalSensor ? 'external' : 'internal'} sensor`);
      self.Log(ELOGLEVEL.DEBUG, `battery level ${self.fBatteryLevel}%, battery ${self.fBatteryLevel < 10 ? 'low' : 'ok'}`);

      // Store values in for Eve history function
      self.cEveHistoryService.addEntry({ time: moment().unix(), temp: self.fTemperature, humidity: self.fHumidity, pressure: 0.0});
    }
    return;
  }

  /**
    * Function that stops a running timeout
    *
    * @returns {void}                     Nothing
    */
  stopTimeout() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    // eslint-disable-next-line eqeqeq
    if (self.iTimeoutId != undefined) {  // If there's still a timeout running, then stop it
      // eslint-disable-next-line no-undef
      clearTimeout(self.iTimeoutId);
      self.iTimeoutId = undefined;
    }
    return;
  }

  /**
    * State machine to do the reading / cyclic reading via BLE
    *
    * @param {boolean} bTimeout           Will be set if the statemachine is run by the runout timeout, otherwise it's false
    * @param {boolean} bDiscover          Will be set if the statemachine is run by the discover of a peripheral
    * @param {Object}  cPeripheral        Object with the data of the discovered peripheral
    * @returns {void}                     Nothing
    */
  RunStatemachine(bTimeout, bDiscover, cPeripheral) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    var self = this;

    if (bTimeout) {
      self.stopTimeout();
    }

    // eslint-disable-next-line eqeqeq
    if ((!self.bHWReady) && (self.eState != ESTATES.NOT_READY)) {  // If hardware not ready, then reset
      self.Log(ELOGLEVEL.FATAL, 'Bluetooth low energy hardware went off');
      stopScanning();
      self.eState = ESTATES.NOT_READY;
    }

    do {  // Store actual state to see any change later
      self.eOldState = self.eState;
      // The state machine
      switch (self.eState) {
        case ESTATES.NOT_READY:
          // The bluetooth hardware is not ready
          self.stopTimeout();

          if (self.bHWReady) {  // If the hardware is ready, go to status invalid
            self.Log(ELOGLEVEL.DEBUG, 'Bluetooth low energy hardware powered on');
            self.eState = ESTATES.STATUS_INVALID;
          } else {  // If the hardware is not ready, then try again later (5s)
            self.Log(ELOGLEVEL.WARNING, 'Waiting for bluetooth low energy hardware to power on');
            // eslint-disable-next-line no-undef
            self.iTimeoutId = setInterval(self.RunStatemachine.bind(self), 5000, true, false, undefined);
          }
          break;

        case ESTATES.STATUS_INVALID:
          // The status is invalid
          self.stopTimeout();

          // eslint-disable-next-line max-len, eqeqeq
          if ((self.bQueryStarted) || (self.iUpdateInt != undefined)) {  // If a callback is waiting to be answered, or the auto-update is enabled, then start scanning (Timeout 5s)
            self.Log(ELOGLEVEL.DEBUG, 'Start scanning for bluetooth sensor');
            startScanning();
            // eslint-disable-next-line no-undef
            self.iTimeoutId = setInterval(self.RunStatemachine.bind(self), 15000, true, false, undefined);
            self.eState = ESTATES.SCANNING;
          }
          break;

        case ESTATES.SCANNING:
          // Bluetooth adapter is scanning

          // Reset Status
          self.cRawStatus = undefined;

          // eslint-disable-next-line eqeqeq
          if ((bDiscover) && (self.dSensorCfg != undefined)) {  // Discover - found a BLE device
            // eslint-disable-next-line eqeqeq
            if ((cPeripheral.address === self.strMAC) || (self.strMAC == '')) {  // If MAC-address fits, or MAC not set
              // Plausibility check
              // eslint-disable-next-line eqeqeq
              if ((self.dSensorCfg == 0) ||
                        // eslint-disable-next-line eqeqeq
                        ((cPeripheral.advertisement.manufacturerData.length == self.dSensorCfg.datalength) &&
                         // eslint-disable-next-line eqeqeq
                         (cPeripheral.advertisement.localName == self.dSensorCfg.localName) &&
                         // eslint-disable-next-line eqeqeq
                         (cPeripheral.advertisement.serviceDat == self.dSensorCfg.serviceDat) &&
                         // eslint-disable-next-line max-len, eqeqeq
                         (cPeripheral.advertisement.serviceUuids == self.dSensorCfg.serviceUuids))) {  // If type is invalid, no check possible but let it through to easily support new compatible types
                // Otherwise check the values for plausibility
                // Store manufacturer data
                self.cRawStatus = cPeripheral.advertisement.manufacturerData;
                self.Log(ELOGLEVEL.INFO, `Peripheral with MAC ${cPeripheral.address} found - stop scanning`);
                self.Log(ELOGLEVEL.DEBUG, `ManufacturerData is ${self.cRawStatus.toString('hex')}`);
              // eslint-disable-next-line eqeqeq
              } else if (self.strMAC != '') {
                // eslint-disable-next-line max-len
                let strExpected = `(${self.dSensorCfg.datalength}, ${self.dSensorCfg.localName}, ${JSON.stringify(self.dSensorCfg.serviceDat, null, 2)}, ${self.dSensorCfg.serviceUuids})`;
                // eslint-disable-next-line max-len
                let strFound = `(${cPeripheral.advertisement.manufacturerData.length}, ${cPeripheral.advertisement.localName}, ${JSON.stringify(cPeripheral.advertisement.serviceDat, null, 2)}, ${cPeripheral.advertisement.serviceUuids})`;
                // eslint-disable-next-line max-len
                self.Log(ELOGLEVEL.ERROR, `Peripheral with MAC ${cPeripheral.address} found, but plausibility check failed. Expected ${strExpected}, but found ${strFound}`);
              }
            }
          }

          // eslint-disable-next-line eqeqeq
          if ((bTimeout) || (self.cRawStatus != undefined)) {  // Timeout or finished

            // eslint-disable-next-line eqeqeq
            if (self.cRawStatus == undefined) {
              self.Log(ELOGLEVEL.WARNING, 'Peripheral NOT found - stop scanning');
            }

            // Stop scanning
            stopScanning();
            self.stopTimeout();

            // Store manufacturer data, update Apple Home and set query finished
            self.parseStatus();
            self.fCallbackTemperature = self.fCallbackTemperature || self.updateTemperature;
            self.fCallbackHumidity = self.fCallbackHumidity || self.updateHumidity;
            self.fCallbackExtSensor = self.fCallbackExtSensor || self.updateExternalSensor;
            self.fCallbackBatteryLevel = self.fCallbackBatteryLevel || self.updateBatteryLevel;
            self.fCallbackLowBattery = self.fCallbackLowBattery || self.updateLowBatteryStatus;
            self.bQueryStarted = false;

            // start timeout for validity of data and go to next state
            // eslint-disable-next-line no-undef
            self.iTimeoutId = setInterval(self.RunStatemachine.bind(self), (self.iUpdateInt || 10) * 1000, true, false, undefined);
            self.eState = ESTATES.READY4ANSWER;
          }

          break;

        case ESTATES.READY4ANSWER:
          // Status is read or device unreachable

          // Do all the callbacks
          // eslint-disable-next-line eqeqeq
          if (self.fCallbackTemperature != undefined) {  // Temperature callback
            self.Log(ELOGLEVEL.INFO, `Sending temperature ${self.fTemperature}°C`);
            self.fCallbackTemperature(null, self.fTemperature);
            self.fCallbackTemperature = undefined;
          }
          // eslint-disable-next-line eqeqeq
          if (self.fCallbackHumidity != undefined) {  // Humidity callback
            self.Log(ELOGLEVEL.INFO, `Sending relative humidity ${self.fHumidity}%`);
            self.fCallbackHumidity(null, self.fHumidity);
            self.fCallbackHumidity = undefined;
          }
          // eslint-disable-next-line eqeqeq
          if (self.fCallbackExtSensor != undefined) {  // External sensor callback
            self.Log(ELOGLEVEL.INFO, self.bExternalSensor ? 'Sending external sensor' : 'Sending internal sensor');
            self.fCallbackExtSensor(null, self.bExternalSensor);
            self.fCallbackExtSensor = undefined;
          }
          // eslint-disable-next-line eqeqeq
          if (self.fCallbackBatteryLevel != undefined) {  // BatteryLevel callback
            self.Log(ELOGLEVEL.INFO, `Sending battery level ${self.fBatteryLevel}%`);
            self.fCallbackBatteryLevel(null, self.fBatteryLevel);
            self.fCallbackBatteryLevel = undefined;
          }
          // eslint-disable-next-line eqeqeq
          if (self.fCallbackLowBattery != undefined) {  // Low battery callback
            self.Log(ELOGLEVEL.INFO, self.fBatteryLevel < 10 ? 'Sending battery low' : 'Sending battery ok');
            self.fCallbackLowBattery(null, self.fBatteryLevel < 10);
            self.fCallbackLowBattery = undefined;
          }

          // After valid time for value or if new query started go back to invalid
          // If we already have values from cyclic update, this bQueryStarted will lead to an extra update.
          // In this way it's possible to get updated values even though you have the cyclic feature activated.
          if ((bTimeout) || (self.bQueryStarted)) {
            self.eState = ESTATES.STATUS_INVALID;
          }
          break;
      }
      bTimeout = false;
      bDiscover = false;
    }
    // when state changed, then run it again
    // eslint-disable-next-line eqeqeq
    while (self.eState != self.eOldState);

    return;
  }
}

//-----------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------

export default cInkbirdBtTHSensorAccessory;
