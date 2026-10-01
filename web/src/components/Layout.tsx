import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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

/** Primary destinations surfaced in the mobile bottom bar. */
const MOBILE_TABS: NavEntry[] = [
  { to: "/", label: "Overview", icon: "◉" },
  { to: "/knowledge", label: "Knowledge", icon: "❖" },
  { to: "/lab", label: "Lab", icon: "⚙" },
  { to: "/kernel", label: "Kernel", icon: "∞" },
];

function titleFor(path: string): string {
  if (TITLES[path]) return TITLES[path];
  const base = "/" + path.split("/")[1];
  return TITLES[base] ?? "Arkadia";
}

function isTabActive(tab: string, path: string): boolean {
  if (tab === "/") return path === "/";
  if (tab === "/knowledge") return path === "/knowledge" || path.startsWith("/knowledge/");
  return path === tab;
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const hb = usePolling(() => ep.heartbeat(), 15000);
  const st = usePolling(() => ep.solspireStatus(), 30000);
  const [drawer, setDrawer] = useState(false);

  const online = hb.data?.status === "radiant" && !hb.error;
  const title = titleFor(location.pathname);
  // Routes outside the primary tabs are reached through the "More" drawer, so
  // highlight "More" there — otherwise the bar gives no sense of location.
  const inPrimary = MOBILE_TABS.some((t) => isTabActive(t.to, location.pathname));

  // Close the drawer whenever the route changes.
  useEffect(() => setDrawer(false), [location.pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="shell">
      {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)} />}

      <aside className={`sidebar ${drawer ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">🜂</div>
          <div className="brand-text">
            <span className="brand-title">Arkadia Substrate</span>
            <span className="brand-sub">console v0.1</span>
          </div>
          <button className="drawer-close" aria-label="Close navigation" onClick={() => setDrawer(false)}>
            ✕
          </button>
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
          <button className="topbar-menu" aria-label="Open navigation" onClick={() => setDrawer(true)}>
            <span />
            <span />
            <span />
          </button>
          <h1>{title}</h1>
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

        <nav className="bottom-nav">
          {MOBILE_TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={`bottom-tab ${isTabActive(t.to, location.pathname) ? "active" : ""}`}
            >
              <span className="bottom-icon">{t.icon}</span>
              <span className="bottom-label">{t.label}</span>
            </NavLink>
          ))}
          <button
            className={`bottom-tab ${!inPrimary ? "active" : ""}`}
            onClick={() => setDrawer(true)}
            aria-label="More navigation"
          >
            <span className="bottom-icon">☰</span>
            <span className="bottom-label">More</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
