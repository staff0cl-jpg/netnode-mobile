import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_URL: 'netnode_api_url',
  SESSION_USER: 'netnode_session_user',
  SESSION_ROLE: 'netnode_session_role',
  SESSION_TOKEN: 'netnode_session_token',
};

const DEFAULT_API_URL = 'https://your-server';

export async function getApiUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.API_URL);
    return stored ?? DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export async function saveApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.API_URL, url.trim().replace(/\/$/, ''));
}

export interface SessionData {
  username: string;
  role: string;
}

export async function saveSession(session: SessionData): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.SESSION_USER, session.username],
    [KEYS.SESSION_ROLE, session.role],
  ]);
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const pairs = await AsyncStorage.multiGet([KEYS.SESSION_USER, KEYS.SESSION_ROLE]);
    const username = pairs[0][1];
    const role = pairs[1][1];
    if (!username) return null;
    return { username, role: role ?? 'viewer' };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.SESSION_USER, KEYS.SESSION_ROLE, KEYS.SESSION_TOKEN]);
}
