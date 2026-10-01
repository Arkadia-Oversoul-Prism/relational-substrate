import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import type { AsyncState } from "../lib/hooks";

export function Card({ title, children, actions, className }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ""}`}>
      {(title || actions) && (
        <div className="row between" style={{ marginBottom: title ? 12 : 0 }}>
          {title && <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

type Tone = "ok" | "warn" | "err" | "info" | "muted" | "";

export function Pill({ tone = "", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

/** Map a backend status token to a truthful tone. */
export function statusTone(status: string | undefined): Tone {
  const s = (status ?? "").toLowerCase();
  if (["operational", "radiant", "ok", "healthy", "ready", "active", "completed", "configured", "available", "verified", "observed", "connected", "enabled", "pass", "clean"].includes(s)) return "ok";
  if (["degraded", "warning", "unconfigured", "pending", "partial", "draft", "queued", "disconnected", "awaiting_human_action", "revision_required", "expired", "not_attempted", "unresolved", "blocked"].includes(s)) return "warn";
  if (["error", "failed", "aborted", "unavailable", "denied", "critical", "forbidden"].includes(s)) return "err";
  if (["running", "verifying", "checkpointed", "proposed", "authorized", "active"].includes(s)) return "info";
  return "muted";
}

export function Dot({ tone = "" }: { tone?: Tone }) {
  return <span className={`dot ${tone}`} />;
}

export function StatusPill({ status }: { status: string | undefined }) {
  if (!status) return <Pill tone="muted">unknown</Pill>;
  return (
    <Pill tone={statusTone(status)}>
      <Dot tone={statusTone(status)} />
      {status}
    </Pill>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" /> {label}
    </div>
  );
}

export function ErrorBanner({ error }: { error: Error | null }) {
  if (!error) return null;
  if (error instanceof ApiError && (error.isAuth || error.isForbidden)) {
    return (
      <div className="error-banner">
        {error.isForbidden ? "This surface requires higher authority than the session holds (403)." : "Authentication required (401)."}{" "}
        <Link to="/signin" style={{ textDecoration: "underline", color: "#ffd7c7" }}>
          Sign in
        </Link>
      </div>
    );
  }
  return <div className="error-banner">{error.message}</div>;
}

export function Empty({ icon = "◌", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div>{title}</div>
      {hint && <div className="tiny faint mt">{hint}</div>}
    </div>
  );
}

/** Render loading / error / empty / content for an AsyncState. */
export function Async<T>({ state, children, empty }: { state: AsyncState<T>; children: (data: T) => ReactNode; empty?: (data: T) => boolean }) {
  if (state.loading && state.data === null) return <Loading />;
  if (state.error) return <ErrorBanner error={state.error} />;
  if (state.data === null) return <Empty title="No data" />;
  if (empty && empty(state.data)) return <Empty title="Nothing to show" />;
  return <>{children(state.data)}</>;
}

export function JsonBlock({ value }: { value: unknown }) {
  return <pre className="json">{JSON.stringify(value, null, 2)}</pre>;
}

export function Bar({ value, max, ember }: { value: number; max: number; ember?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`bar ${ember ? "ember" : ""}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Kv({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chain({ nodes, activeIndex = -1 }: { nodes: string[]; activeIndex?: number }) {
  return (
    <div className="chain">
      {nodes.map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          <span className={`chain-node ${i === activeIndex ? "active" : ""}`}>{n}</span>
          {i < nodes.length - 1 && <span className="chain-arrow">→</span>}
        </span>
      ))}
    </div>
  );
}
