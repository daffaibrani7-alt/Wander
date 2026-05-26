const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Alias @rnmapbox/maps to a stub on web
// Metro resolves platform-specific via extraNodeModules per-platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web, redirect @rnmapbox/maps to our empty stub
  if (platform === "web" && moduleName === "@rnmapbox/maps") {
    return {
      filePath: path.resolve(__dirname, "src/stubs/rnmapbox-stub.js"),
      type: "sourceFile",
    };
  }
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
