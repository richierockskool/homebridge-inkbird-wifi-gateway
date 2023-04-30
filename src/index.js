import HomebridgeInkbirdWifiGateway from './HomebridgeInkbirdWifiGateway.js';


export default (homebridge) => {
  // eslint-disable-next-line no-undef
  global.homebridge = homebridge;
  homebridge.registerPlatform('homebridge-inkbird-wifi-gateway', HomebridgeInkbirdWifiGateway);
};