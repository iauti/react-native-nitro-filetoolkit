const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

if (process.env.RN_HARNESS === 'true') {
  const expoResolveRequest = config.resolver.resolveRequest;

  // Harness injects its runtime outside the example app and expects test
  // modules to resolve relative to the app. Keep these overrides isolated so
  // regular Expo runs retain Expo's automatic monorepo configuration.
  config.watchFolders = [workspaceRoot];
  config.server.unstable_serverRoot = projectRoot;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === './node_modules/expo-router/entry') {
      return {
        type: 'sourceFile',
        filePath: require.resolve('@react-native-harness/runtime/entry-point'),
      };
    }

    return expoResolveRequest
      ? expoResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
