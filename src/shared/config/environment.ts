/**
 * environment.ts
 *
 * Production environment separation configs.
 * Differentiates environments: development, staging, and production.
 */

export interface AppEnvironment {
  name: "development" | "staging" | "production";
  enableDevMenu: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  enableFirebaseLogs: boolean;
}

const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

export const ENV: AppEnvironment = isProduction
  ? {
      name: "production",
      enableDevMenu: false,
      logLevel: "error",
      enableFirebaseLogs: false,
    }
  : {
      name: "development",
      enableDevMenu: true,
      logLevel: "debug",
      enableFirebaseLogs: true,
    };
