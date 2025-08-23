"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceName = getDeviceName;
const node_os_1 = __importDefault(require("node:os"));
/**
 * Get a friendly name for the current device
 */
async function getDeviceName() {
    const hostname = node_os_1.default.hostname();
    const platform = node_os_1.default.platform();
    let deviceType = 'Device';
    switch (platform) {
        case 'darwin':
            deviceType = 'Mac';
            break;
        case 'win32':
            deviceType = 'Windows PC';
            break;
        case 'linux':
            deviceType = 'Linux';
            break;
    }
    return `CLI on ${hostname} (${deviceType})`;
}
