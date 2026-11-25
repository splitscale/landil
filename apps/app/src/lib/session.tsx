import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { api, ApiError, setAuthToken, type Session, type User } from '@/lib/api';

const KEY = 'landil.session-token';

// Phones: Keychain / Keystore. Web: SecureStore does not exist there, so localStorage.
// ponytail: the website should move to the HttpOnly cookie session (ENT-317) before launch.
const store = {
  get: () => (Platform.OS === 'web' ? AsyncStorage.getItem(KEY) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  clear: () => (Platform.OS === 'web' ? AsyncStorage.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

export type SignUpFields = { username: string; password: string; name: string; email: string; gender: boolean };

type SessionState = {
  user: User | null;
  /** false until the saved session has been checked */
  ready: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (fields: SignUpFields) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await store.get().catch(() => null);
      if (token) {
        setAuthToken(token);
        try {
          setUser(await api<User>('/v1/me'));
        } catch (e) {
          // Only a rejected session signs you out. Offline: stay signed in, try again next launch.
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            setAuthToken(undefined);
            await store.clear();
          }
        }
      }
      setReady(true);
    })();
  }, []);

  async function start(session: Session) {
    setAuthToken(session.token);
    await store.set(session.token);
    setUser(session.user);
  }

  const value: SessionState = {
    user,
    ready,
    signIn: async (username, password) => start(await api<Session>('/v1/auth/sign-in', undefined, { username, password })),
    signUp: async (fields) => start(await api<Session>('/v1/auth/sign-up', undefined, fields)),
    signOut: async () => {
      await api('/v1/auth/sign-out', undefined, {}).catch(() => {}); // signed out here even if offline
      setAuthToken(undefined);
      await store.clear();
      setUser(null);
    },
  };
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const s = use(SessionContext);
  if (!s) throw new Error('useSession needs SessionProvider');
  return s;
}
