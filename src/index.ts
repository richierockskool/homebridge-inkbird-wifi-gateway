import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HomebridgeInkbirdWifiGatewayPlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform('homebridge-inkbird-wifi-gateway-platform',PLATFORM_NAME, HomebridgeInkbirdWifiGatewayPlatform);
};
