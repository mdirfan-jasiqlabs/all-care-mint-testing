const assert = require('assert');

// The exact implementation of getBaseUrl() to test
function getBaseUrl(Platform, Constants, Device, envs = {}) {
  // 1. Production Build Handling
  const productionUrl = envs.EXPO_PUBLIC_API_URL;
  const isDev = envs.__DEV__;

  if (!isDev) {
    if (productionUrl) {
      return productionUrl;
    }
    throw new Error('Production API URL (EXPO_PUBLIC_API_URL) is not configured!');
  }

  // 2. Development Build Handling
  if (productionUrl) {
    return productionUrl;
  }

  // Web Client environment
  if (Platform.OS === 'web') {
    const hostname = envs.windowHostname || 'localhost';
    return `http://${hostname}:3000`;
  }

  // Safe checks for expo-device availability
  let isPhysical = true;
  try {
    if (Device && typeof Device.isDevice === 'boolean') {
      isPhysical = Device.isDevice;
    } else {
      // Fallback heuristics if Device.isDevice is undefined/unavailable
      const model = Platform.constants?.Model || '';
      const hardware = Platform.constants?.Hardware || '';
      const isEmulator = 
        model.toLowerCase().includes('sdk') || 
        model.toLowerCase().includes('emulator') || 
        hardware.includes('goldfish') || 
        hardware.includes('ranchu');
      isPhysical = !isEmulator;
    }
  } catch (e) {
    // If checking throws unexpectedly, default to true or fallback heuristics
  }

  // 3. Android Emulator Check (Takes priority over Metro LAN host)
  if (Platform.OS === 'android' && !isPhysical) {
    return 'http://10.0.2.2:3000';
  }

  // 4. Physical Devices (Android / iOS)
  if (isPhysical) {
    let hostUri = Constants.expoConfig?.hostUri;

    // Try Expo Go Config debugger host
    if (!hostUri) {
      const debuggerHost = Constants.expoGoConfig?.debuggerHost;
      if (debuggerHost) {
        hostUri = debuggerHost;
      }
    }

    // Guarded legacy/fallback checks
    if (!hostUri) {
      const bundleUrl = Constants.manifest2?.extra?.expoGoLaunchMetadata?.bundleUrl || Constants.manifest?.bundleUrl;
      if (bundleUrl) {
        try {
          const matches = bundleUrl.match(/^https?:\/\/([^:/]+)(:\d+)?/);
          if (matches && matches[1]) {
            hostUri = matches[1];
          }
        } catch (e) {
          // Safe catch for parsing errors
        }
      }
    }

    if (!hostUri && Constants.manifest?.hostUri) {
      hostUri = Constants.manifest.hostUri;
    }

    if (hostUri) {
      const hostIP = hostUri.split(':')[0];
      return `http://${hostIP}:3000`;
    }
  }

  // 5. iOS Simulator Fallback
  if (Platform.OS === 'ios' && !isPhysical) {
    return 'http://localhost:3000';
  }

  // Last-resort fallback for native development
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

console.log('🧪 Starting focused unit tests for getBaseUrl()...');

// Test Case 1: Production with configured URL
try {
  const url = getBaseUrl(
    { OS: 'ios', constants: {} },
    { expoConfig: {} },
    { isDevice: true },
    { __DEV__: false, EXPO_PUBLIC_API_URL: 'https://api.allcaremint.com' }
  );
  assert.strictEqual(url, 'https://api.allcaremint.com');
  console.log('✅ Pass: Production with configured URL resolves correctly');
} catch (e) {
  console.error('❌ Fail: Production with configured URL', e);
  process.exit(1);
}

// Test Case 2: Production without configured URL (should throw)
try {
  assert.throws(
    () => getBaseUrl(
      { OS: 'ios', constants: {} },
      { expoConfig: {} },
      { isDevice: true },
      { __DEV__: false }
    ),
    /Production API URL.*is not configured/
  );
  console.log('✅ Pass: Production without configured URL throws error');
} catch (e) {
  console.error('❌ Fail: Production without configured URL did not throw', e);
  process.exit(1);
}

// Test Case 3: Web development
try {
  const url = getBaseUrl(
    { OS: 'web' },
    { expoConfig: {} },
    { isDevice: false },
    { __DEV__: true, windowHostname: 'dev.local' }
  );
  assert.strictEqual(url, 'http://dev.local:3000');
  console.log('✅ Pass: Web development uses browser hostname');
} catch (e) {
  console.error('❌ Fail: Web development', e);
  process.exit(1);
}

// Test Case 4: Android Emulator (should resolve to 10.0.2.2:3000)
try {
  const url = getBaseUrl(
    { OS: 'android', constants: {} },
    { expoConfig: {} },
    { isDevice: false },
    { __DEV__: true }
  );
  assert.strictEqual(url, 'http://10.0.2.2:3000');
  console.log('✅ Pass: Android Emulator resolves to http://10.0.2.2:3000');
} catch (e) {
  console.error('❌ Fail: Android Emulator', e);
  process.exit(1);
}

// Test Case 5: Physical Android (should resolve to Metro LAN host)
try {
  const url = getBaseUrl(
    { OS: 'android', constants: {} },
    { expoConfig: { hostUri: '192.168.1.15:8081' } },
    { isDevice: true },
    { __DEV__: true }
  );
  assert.strictEqual(url, 'http://192.168.1.15:3000');
  console.log('✅ Pass: Physical Android resolves to Metro LAN host');
} catch (e) {
  console.error('❌ Fail: Physical Android', e);
  process.exit(1);
}

// Test Case 6: iOS Simulator (should resolve to localhost:3000)
try {
  const url = getBaseUrl(
    { OS: 'ios', constants: {} },
    { expoConfig: {} },
    { isDevice: false },
    { __DEV__: true }
  );
  assert.strictEqual(url, 'http://localhost:3000');
  console.log('✅ Pass: iOS Simulator resolves to http://localhost:3000');
} catch (e) {
  console.error('❌ Fail: iOS Simulator', e);
  process.exit(1);
}

// Test Case 7: Physical iPhone (should resolve to Metro LAN host)
try {
  const url = getBaseUrl(
    { OS: 'ios', constants: {} },
    { expoConfig: { hostUri: '192.168.1.50:8081' } },
    { isDevice: true },
    { __DEV__: true }
  );
  assert.strictEqual(url, 'http://192.168.1.50:3000');
  console.log('✅ Pass: Physical iPhone resolves to Metro LAN host');
} catch (e) {
  console.error('❌ Fail: Physical iPhone', e);
  process.exit(1);
}

// Test Case 8: Metro host unavailable fallback (Physical iPhone fallback)
try {
  const url = getBaseUrl(
    { OS: 'ios', constants: {} },
    { expoConfig: {} },
    { isDevice: true },
    { __DEV__: true }
  );
  assert.strictEqual(url, 'http://localhost:3000');
  console.log('✅ Pass: Metro host unavailable fallback resolves to http://localhost:3000');
} catch (e) {
  console.error('❌ Fail: Metro host unavailable fallback', e);
  process.exit(1);
}

console.log('\n🎉 ALL getBaseUrl() UNIT TESTS PASSED SUCCESSFULLY!\n');
