# homebridge-inkbird-wifi-gateway
A homebridge-plugin for the Inkbird bluetooth pool temperature sensors.

### Features:
- Temperature 
- Battery level
- Wifi Gateway IBS-M1S
- Supported sensors:
   - IBS-PO1/B 
   
   
   ### 2. Update homebridge configuration file.
```
"accessories": [
   {
      "accessory"       : "InkbirdWifiGateway",
      "plugin_map"      :
      {
         "plugin_name": "homebridge-inkbird-wifi-gateway",
         "index": 0
      },
      "name"            : "Pool Temperature Sensor Wifi Gateway",
      "model"           : "IBS-M1S",
      "mac_address"     : "e8:db:84:b6:9c:e6",
      "update_interval" : 600,
      "storage"         : "filesystem",
      "loglevel"        : 3
   }
]
```
- name            (required): Choose a suitable name for your sensor accessory.
- model           (required): Choose a type from list of supported types above.
                              If your type is not available, but you want to try if your sensor works anyway put
                              `not in list - try it anyway`
                              You won't get an error that the sensor is wrong and plausibility and CRC checks will be switched off.
                              But be warned, you might get very strange values!!!
- mac_address     (optional): Put the MAC-address of the sensor if you know it.
                              If not, leave the value open and the plugin will choose any sensor it finds that passes the plausibility checks. In the log you will get a message like this:
                              `7/6/2020 12:39:05 [Garden TH Sensor] Peripheral with MAC 50:51:a9:7d:fc:e9 found - stop scanning`
                              There you have your MAC. Copy it to your configuration in this format ("xx:xx:xx:xx:xx:xx") to lock only to this sensor.
- update_interval (optional): If you specify an update interval (in seconds) the plugin will automatically refresh the values so you have
                              a faster response for your value. Also you need to configure this option, if you want the Eve history to be
                              filled with values. But be advised that this might reduce your batteries lifetime, so don't choose it too short.
- storage         (optional): Where do you want the Eve history to be stored (`filesystem` (default) or `googleDrive` (not tested)).
- loglevel        (optional): The log level at start of the plugin - smaller numbers lead to less messages
                              (0 = Fatal, 1 = Error, 2 = Warning, 3 = Info (default), 4 = Debug).









