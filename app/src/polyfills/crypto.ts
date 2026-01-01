// Polyfill for crypto.getRandomValues() in React Native
// Required for the uuid library to work properly
import * as ExpoCrypto from 'expo-crypto';

// Only polyfill if not already available
if (typeof global.crypto !== 'object') {
  (global as any).crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = function <T extends ArrayBufferView>(array: T): T {
    const bytes = ExpoCrypto.getRandomBytes(array.byteLength);
    const uint8Array = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    uint8Array.set(bytes);
    return array;
  };
}
