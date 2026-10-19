// Session storage for Supabase Auth. On iOS, tokens are kept in the Keychain via
// expo-secure-store. SecureStore values should stay small, so long values are chunked.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK = 1800;
const opts: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const safeKey = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "_");

const web = {
  getItem: async (k: string) => (typeof localStorage === "undefined" ? null : localStorage.getItem(k)),
  setItem: async (k: string, v: string) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(k, v);
  },
  removeItem: async (k: string) => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(k);
  },
};

const native = {
  async getItem(key: string): Promise<string | null> {
    const k = safeKey(key);
    const count = await SecureStore.getItemAsync(`${k}__n`, opts);
    if (!count) return SecureStore.getItemAsync(k, opts);
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const p = await SecureStore.getItemAsync(`${k}__${i}`, opts);
      if (p === null) return null;
      parts.push(p);
    }
    return parts.join("");
  },
  async setItem(key: string, value: string): Promise<void> {
    const k = safeKey(key);
    await native.removeItem(key);
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k}__${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), opts);
    await SecureStore.setItemAsync(`${k}__n`, String(n), opts);
  },
  async removeItem(key: string): Promise<void> {
    const k = safeKey(key);
    const count = Number((await SecureStore.getItemAsync(`${k}__n`, opts)) ?? 0);
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${k}__${i}`, opts);
    await SecureStore.deleteItemAsync(`${k}__n`, opts);
    await SecureStore.deleteItemAsync(k, opts);
  },
};

export const secureStorage = Platform.OS === "web" ? web : native;
