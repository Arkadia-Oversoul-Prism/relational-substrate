import * as ep from "../api/endpoints";
import { useAsync } from "../lib/hooks";
import { Async, Card, Chain, Empty, JsonBlock, Pill, Stat, StatusPill } from "../components/ui";

// Vocabulary mirrored from lab/engineering_lab/contracts.py. These are exposed
// here so the boundary is rendered truthfully rather than inferred from data.
const NON_COLLAPSES: [string, string][] = [
  ["SESSION", "AUTHORIZATION"],
  ["CAPABILITY", "AUTHORIZATION"],
  ["PROMPT", "AUTHORIZATION"],
  ["IMPLEMENTED", "VERIFIED"],
  ["VERIFIED", "MERGED"],
  ["MERGED", "DEPLOYED"],
  ["PREPARATION", "PASSSPEC"],
  ["PASSSPEC", "K15"],
  ["K15", "K3"],
  ["RUNNING", "COMPLETED"],
];

const AUTHORITY_LEVELS: [number, string, string][] = [
  [0, "OBSERVE", "read-only"],
  [1, "SUGGEST", "propose"],
  [2, "PREPARE", "ceiling — reachable"],
  [3, "BUILD", "beyond ceiling"],
  [4, "OPEN_PR", "beyond ceiling"],
  [5, "MERGE", "human-only"],
  [6, "DEPLOY", "human-only"],
  [7, "BOUNDED_AUTONOMY", "reserved / not active"],
];

const CHECKPOINT_STATES = [
  "PROPOSED", "AUTHORIZED", "QUEUED", "RUNNING", "CHECKPOINTED", "VERIFYING",
  "READY_FOR_REVIEW", "REVISION_REQUIRED", "BLOCKED", "FAILED", "COMPLETED", "ABORTED", "EXPIRED",
];

const FORBIDDEN: [string, string][] = [
  ["AUTHORIZED", "COMPLETED"],
  ["COMPLETED", "AUTHORIZED"],
  ["READY_FOR_REVIEW", "COMPLETED"],
];

const HUMAN_ONLY = ["MERGE", "PRODUCTION_DEPLOY", "AUTHORIZE", "SCOPE_EXPANSION", "IDENTITY_BOUNDARY"];

const ROLES: Record<string, { description: string; permissions: string[] }> = {
  Flamekeeper: { description: "Sovereign overseer; grants high-level governance and approvals.", permissions: ["Govern", "Propose"] },
  Weaver: { description: "Primary agent for code formation and repository operations; non-authoritative for governance.", permissions: ["Read", "Propose"] },
  Witness: { description: "Observer role providing attestations and audit perspectives.", permissions: ["Read"] },
  Guest: { description: "External or unauthenticated users with strictly read access to public Gate resources.", permissions: ["Read"] },
};

const BOUNDARIES: Record<string, { description: string; scope: string; allowed_roles: string[] }> = {
  Gate: { description: "Public-facing, read-only surface for status and non-sensitive information.", scope: "public", allowed_roles: ["Guest", "Weaver", "Witness", "Flamekeeper"] },
  Sanctum: { description: "Protected internal area for metadata and safe engine exports. Read-only for most agents.", scope: "protected", allowed_roles: ["Weaver", "Flamekeeper", "Witness"] },
  Engine: { description: "Restricted host environment controlling the core engine; access limited to governance-designated principals.", scope: "restricted", allowed_roles: ["Weaver", "Flamekeeper"] },
};

export function Governance() {
  const lab = useAsync(() => ep.labOverview(), []);
  const approvals = useAsync(() => ep.approvals(), []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Authority ceiling" actions={<Pill tone="warn">LAB_AUTHORITY_CEILING = 2</Pill>}>
        <p className="small dim" style={{ marginTop: 0 }}>
          The substrate cannot originate authority. It represents authority up to level 2 (PREPARE) and records — but never self-sets — the
          human-only levels. This is a design invariant of the code, not a policy layered on top of it.
        </p>
        <table className="table">
          <thead><tr><th>Level</th><th>Name</th><th>Reachability</th></tr></thead>
          <tbody>
            {AUTHORITY_LEVELS.map(([lvl, name, note]) => (
              <tr key={lvl}>
                <td className="mono">{lvl}</td>
                <td className="mono">{name}</td>
                <td>
                  <Pill tone={lvl <= 2 ? "ok" : lvl <= 4 ? "warn" : lvl === 7 ? "muted" : "err"}>{note}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid cols-2">
        <Card title="Non-collapse doctrine">
          <p className="tiny faint" style={{ marginTop: 0 }}>
            A state on the left never implies the state on the right without the intervening human act.
          </p>
          <div className="grid" style={{ gap: 8 }}>
            {NON_COLLAPSES.map(([a, b]) => (
              <div key={`${a}-${b}`} className="row" style={{ gap: 8 }}>
                <span className="chain-node">{a}</span>
                <span className="faint">≠</span>
                <span className="chain-node">{b}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Forbidden direct transitions">
          <p className="tiny faint" style={{ marginTop: 0 }}>
            The substrate fails closed: these transitions raise a boundary violation rather than silently degrading.
          </p>
          <div className="grid" style={{ gap: 8 }}>
            {FORBIDDEN.map(([a, b]) => (
              <div key={`${a}-${b}`} className="row" style={{ gap: 8 }}>
                <span className="chain-node">{a}</span>
                <span className="faint">⇏</span>
                <span className="chain-node" style={{ borderColor: "#ff6b7f66", color: "#ffb3bd" }}>{b}</span>
              </div>
            ))}
          </div>
          <div className="card-title mt">Human-only operations</div>
          <div className="chips">{HUMAN_ONLY.map((h) => <span className="chip" key={h}>{h}</span>)}</div>
        </Card>
      </div>

      <Card title="Checkpoint states (AEAS §5)">
        <Chain nodes={CHECKPOINT_STATES} activeIndex={6} />
        <p className="tiny faint mt" style={{ marginBottom: 0 }}>
          <span className="mono">READY_FOR_REVIEW</span> is the terminal state reachable by the substrate. <span className="mono">COMPLETED</span> is
          a human-accepted terminal the substrate never self-sets.
        </p>
      </Card>

      <div className="grid cols-2">
        <Card title="Governance roles">
          <table className="table">
            <thead><tr><th>Role</th><th>Permissions</th></tr></thead>
            <tbody>
              {Object.entries(ROLES).map(([name, r]) => (
                <tr key={name}>
                  <td>{name}<div className="tiny faint">{r.description}</div></td>
                  <td><div className="chips">{r.permissions.map((p) => <span className="chip" key={p}>{p}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Boundaries">
          <div className="grid" style={{ gap: 12 }}>
            {Object.entries(BOUNDARIES).map(([name, b]) => (
              <div key={name} className="card" style={{ background: "var(--bg-inset)" }}>
                <div className="row between">
                  <strong>{name}</strong>
                  <Pill tone={b.scope === "public" ? "ok" : b.scope === "protected" ? "warn" : "err"}>{b.scope}</Pill>
                </div>
                <div className="small faint mt">{b.description}</div>
                <div className="chips mt">{b.allowed_roles.map((r) => <span className="chip" key={r}>{r}</span>)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Approvals queue" actions={approvals.data && <Pill tone="muted">{approvals.data.approvals.length}</Pill>}>
        <Async state={approvals} empty={(d) => d.approvals.length === 0}>
          {(d) => (
            <table className="table">
              <thead><tr><th>Approval</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {d.approvals.map((a) => (
                  <tr key={a.approval_id}>
                    <td className="mono tiny">{a.approval_id}</td>
                    <td><StatusPill status={a.status} /></td>
                    <td><JsonBlock value={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Async>
      </Card>

      <Card title="Live governance readout">
        <Async state={lab}>
          {(d) => (
            <div className="grid cols-4">
              <Stat label="Max authority" value={d.governance.maximum_authority} sub="PREPARE" />
              <Stat label="Autonomous mutation" value={String(d.governance.autonomous_mutation)} sub="declared" />
              <Stat label="Production mutation" value={String(d.governance.production_mutation)} sub="declared" />
              <Stat label="Approval required" value={String(d.governance.approval_required)} sub="declared" />
            </div>
          )}
        </Async>
      </Card>

      <Card title="Governance manifest">
        <Empty icon="§" title="Declarative artifacts" hint="governance/*.json (manifest, roles, boundaries, permissions, autonomy) are served through the lab overview and the /api/tools surface, not a dedicated route." />
      </Card>
    </div>
  );
}
