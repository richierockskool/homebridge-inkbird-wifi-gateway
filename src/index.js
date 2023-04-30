import InkbirdPlatform from './InkbirdPlatform.js';

export default (homebridge) => {
  // eslint-disable-next-line no-undef
  global.homebridge = homebridge;
  homebridge.registerPlatform('homebridge-inkbird-wifi-gateway', InkbirdPlatform);
};