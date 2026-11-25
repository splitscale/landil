import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'landil.device-id';
let cached: Promise<string> | undefined;

/**
 * A random ID made once per install, for view counts (ENT-307). It is not tied to the person or the
 * hardware, and the API stores only a hash of it. Clearing the app's data makes a new one.
 */
export function deviceId(): Promise<string> {
  cached ??= AsyncStorage.getItem(KEY).then(async (id) => {
    if (id) return id;
    // ponytail: Math.random is enough for a view-count key; it is not a secret.
    const made = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    await AsyncStorage.setItem(KEY, made);
    return made;
  });
  return cached;
}
