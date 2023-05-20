# homebridge-inkbird-wifi-gateway
A homebridge-plugin for the Inkbird bluetooth pool temperature sensors using the Inkbird Wifi Gateway.

### Features:
- Temperature 
- Battery level
- Wifi Gateway IBS-M1S
- Supported sensors:
   - IBS-PO1/B 
   
   
   ### 2. Update homebridge configuration file.
```
    {
            "name": "homebridge-inkbird-wifi-gateway",
            "devices": [
                {
                    "name": "Inkbird Wifi Gateway",
                    "type": "IBSM1S",
                    "deviceId": "<<Ble MAC Address>>"
                }
            ],
            "update_interval": 15,
            "storage": "filesystem",
            "loglevel": 3,
            "platform": "HomebridgeInkbirdWifiGateway"
        }
```
- name            (required): Choose a suitable name for your sensor accessory.
- model           (required): Choose a type from list of supported types above.
                              If your type is not available, but you want to try if your sensor works anyway put
                              `not in list - try it anyway`
                              You won't get an error that the sensor is wrong and plausibility and CRC checks will be switched off.
                              But be warned, you might get very strange values!!!
- mac_address     (optional): Put the MAC-address of the sensor if you know it.
                              If not, leave the value open and the plugin will choose any sensor it finds that passes the plausibility checks. In the log you will get a message like this:
                              `6/6/2022 12:39:05 [Inkbird Wifi Gateway]
                              There you have your MAC. Copy it to your configuration in this format ("xx:xx:xx:xx:xx:xx") to lock only to this sensor.
- update_interval (optional): If you specify an update interval (in seconds) the plugin will automatically refresh the values so you have
                              a faster response for your value. Also you need to configure this option, if you want the Inkbird history to be
                              filled with values. But be advised that this might reduce your batteries lifetime, so don't choose it too short.
- storage         (optional): Where do you want the Eve history to be stored (`filesystem` (default) or `googleDrive` (not tested)).
- loglevel        (optional): The log level at start of the plugin - smaller numbers lead to less messages
                              (0 = Fatal, 1 = Error, 2 = Warning, 3 = Info (default), 4 = Debug).









