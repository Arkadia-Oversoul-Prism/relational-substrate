import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { usePolling } from "../lib/hooks";
import * as ep from "../api/endpoints";
import { Pill } from "./ui";

interface NavEntry {
  to: string;
  label: string;
  icon: string;
  badge?: string;
}

const NAV: { group: string; items: NavEntry[] }[] = [
  {
    group: "Observatory",
    items: [
      { to: "/", label: "Overview", icon: "◉" },
      { to: "/celestial", label: "Celestial", icon: "✦" },
      { to: "/routes", label: "Route Surface", icon: "⌘" },
    ],
  },
  {
    group: "Knowledge OS",
    items: [
      { to: "/knowledge", label: "Notes", icon: "❖" },
      { to: "/knowledge/graph", label: "Graph", icon: "⁂" },
      { to: "/knowledge/search", label: "Search", icon: "⌕" },
    ],
  },
  {
    group: "Substrate",
    items: [
      { to: "/lab", label: "Engineering Lab", icon: "⚙" },
      { to: "/spire", label: "SolSpire", icon: "◇" },
      { to: "/kernel", label: "Kernel Loop", icon: "∞" },
      { to: "/commune", label: "Commune", icon: "✉" },
    ],
  },
  {
    group: "Boundary",
    items: [
      { to: "/governance", label: "Governance", icon: "§" },
      { to: "/identity", label: "Identity", icon: "◈" },
      { to: "/sources", label: "Sources", icon: "⇄" },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/celestial": "Celestial Cartography",
  "/routes": "Route Surface",
  "/knowledge": "Knowledge OS · Notes",
  "/knowledge/graph": "Knowledge OS · Graph",
  "/knowledge/search": "Knowledge OS · Search",
  "/lab": "Engineering Lab",
  "/spire": "SolSpire Console",
  "/kernel": "Kernel Loop",
  "/commune": "Arkana Commune",
  "/governance": "Governance Boundary",
  "/identity": "Identity",
  "/sources": "Sources & Providers",
};

function titleFor(path: string): string {
  if (TITLES[path]) return TITLES[path];
  const base = "/" + path.split("/")[1];
  return TITLES[base] ?? "Arkadia";
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const hb = usePolling(() => ep.heartbeat(), 15000);
  const st = usePolling(() => ep.solspireStatus(), 30000);

  const online = hb.data?.status === "radiant" && !hb.error;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🜂</div>
          <div className="brand-text">
            <span className="brand-title">Arkadia Substrate</span>
            <span className="brand-sub">console v0.1</span>
          </div>
        </div>

        {NAV.map((group) => (
          <nav className="nav-group" key={group.group}>
            <div className="nav-group-title">{group.group}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to === "/knowledge"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        ))}

        <div className="nav-group" style={{ marginTop: 20 }}>
          <div className="nav-group-title">Session</div>
          <div className="row" style={{ padding: "6px 10px", gap: 8 }}>
            <span className={`dot ${online ? "ok" : "err"}`} />
            <span className="tiny dim">{online ? "backend radiant" : "backend unreachable"}</span>
          </div>
          {user ? (
            <div className="row between" style={{ padding: "6px 10px" }}>
              <div className="tiny">
                <div className="dim">{user.display_name || user.uid.slice(0, 8)}</div>
                <div className="faint mono">{user.role} · L{user.access_level}</div>
              </div>
              <button className="btn ghost sm" onClick={signOut}>
                exit
              </button>
            </div>
          ) : (
            <NavLink to="/signin" className="nav-item">
              <span className="nav-icon">⚿</span> Sign in
            </NavLink>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{titleFor(location.pathname)}</h1>
          <div className="spacer" />
          <div className="topbar-meta">
            {st.data && (
              <span>
                kernel {st.data.version?.kernel ?? "—"} · phase {st.data.phase} · provider {st.data.providers?.active ?? "—"}
              </span>
            )}
          </div>
          {hb.data && <Pill tone={online ? "ok" : "err"}>{hb.data.status}</Pill>}
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
