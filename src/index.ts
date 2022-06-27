import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HomebridgeInkbirdWifiGateway } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform('homebridge-inkbird-wifi-gateway', PLATFORM_NAME, HomebridgeInkbirdWifiGateway);
};
