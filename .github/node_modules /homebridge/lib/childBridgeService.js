"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildBridgeService = exports.ChildBridgeStatus = exports.ChildProcessMessageEventType = void 0;
const child_process_1 = __importDefault(require("child_process"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_1 = require("./logger");
const user_1 = require("./user");
var ChildProcessMessageEventType;
(function (ChildProcessMessageEventType) {
    /**
     * Sent from the child process when it is ready to accept config
     */
    ChildProcessMessageEventType["READY"] = "ready";
    /**
     * Sent to the child process with a ChildProcessLoadEventData payload
     */
    ChildProcessMessageEventType["LOAD"] = "load";
    /**
     * Sent from the child process once it has loaded the plugin
     */
    ChildProcessMessageEventType["LOADED"] = "loaded";
    /**
     * Sent to the child process telling it to start
     */
    ChildProcessMessageEventType["START"] = "start";
    /**
     * Sent from the child process when the bridge is online
     */
    ChildProcessMessageEventType["ONLINE"] = "online";
    /**
     * Sent from the child when it wants to request port allocation for an external accessory
     */
    ChildProcessMessageEventType["PORT_REQUEST"] = "portRequest";
    /**
     * Sent from the parent with the port allocation response
     */
    ChildProcessMessageEventType["PORT_ALLOCATED"] = "portAllocated";
    /**
     * Sent from the child to update it's current status
     */
    ChildProcessMessageEventType["STATUS_UPDATE"] = "status";
})(ChildProcessMessageEventType = exports.ChildProcessMessageEventType || (exports.ChildProcessMessageEventType = {}));
var ChildBridgeStatus;
(function (ChildBridgeStatus) {
    /**
     * When the child bridge is loading, or restarting
     */
    ChildBridgeStatus["PENDING"] = "pending";
    /**
     * The child bridge is online and has published it's accessory
     */
    ChildBridgeStatus["OK"] = "ok";
    /**
     * The bridge is shutting down, or the process ended unexpectedly
     */
    ChildBridgeStatus["DOWN"] = "down";
})(ChildBridgeStatus = exports.ChildBridgeStatus || (exports.ChildBridgeStatus = {}));
/**
 * Manages the child processes of platforms/accessories being exposed as seperate forked bridges.
 * A child bridge runs a single platform or accessory.
 */
class ChildBridgeService {
    constructor(type, identifier, plugin, bridgeConfig, homebridgeConfig, homebridgeOptions, api, ipcService, externalPortService) {
        this.type = type;
        this.identifier = identifier;
        this.plugin = plugin;
        this.bridgeConfig = bridgeConfig;
        this.homebridgeConfig = homebridgeConfig;
        this.homebridgeOptions = homebridgeOptions;
        this.api = api;
        this.ipcService = ipcService;
        this.externalPortService = externalPortService;
        this.args = [];
        this.shuttingDown = false;
        this.lastBridgeStatus = "pending" /* PENDING */;
        this.pairedStatus = null;
        this.manuallyStopped = false;
        this.setupUri = null;
        this.pluginConfig = [];
        this.log = logger_1.Logger.withPrefix(this.plugin.getPluginIdentifier());
        this.api.on("shutdown", () => {
            this.shuttingDown = true;
            this.teardown();
        });
        // make sure we don't hit the max listeners limit
        this.api.setMaxListeners(this.api.getMaxListeners() + 1);
    }
    /**
     * Start the child bridge service
     */
    start() {
        var _a;
        this.setProcessFlags();
        this.startChildProcess();
        // set display name
        if (this.pluginConfig.length > 1 || this.pluginConfig.length === 0) {
            this.displayName = this.plugin.getPluginIdentifier();
        }
        else {
            this.displayName = ((_a = this.pluginConfig[0]) === null || _a === void 0 ? void 0 : _a.name) || this.plugin.getPluginIdentifier();
        }
        // re-configured log with display name
        this.log = logger_1.Logger.withPrefix(this.displayName);
    }
    /**
     * Add a config block to a child bridge.
     * Platform child bridges can only contain one config block.
     * @param config
     */
    addConfig(config) {
        this.pluginConfig.push(config);
    }
    get bridgeStatus() {
        return this.lastBridgeStatus;
    }
    set bridgeStatus(value) {
        this.lastBridgeStatus = value;
        this.sendStatusUpdate();
    }
    /**
     * Start the child bridge process
     */
    startChildProcess() {
        this.bridgeStatus = "pending" /* PENDING */;
        this.child = child_process_1.default.fork(path_1.default.resolve(__dirname, "childBridgeFork.js"), this.args, {
            silent: true,
        });
        this.child.stdout.on("data", (data) => {
            process.stdout.write(data);
        });
        this.child.stderr.on("data", (data) => {
            process.stderr.write(data);
        });
        this.child.on("exit", () => {
            this.log.warn("Child bridge process ended");
        });
        this.child.on("error", (e) => {
            this.bridgeStatus = "down" /* DOWN */;
            this.log.error("Child process error", e);
        });
        this.child.once("close", (code, signal) => {
            this.bridgeStatus = "down" /* DOWN */;
            this.handleProcessClose(code, signal);
        });
        // handle incoming ipc messages from the child process
        this.child.on("message", (message) => {
            var _a;
            if (typeof message !== "object" || !message.id) {
                return;
            }
            switch (message.id) {
                case "ready" /* READY */: {
                    this.log(`Launched child bridge with PID ${(_a = this.child) === null || _a === void 0 ? void 0 : _a.pid}`);
                    this.loadPlugin();
                    break;
                }
                case "loaded" /* LOADED */: {
                    const version = message.data.version;
                    if (this.pluginConfig.length > 1) {
                        this.log(`Loaded ${this.plugin.getPluginIdentifier()} v${version} child bridge successfully with ${this.pluginConfig.length} accessories`);
                    }
                    else {
                        this.log(`Loaded ${this.plugin.getPluginIdentifier()} v${version} child bridge successfully`);
                    }
                    this.startBridge();
                    break;
                }
                case "online" /* ONLINE */: {
                    this.bridgeStatus = "ok" /* OK */;
                    break;
                }
                case "portRequest" /* PORT_REQUEST */: {
                    this.handlePortRequest(message.data);
                    break;
                }
                case "status" /* STATUS_UPDATE */: {
                    this.pairedStatus = message.data.paired;
                    this.setupUri = message.data.setupUri;
                    this.sendStatusUpdate();
                    break;
                }
            }
        });
    }
    /**
     * Called when the child bridge process exits, if Homebridge is not shutting down, it will restart the process
     * @param code
     * @param signal
     */
    handleProcessClose(code, signal) {
        this.log(`Process Ended. Code: ${code}, Signal: ${signal}`);
        setTimeout(() => {
            if (!this.shuttingDown) {
                this.log("Restarting Process...");
                this.startChildProcess();
            }
        }, 7000);
    }
    /**
     * Helper function to send a message to the child process
     * @param type
     * @param data
     */
    sendMessage(type, data) {
        if (this.child && this.child.connected) {
            this.child.send({
                id: type,
                data,
            });
        }
    }
    /**
     * Some plugins may make use of the homebridge process flags
     * These will be passed through to the forked process
     */
    setProcessFlags() {
        if (this.homebridgeOptions.debugModeEnabled) {
            this.args.push("-D");
        }
        if (this.homebridgeOptions.forceColourLogging) {
            this.args.push("-C");
        }
        if (this.homebridgeOptions.insecureAccess) {
            this.args.push("-I");
        }
        if (this.homebridgeOptions.noLogTimestamps) {
            this.args.push("-T");
        }
        if (this.homebridgeOptions.keepOrphanedCachedAccessories) {
            this.args.push("-K");
        }
        if (this.homebridgeOptions.customStoragePath) {
            this.args.push("-U", this.homebridgeOptions.customStoragePath);
        }
        if (this.homebridgeOptions.customPluginPath) {
            this.args.push("-P", this.homebridgeOptions.customPluginPath);
        }
    }
    /**
     * Tell the child process to load the given plugin
     */
    loadPlugin() {
        const bridgeConfig = {
            name: this.bridgeConfig.name || this.displayName || this.plugin.getPluginIdentifier(),
            port: this.bridgeConfig.port,
            username: this.bridgeConfig.username,
            advertiser: this.homebridgeConfig.bridge.advertiser,
            pin: this.bridgeConfig.pin || this.homebridgeConfig.bridge.pin,
            bind: this.homebridgeConfig.bridge.bind,
            setupID: this.bridgeConfig.setupID,
            manufacturer: this.bridgeConfig.manufacturer || this.homebridgeConfig.bridge.manufacturer,
            model: this.bridgeConfig.model || this.homebridgeConfig.bridge.model,
        };
        const bridgeOptions = {
            cachedAccessoriesDir: user_1.User.cachedAccessoryPath(),
            cachedAccessoriesItemName: "cachedAccessories." + this.bridgeConfig.username.replace(/:/g, "").toUpperCase(),
        };
        // shallow copy the homebridge options to the bridge options object
        Object.assign(bridgeOptions, this.homebridgeOptions);
        this.sendMessage("load" /* LOAD */, {
            type: this.type,
            identifier: this.identifier,
            pluginPath: this.plugin.getPluginPath(),
            pluginConfig: this.pluginConfig,
            bridgeConfig,
            bridgeOptions,
            homebridgeConfig: {
                bridge: this.homebridgeConfig.bridge,
                mdns: this.homebridgeConfig.mdns,
                ports: this.homebridgeConfig.ports,
                disabledPlugins: [],
                accessories: [],
                platforms: [], // not used by child bridges
            },
        });
    }
    /**
     * Tell the child bridge to start broadcasting
     */
    startBridge() {
        this.sendMessage("start" /* START */);
    }
    /**
     * Handle external port requests from child
     */
    async handlePortRequest(request) {
        const port = await this.externalPortService.requestPort(request.username);
        this.sendMessage("portAllocated" /* PORT_ALLOCATED */, {
            username: request.username,
            port: port,
        });
    }
    /**
     * Send sigterm to the child bridge
     */
    teardown() {
        if (this.child && this.child.connected) {
            this.bridgeStatus = "down" /* DOWN */;
            this.child.kill("SIGTERM");
        }
    }
    /**
     * Trigger sending child bridge metdata to the process parent via IPC
     */
    sendStatusUpdate() {
        this.ipcService.sendMessage("childBridgeStatusUpdate" /* CHILD_BRIDGE_STATUS_UPDATE */, this.getMetadata());
    }
    /**
     * Restarts the child bridge process
     */
    restartChildBridge() {
        if (this.manuallyStopped) {
            this.startChildBridge();
        }
        else {
            this.log.warn("Restarting child bridge...");
            this.refreshConfig();
            this.teardown();
        }
    }
    /**
     * Stops the child bridge, not starting it again
     */
    stopChildBridge() {
        var _a;
        if (!this.shuttingDown) {
            this.log.warn("Stopping child bridge (will not restart)...");
            this.shuttingDown = true;
            this.manuallyStopped = true;
            (_a = this.child) === null || _a === void 0 ? void 0 : _a.removeAllListeners("close");
            this.teardown();
        }
        else {
            this.log.warn("Bridge already shutting down or stopped.");
        }
    }
    /**
     * Starts the child bridge, only if it was manually stopped and is no longer running
     */
    startChildBridge() {
        if (this.manuallyStopped && this.bridgeStatus === "down" /* DOWN */ && (!this.child || !this.child.connected)) {
            this.log.warn("Starting child bridge...");
            this.refreshConfig();
            this.startChildProcess();
            this.shuttingDown = false;
            this.manuallyStopped = false;
        }
        else {
            this.log.warn("Cannot start child bridge, it is still running or was not manually stopped");
        }
    }
    /**
     * Read the config.json file from disk and refresh the plugin config block for just this plugin
     */
    async refreshConfig() {
        var _a, _b;
        try {
            const homebridgeConfig = await fs_extra_1.default.readJson(user_1.User.configPath());
            if (this.type === "platform" /* PLATFORM */) {
                const config = (_a = homebridgeConfig.platforms) === null || _a === void 0 ? void 0 : _a.filter(x => { var _a; return x.platform === this.identifier && ((_a = x._bridge) === null || _a === void 0 ? void 0 : _a.username) === this.bridgeConfig.username; });
                if (config.length) {
                    this.pluginConfig = config;
                    this.bridgeConfig = this.pluginConfig[0]._bridge || this.bridgeConfig;
                }
                else {
                    this.log.warn("Platform config could not be found, using existing config.");
                }
            }
            else if (this.type === "accessory" /* ACCESSORY */) {
                const config = (_b = homebridgeConfig.accessories) === null || _b === void 0 ? void 0 : _b.filter(x => { var _a; return x.accessory === this.identifier && ((_a = x._bridge) === null || _a === void 0 ? void 0 : _a.username) === this.bridgeConfig.username; });
                if (config.length) {
                    this.pluginConfig = config;
                    this.bridgeConfig = this.pluginConfig[0]._bridge || this.bridgeConfig;
                }
                else {
                    this.log.warn("Accessory config could not be found, using existing config.");
                }
            }
        }
        catch (e) {
            this.log.error("Failed to refresh plugin config:", e.message);
        }
    }
    /**
     * Returns metadata about this child bridge
     */
    getMetadata() {
        var _a;
        return {
            status: this.bridgeStatus,
            paired: this.pairedStatus,
            setupUri: this.setupUri,
            username: this.bridgeConfig.username,
            pin: this.bridgeConfig.pin || this.homebridgeConfig.bridge.pin,
            name: this.bridgeConfig.name || this.displayName || this.plugin.getPluginIdentifier(),
            plugin: this.plugin.getPluginIdentifier(),
            identifier: this.identifier,
            pid: (_a = this.child) === null || _a === void 0 ? void 0 : _a.pid,
            manuallyStopped: this.manuallyStopped,
        };
    }
}
exports.ChildBridgeService = ChildBridgeService;
//# sourceMappingURL=childBridgeService.js.map