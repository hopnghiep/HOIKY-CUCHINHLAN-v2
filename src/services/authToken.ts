import { auth } from '../firebase';

const TOKEN_STORAGE_KEY = 'ccl_firebase_id_token';

export function getStoredAdminToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null | undefined): void {
  try {
    if (token && token.trim()) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted iframes
  }
}

export function clearStoredAdminToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export async function refreshFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    clearStoredAdminToken();
    return null;
  }
  try {
    const token = await user.getIdToken();
    setStoredAdminToken(token);
    return token;
  } catch {
    return getStoredAdminToken();
  }
}

export function getAdminAuthHeaders(): Record<string, string> {
  const token = getStoredAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
