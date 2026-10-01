// Minimal typed fetch wrapper for the relational-substrate HTTP surface.
//
// The backend serves FastAPI/OpenAPI 3.1 with no security scheme declared; auth
// is bearer-token based (Firebase ID token in production, unsigned dev token in
// dev-mode). This client attaches whatever token the auth store holds and
// normalizes the error envelope ({"detail": ...}) into an ApiError.

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  get isAuth(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

type TokenProvider = () => string | null;

let tokenProvider: TokenProvider = () => null;

export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  /** Raw body (e.g. FormData / Blob) instead of JSON. */
  raw?: BodyInit;
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const useAuth = opts.auth !== false;
  if (useAuth) {
    const token = tokenProvider();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined = opts.raw;
  if (opts.body !== undefined && opts.raw === undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body,
    signal: opts.signal,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && "detail" in (parsed as object)
        ? (parsed as { detail: unknown }).detail
        : parsed ?? res.statusText;
    throw new ApiError(res.status, detail);
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, opts?: RequestOptions) => request<T>("POST", path, opts),
  put: <T>(path: string, opts?: RequestOptions) => request<T>("PUT", path, opts),
  patch: <T>(path: string, opts?: RequestOptions) => request<T>("PATCH", path, opts),
  del: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
};
