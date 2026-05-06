// File Overview: webpack.config.js
// What this file is: Web build override configuration for webpack.
// When this runs: Loaded when this module is imported by a screen/service.
// Main inputs: React state/props, Firebase data, and shared modules.
// Main outputs: UI rendering and/or side effects (navigation, reads/writes, audio).
// Read this first: Start from the main exported component/function, then follow hooks/callbacks in order.

const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Suppress useNativeDriver warnings on web.
  config.ignoreWarnings = [
    /useNativeDriver/,
    /RCTAnimation/,
  ];
  
  return config;
};
