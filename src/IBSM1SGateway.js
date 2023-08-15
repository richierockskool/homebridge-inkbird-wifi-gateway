class IBSM1SGateway {

  constructor(log, config, api, device) {

    this.log = log;
    this.name = device.name;
    this.config = config;
    this.api = api;

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.name = config.name;

    // create a new Bridge Configuration service
    this.service = new this.Service(this.Service.BridgeConfiguration);
    // create handlers for required characteristics
    this.service.getCharacteristic(this.Characteristic.DiscoverBridgedAccessories)
      .onGet(this.handleDiscoverBridgedAccessoriesGet.bind(this))
      .onSet(this.handleDiscoverBridgedAccessoriesSet.bind(this));

    this.service.getCharacteristic(this.Characteristic.DiscoveredBridgedAccessories)
      .onGet(this.handleDiscoveredBridgedAccessoriesGet.bind(this));

    this.bridgeService.getCharacteristic(Characteristic.StatusFault).updateValue(!devicesDiscovered.is_connected)

    // Handle requests to get the current value of the "Discover Bridged Accessories" characteristic
    //
    handleDiscoverBridgedAccessoriesGet() ;{
      this.log.debug('Triggered GET InkbirdWifiGateway');

      // set this to a valid value for DiscoverBridgedAccessories
      const currentValue = 1;

      return currentValue;
    }

  }

}
export default IBSM1SGateway