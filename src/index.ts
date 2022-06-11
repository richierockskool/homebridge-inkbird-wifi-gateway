import { API } from 'homebridge';

import { PLATFORM_NAME = 'InkbirdWiFiGatewayHomebridgePlugin' } from './settings';
import { ExampleHomebridgePlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, ExampleHomebridgePlatform);
};
