/**
 * logger.ts
 *
 * Centralized, level-based logger client.
 * Connects logging verbosity to active environment configurations.
 */
import { ENV } from "./environment";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const WanderLogger = {
  debug: (message: string, ...optionalParams: any[]) => {
    if (LOG_LEVELS[ENV.logLevel] <= LOG_LEVELS.debug) {
      console.log(`[DEBUG] ${message}`, ...optionalParams);
    }
  },

  info: (message: string, ...optionalParams: any[]) => {
    if (LOG_LEVELS[ENV.logLevel] <= LOG_LEVELS.info) {
      console.log(`[INFO] ${message}`, ...optionalParams);
    }
  },

  warn: (message: string, ...optionalParams: any[]) => {
    if (LOG_LEVELS[ENV.logLevel] <= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, ...optionalParams);
    }
  },

  error: (message: string, ...optionalParams: any[]) => {
    if (LOG_LEVELS[ENV.logLevel] <= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...optionalParams);
    }
  },
};
