import InkbirdPlatform from './InkbirdPlatform.js';

export default function (homebridge) {


  homebridge.registerPlatform('homebridge-inkbird-wifi-gateway', InkbirdPlatform, true);
}
