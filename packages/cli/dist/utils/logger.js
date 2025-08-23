"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const winston = __importStar(require("winston"));
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'gray',
};
// Add colors to winston
winston.addColors(colors);
// Create format
const format = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.colorize({ all: true }), winston.format.printf((info) => info.level === 'info' ? `${info.timestamp} ${info.level}: ${info.message}` : info.message));
//TODO: wtf... this suddenly started to not work.
// const logDir = getLogsDir()
// Create logger
const logger = winston.createLogger({
    levels,
    format,
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            level: process.env.LOG_LEVEL || 'info',
        }),
        // // Write all errors to error.log
        // new winston.transports.File({
        //   filename: path.join(logDir, 'error.log'),
        //   level: 'error',
        // }),
        // // Write all logs to combined.log
        // new winston.transports.File({
        //   filename: path.join(logDir, 'combined.log'),
        //   level: 'debug'
        // }),
    ],
});
exports.default = logger;
