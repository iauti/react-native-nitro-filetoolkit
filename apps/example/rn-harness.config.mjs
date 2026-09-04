import {
  applePlatform,
  appleSimulator,
} from '@react-native-harness/platform-apple';
import {
  androidEmulator,
  androidPlatform,
} from '@react-native-harness/platform-android';

export default {
  entryPoint: './harness.entry.ts',
  appRegistryComponentName: 'main',
  cache: { metro: false },
  runners: [
    applePlatform({
      name: 'ios',
      device: appleSimulator('iPhone 16 Pro', '18.5'),
      bundleId: 'com.margelo.nitrofiletoolkit.example',
    }),
    androidPlatform({
      name: 'android',
      device: androidEmulator('Pixel_8_API_36', {
        apiLevel: 36,
        profile: 'pixel_8',
        diskSize: '2G',
        heapSize: '1G',
      }),
      bundleId: 'com.margelo.nitrofiletoolkit.example',
    }),
  ],
  defaultRunner: 'ios',
};
