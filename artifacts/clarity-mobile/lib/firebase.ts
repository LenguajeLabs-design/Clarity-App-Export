import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

// Firebase's React Native entry point includes this adapter at runtime, but
// Firebase 12's shared TypeScript entry point does not expose its type to Expo.
// Keep the adapter local so authentication stays persisted in AsyncStorage on
// iOS and Android without adding a second Firebase package dependency.
const nativeAuthPersistence = class {
  readonly type = "LOCAL" as const;

  async _isAvailable() {
    try {
      const key = "@clarity/firebase-auth-storage-available";
      await AsyncStorage.setItem(key, "1");
      await AsyncStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  _set(key: string, value: unknown) {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async _get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  }

  _remove(key: string) {
    return AsyncStorage.removeItem(key);
  }

  _addListener(_key: string, _listener: unknown) {}

  _removeListener(_key: string, _listener: unknown) {}
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  try {
    auth = Platform.OS === "web"
      ? getAuth(app)
      : initializeAuth(app, { persistence: nativeAuthPersistence as unknown as Persistence });
  } catch {
    auth = getAuth(app);
  }
  try {
    db = Platform.OS === "web"
      ? initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
      : getFirestore(app);
  } catch {
    db = getFirestore(app);
  }
}

export const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "",
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? "",
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? "",
};

export { app, auth, db };
