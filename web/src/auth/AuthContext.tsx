// Auth context for the substrate console.
//
// The backend verifies Firebase ID tokens in production. In dev-mode (no
// FIREBASE_SERVICE_ACCOUNT_JSON set) it decodes the JWT payload *without*
// verifying the signature so that the node-registry lookup still resolves
// locally. This console mirrors that contract: it accepts a pasted token, and
// additionally offers a "local development token" builder that mints an
// unsigned JWT for booting against a dev-mode backend. The builder refuses to
// run against a production backend, where such a token would (correctly) 401.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, setTokenProvider } from "../api/client";
import * as ep from "../api/endpoints";
import type { User } from "../api/types";

const STORAGE_KEY = "arkadia.console.token";

function b64url(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Mint an unsigned JWT understood only by a dev-mode backend. */
export function mintDevToken(claims: Record<string, unknown>): string {
  const header = { alg: "none", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + 60 * 60 * 12, ...claims };
  return `${b64url(header)}.${b64url(payload)}.dev`;
}

/** Read the payload of a JWT without verifying it (display only). */
export function decodeTokenClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  /** 401/403 from the identity probe — the token is not usable. */
  authFailed: boolean;
  signInWithToken: (token: string) => Promise<void>;
  signInDev: (claims: { uid: string; email: string; name?: string; node_key?: string }) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!token);
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);

  // Keep the fetch client supplied with the current token.
  useEffect(() => {
    setTokenProvider(() => token);
  }, [token]);

  const loadUser = useCallback(async (tok: string | null) => {
    if (!tok) {
      setUser(null);
      setAuthFailed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await ep.me();
      setUser(res.user);
      setAuthFailed(false);
    } catch (e) {
      setUser(null);
      if (e instanceof ApiError && (e.isAuth || e.isForbidden)) {
        setAuthFailed(true);
        setError(e.isAuth ? "Token rejected (401). It may be expired or the backend is not in dev-mode." : "Access denied (403).");
      } else {
        setAuthFailed(false);
        setError(e instanceof Error ? e.message : "Failed to load identity");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser(token);
  }, [token, loadUser]);

  const signInWithToken = useCallback(async (tok: string) => {
    localStorage.setItem(STORAGE_KEY, tok);
    setToken(tok);
  }, []);

  const signInDev = useCallback(
    async (claims: { uid: string; email: string; name?: string; node_key?: string }) => {
      const tok = mintDevToken({
        sub: claims.uid,
        user_id: claims.uid,
        email: claims.email,
        name: claims.name,
        ...(claims.node_key ? { node_key: claims.node_key } : {}),
      });
      await signInWithToken(tok);
    },
    [signInWithToken],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const refresh = useCallback(() => loadUser(token), [loadUser, token]);

  const value = useMemo<AuthState>(
    () => ({ token, user, loading, error, authFailed, signInWithToken, signInDev, signOut, refresh }),
    [token, user, loading, error, authFailed, signInWithToken, signInDev, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
