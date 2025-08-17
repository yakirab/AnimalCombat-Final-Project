const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Suppress useNativeDriver warnings on web
  config.ignoreWarnings = [
    /useNativeDriver/,
    /RCTAnimation/,
  ];
  
  return config;
};