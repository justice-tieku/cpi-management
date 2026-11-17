import { User } from '../types/cms';
import { ServiceRole } from '../types/auth';

const SESSION_KEY = 'cpi_auth_session';
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export interface StoredSession {
  user: User;
  role: ServiceRole;
  lastActive: number; // Unix timestamp in ms
}

/**
 * Retrieve the active session if present and not expired (>15m inactivity).
 */
export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: StoredSession = JSON.parse(raw);
    if (!session || !session.user || !session.role || !session.lastActive) {
      clearStoredSession();
      return null;
    }

    const elapsed = Date.now() - session.lastActive;
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      // Session has expired due to 15 minutes of inactivity
      clearStoredSession();
      return null;
    }

    // Refresh lastActive upon successful check
    session.lastActive = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (err) {
    clearStoredSession();
    return null;
  }
}

/**
 * Persist user session to localStorage.
 */
export function saveStoredSession(user: User, role: ServiceRole): void {
  try {
    const session: StoredSession = {
      user,
      role,
      lastActive: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('[Session] Failed to persist session:', err);
  }
}

/**
 * Update the timestamp of the last active user action.
 */
export function touchSessionActivity(): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;

    const session: StoredSession = JSON.parse(raw);
    if (session && session.lastActive) {
      session.lastActive = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore
  }
}

/**
 * Clear the session from storage.
 */
export function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
