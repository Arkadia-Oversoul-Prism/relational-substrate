import { useState } from "react";
import * as ep from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAsync } from "../lib/hooks";
import type { AsyncState } from "../lib/hooks";
import { Async, Card, Empty, ErrorBanner, JsonBlock, Kv, Pill, Stat, StatusPill } from "../components/ui";
import { fmtNumber, fmtTime, fmtRelative } from "../lib/format";

const TABS = ["Console", "Workspace", "WorkEvents", "Proposals", "Pulses", "Syntheses", "Providers", "Sources", "Enterprises"] as const;
type Tab = (typeof TABS)[number];

export function SolSpire() {
  const [tab, setTab] = useState<Tab>("Console");
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row wrap" style={{ gap: 6 }}>
        {TABS.map((t) => (
          <button key={t} className={`btn ${tab === t ? "primary" : "ghost"}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Console" && <Console />}
      {tab === "Workspace" && <Workspace />}
      {tab === "WorkEvents" && <WorkEvents />}
      {tab === "Proposals" && <Proposals />}
      {tab === "Pulses" && <Pulses />}
      {tab === "Syntheses" && <Syntheses />}
      {tab === "Providers" && <Providers />}
      {tab === "Sources" && <Sources />}
      {tab === "Enterprises" && <Enterprises />}
    </div>
  );
}

/** Render the canonical-workspace prerequisite error truthfully. */
function WorkspaceGate({ state }: { state: AsyncState<unknown> }) {
  if (state.error instanceof ApiError && state.error.isConflict) {
    return (
      <Empty
        icon="◇"
        title="Canonical workspace required"
        hint="This surface is bound to a canonical SolSpire workspace. None exists for this subject yet, so the substrate returns 409 rather than fabricating one."
      />
    );
  }
  return <ErrorBanner error={state.error} />;
}

function Console() {
  const status = useAsync(() => ep.solspireStatus(), []);
  const projects = useAsync(() => ep.solspireProjects(), []);
  const exec = useAsync(() => ep.solspireExecutions(), []);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Async state={status}>
        {(d) => (
          <>
            <div className="grid cols-4">
              <Stat label="Active provider" value={<span className="mono" style={{ fontSize: 18 }}>{d.providers.active}</span>} sub={`${d.providers.available.length} available`} />
              <Stat label="Projects" value={fmtNumber(d.projects.active_count)} sub="active" />
              <Stat label="Executions" value={fmtNumber(d.executions.total)} sub={`${d.executions.active} active`} />
              <Stat label="Milestone" value={`${d.milestone}/${d.phase}`} sub="milestone / phase" />
            </div>
            <div className="grid cols-2">
              <Card title="Component versions">
                <Kv items={Object.entries(d.version).map(([k, v]) => [k, v] as [string, string])} />
              </Card>
              <Card title="Token usage">
                <div className="grid" style={{ gap: 8 }}>
                  {Object.entries(d.providers.token_usage).map(([p, n]) => (
                    <div className="row between" key={p}>
                      <span className="small mono">{p}</span>
                      <span className="mono">{fmtNumber(n)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </Async>

      <div className="grid cols-2">
        <Card title="Projects" actions={projects.data && <Pill tone="muted">{projects.data.count}</Pill>}>
          <Async state={projects} empty={(d) => d.projects.length === 0}>
            {() => <JsonBlock value={projects.data?.projects} />}
          </Async>
        </Card>
        <Card title="Executions" actions={exec.data && <Pill tone="muted">{exec.data.active} active</Pill>}>
          <Async state={exec} empty={(d) => d.executions.length === 0}>
            {() => <JsonBlock value={exec.data?.executions} />}
          </Async>
        </Card>
      </div>
    </div>
  );
}

function Workspace() {
  const ws = useAsync(() => ep.solspireWorkspace(), []);
  return (
    <Card title="Canonical workspace">
      <Async state={ws}>
        {(d) => (
          <>
            <div className="grid cols-2">
              <Kv
                items={[
                  ["id", d.workspace.id],
                  ["type", d.workspace.workspace_type],
                  ["subject ref", d.workspace.canonical_subject_ref],
                  ["display name", d.workspace.display_name],
                  ["lifecycle", <StatusPill status={d.workspace.lifecycle} />],
                  ["created", fmtTime(new Date(d.workspace.created_at * 1000).toISOString())],
                ]}
              />
              <div className="grid" style={{ gap: 10 }}>
                <div className="row between"><span className="small dim">canonical</span><Pill tone={d.canonical ? "ok" : "warn"}>{String(d.canonical)}</Pill></div>
                <div className="row between"><span className="small dim">subject binding</span><Pill tone="info">{d.subject_binding}</Pill></div>
              </div>
            </div>
            <div className="mt"><JsonBlock value={d} /></div>
          </>
        )}
      </Async>
    </Card>
  );
}

function WorkEvents() {
  const ev = useAsync(() => ep.workevents(), []);
  const wl = useAsync(() => ep.workloads(), []);
  const events = ev.data?.work_events ?? ev.data?.workevents ?? [];
  const workloads = wl.data?.workloads ?? [];
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="WorkEvent spine" actions={<Pill tone="muted">{events.length} events</Pill>}>
        <WorkspaceGate state={ev} />
        {!ev.error && events.length === 0 && <Empty icon="∞" title="No work events" hint="WorkEvents are the immutable spine: every event carries actor, artifact, state-before and state-after refs." />}
        {events.length > 0 && (
          <table className="table">
            <thead><tr><th>Event</th><th>Type</th><th>Status</th><th>Occurred</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.work_event_id}>
                  <td className="mono tiny">{e.work_event_id}</td>
                  <td>{e.event_type}</td>
                  <td><StatusPill status={e.status} /></td>
                  <td className="faint tiny">{fmtRelative(e.occurred_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Canonical workloads" actions={<Pill tone="muted">{workloads.length}</Pill>}>
        <WorkspaceGate state={wl} />
        {!wl.error && workloads.length === 0 && <Empty icon="◇" title="No workloads" />}
        {workloads.length > 0 && <JsonBlock value={workloads} />}
      </Card>
    </div>
  );
}

function Proposals() {
  const p = useAsync(() => ep.solspireProposals(), []);
  const items = (p.data?.proposals ?? []) as Record<string, unknown>[];
  return (
    <Card title="Proposals" actions={<Pill tone="muted">{items.length}</Pill>}>
      <WorkspaceGate state={p} />
      {!p.error && items.length === 0 && <Empty icon="§" title="No proposals" hint="A proposal requests a decision; it does not carry authority." />}
      {items.length > 0 && <JsonBlock value={items} />}
    </Card>
  );
}

function Pulses() {
  const p = useAsync(() => ep.pulses(), []);
  const today = useAsync(() => ep.pulses(), []);
  const items = (p.data?.pulses ?? []) as Record<string, unknown>[];
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Daily pulses" actions={<Pill tone="muted">{items.length}</Pill>}>
        <WorkspaceGate state={p} />
        {!p.error && items.length === 0 && <Empty icon="◉" title="No pulses recorded" />}
        {items.length > 0 && <JsonBlock value={items} />}
      </Card>
      <Card title="Today">
        <WorkspaceGate state={today} />
      </Card>
    </div>
  );
}

function Syntheses() {
  const s = useAsync(() => ep.syntheses(), []);
  const items = (s.data?.syntheses ?? []) as Record<string, unknown>[];
  return (
    <Card title="Weekly syntheses" actions={<Pill tone="muted">{items.length}</Pill>}>
      <WorkspaceGate state={s} />
      {!s.error && items.length === 0 && <Empty icon="✦" title="No syntheses" hint="A synthesis consolidates source pulses and events into a reviewable summary." />}
      {items.length > 0 && <JsonBlock value={items} />}
    </Card>
  );
}

function Providers() {
  const p = useAsync(() => ep.solspireProviders(), []);
  return (
    <Async state={p}>
      {(d) => (
        <div className="grid cols-2">
          <Card title="Active provider">
            <div className="stat-value mono">{d.active}</div>
            <div className="card-title mt">Available</div>
            <div className="chips">{d.providers.map((x) => <span className="chip" key={x}>{x}</span>)}</div>
          </Card>
          <Card title="Token usage">
            <div className="grid" style={{ gap: 8 }}>
              {Object.entries(d.token_usage).map(([k, v]) => (
                <div className="row between" key={k}><span className="small mono">{k}</span><span className="mono">{fmtNumber(v)}</span></div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Async>
  );
}

function Sources() {
  const s = useAsync(() => ep.solspireSources(), []);
  return (
    <Card title="Connected sources">
      <Async state={s} empty={(d) => d.sources.length === 0}>
        {(d) => (
          <table className="table">
            <thead><tr><th>Source</th><th>Kind</th><th>Status</th><th>Configured</th><th>Last sync</th></tr></thead>
            <tbody>
              {d.sources.map((x) => (
                <tr key={x.source ?? x.name}>
                  <td>{x.label ?? x.source ?? x.name}</td>
                  <td className="faint tiny">{x.kind ?? "—"}</td>
                  <td><StatusPill status={x.status ?? (x.configured ? "connected" : "disconnected")} /></td>
                  <td><Pill tone={x.configured ? "ok" : "muted"}>{String(x.configured)}</Pill></td>
                  <td className="faint tiny">{fmtRelative(x.last_sync)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
    </Card>
  );
}

function Enterprises() {
  const e = useAsync(() => ep.enterprises(), []);
  return (
    <Card title="Enterprise workspaces">
      <Async state={e} empty={(d) => d.enterprises.length === 0}>
        {() => <JsonBlock value={e.data?.enterprises} />}
      </Async>
    </Card>
  );
}
