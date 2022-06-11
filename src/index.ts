import { API } from 'homebridge';

import { HOMEBRIDGE_INKBIRD_WIFI_GATEWAY } from './settings';
import { InkbirdHomebridgePlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(HOMEBRIDGE_INKBIRD_WIFI_GATEWAY, InkbirdHomebridgePlatform );
};
