import { useState } from "react";
import * as ep from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../lib/hooks";
import { Async, Card, Empty, JsonBlock, Kv, Pill, StatusPill } from "../components/ui";

export function Identity() {
  const { user, authFailed } = useAuth();
  const spine = useAsync(() => ep.identitySpine(), []);
  const codex = useAsync(() => ep.myCodex(), []);
  const ais = useAsync(() => ep.aisProfile(), []);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!user) {
    return (
      <Card title="Identity">
        <Empty
          icon="◈"
          title={authFailed ? "Session not authenticated" : "Not signed in"}
          hint="Sign in with a bearer token (production) or a local development token to resolve your identity through the node registry."
        />
      </Card>
    );
  }

  async function save() {
    setErr(null);
    setSaved(null);
    try {
      await ep.patchMe({ display_name: displayName, username: username || undefined });
      setSaved("Profile updated.");
      setEditing(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Identity resolution">
        <div className="grid cols-2">
          <div>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div className="brand-mark" style={{ width: 46, height: 46, fontSize: 22 }}>{user.role_sigil || "◈"}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{user.display_name}</div>
                <div className="tiny faint mono">{user.uid}</div>
              </div>
            </div>
            <div className="row wrap mt" style={{ gap: 6 }}>
              <StatusPill status={user.status} />
              <Pill tone="info">{user.role}</Pill>
              <Pill tone={user.access_level >= 3 ? "warn" : "muted"}>access level {user.access_level}</Pill>
              {user.ims_id && <Pill tone="muted">IMS {user.ims_id}</Pill>}
              {user.profile_complete ? <Pill tone="ok">profile complete</Pill> : <Pill tone="warn">profile incomplete</Pill>}
            </div>
          </div>
          <Kv
            items={[
              ["email", user.email || "—"],
              ["username", user.username ?? "—"],
              ["node key", user.node_key ?? "—"],
              ["access tools", user.access_tools.length ? user.access_tools.join(", ") : "none"],
            ]}
          />
        </div>
        <p className="tiny faint mt" style={{ marginBottom: 0 }}>
          Authorship is stored exactly as declared, or UNKNOWN — never inferred. Identity here is the profile the substrate resolved from the
          token's declared claims, not a guessed match.
        </p>
      </Card>

      <Card title="Product profile" actions={<button className="btn sm" onClick={() => setEditing((v) => !v)}>{editing ? "cancel" : "edit"}</button>}>
        {err && <div className="error-banner mb">{err}</div>}
        {saved && <div className="pill ok mb">{saved}</div>}
        {editing ? (
          <div className="grid cols-2">
            <div className="field">
              <label className="label">Display name</label>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Username (handle)</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="lowercase, 2–32 chars" />
            </div>
            <div>
              <button className="btn primary" onClick={save}>Save</button>
            </div>
          </div>
        ) : (
          <Kv
            items={[
              ["display name", user.display_name || "—"],
              ["username", user.username ?? "—"],
              ["bio", user.bio ?? "—"],
            ]}
          />
        )}
      </Card>

      <div className="grid cols-2">
        <Card title="Identity spine">
          <Async state={spine}>
            {(d) => (
              <div className="grid" style={{ gap: 12 }}>
                <Kv
                  items={[
                    ["version", d.identity_spine.version],
                    ["canonical name", d.identity_spine.identity.canonical_name],
                    ["preferred name", d.identity_spine.identity.preferred_name],
                    ["role", d.identity_spine.identity.role],
                  ]}
                />
                <JsonBlock value={d.identity_spine} />
              </div>
            )}
          </Async>
        </Card>

        <Card title="A.I.S profile">
          <Async state={ais}>
            {(d) => (d.profile ? <JsonBlock value={d.profile} /> : <Empty icon="◈" title="No A.I.S profile" hint="The profile is created when an IMS session completes." />)}
          </Async>
        </Card>
      </div>

      <Card title="Personal Codex">
        <Async state={codex}>
          {(d) => <JsonBlock value={d} />}
        </Async>
        <p className="tiny faint mt" style={{ marginBottom: 0 }}>
          A 404 here is truthful: the codex exists only once the subject's IMS session has been completed. The substrate does not synthesize a
          placeholder.
        </p>
      </Card>
    </div>
  );
}
