import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { InkbirdPlatform } from './InkbirdPlatform.js';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform('homebridge-inkbird-wifi-gateway', PLATFORM_NAME, InkbirdPlatform);
};
