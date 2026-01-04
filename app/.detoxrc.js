/** Detox configuration for iOS simulator using Expo dev client build */
module.exports = {
  testRunner: {
    type: 'jest',
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  artifacts: {
    rootDir: 'artifacts/detox',
  },
  apps: {
    'ios.sim.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/SecondBrain.app',
      build:
        'EXPO_NO_TELEMETRY=1 RCT_NEW_ARCH_ENABLED=1 xcodebuild -workspace ios/SecondBrain.xcworkspace -scheme SecondBrain -configuration Release -sdk iphonesimulator -derivedDataPath ios/build -UseModernBuildSystem=YES',
    },
  },
  devices: {
    'simulator.iphone16pro': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro',
      },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator.iphone16pro',
      app: 'ios.sim.release',
    },
  },
};

