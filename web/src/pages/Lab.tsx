import { useState } from "react";
import * as ep from "../api/endpoints";
import type { EngineeringOverview, LabOverview as LabOverviewData } from "../api/types";
import { useAsync } from "../lib/hooks";
import type { AsyncState } from "../lib/hooks";
import { Async, Card, Chain, Empty, JsonBlock, Kv, Pill, Stat, StatusPill } from "../components/ui";
import { fmtNumber, fmtTime, shortHash } from "../lib/format";

const TABS = ["Overview", "Sessions", "Automations", "Gateway", "Voice", "Integrations"] as const;
type Tab = (typeof TABS)[number];

export function Lab() {
  const [tab, setTab] = useState<Tab>("Overview");
  const lab = useAsync(() => ep.labOverview(), []);
  const eng = useAsync(() => ep.engineeringOverview(), []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row between">
        <div className="row wrap" style={{ gap: 6 }}>
          {TABS.map((t) => (
            <button key={t} className={`btn ${tab === t ? "primary" : "ghost"}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <Pill tone="warn">authority ceiling · PREPARE (2)</Pill>
      </div>

      {tab === "Overview" && <LabOverview lab={lab} eng={eng} />}
      {tab === "Sessions" && <LabSessions />}
      {tab === "Automations" && <LabAutomations />}
      {tab === "Gateway" && <LabGateway />}
      {tab === "Voice" && <LabVoice />}
      {tab === "Integrations" && <LabIntegrations />}
    </div>
  );
}

function LabOverview({ lab, eng }: { lab: AsyncState<LabOverviewData>; eng: AsyncState<EngineeringOverview> }) {
  return (
    <>
      <Async state={lab}>
        {(d) => (
          <div className="grid" style={{ gap: 16 }}>
            <div className="grid cols-4">
              <Stat label="Components" value={fmtNumber(d.architecture.components)} sub={`${d.architecture.modules} modules`} />
              <Stat label="Routes" value={fmtNumber(d.architecture.routes)} sub={`${d.architecture.execution_paths} execution paths`} />
              <Stat label="Graph entities" value={fmtNumber(d.graph.entities)} sub={`${d.graph.relationships} relationships`} />
              <Stat label="Patterns" value={fmtNumber(d.patterns.length)} sub="structural findings" />
            </div>

            <div className="grid cols-2">
              <Card title="Repository">
                <Kv
                  items={[
                    ["branch", d.repository.branch],
                    ["head", shortHash(d.repository_head)],
                    ["working tree", <Pill tone={d.repository.clean ? "ok" : "warn"}>{d.repository.clean ? "clean" : "dirty"}</Pill>],
                    ["status", <StatusPill status={d.repository.status} />],
                    ["observed", fmtTime(d.observed_at)],
                    ["schema", d.schema_version],
                  ]}
                />
              </Card>

              <Card title="Governance">
                <div className="grid" style={{ gap: 10 }}>
                  <div className="row between"><span className="small dim">maximum authority</span><Pill tone="warn">{d.governance.maximum_authority} · PREPARE</Pill></div>
                  <div className="row between"><span className="small dim">autonomous mutation</span><Pill tone={d.governance.autonomous_mutation ? "err" : "ok"}>{String(d.governance.autonomous_mutation)}</Pill></div>
                  <div className="row between"><span className="small dim">production mutation</span><Pill tone={d.governance.production_mutation ? "err" : "ok"}>{String(d.governance.production_mutation)}</Pill></div>
                  <div className="row between"><span className="small dim">approval required</span><Pill tone="info">{String(d.governance.approval_required)}</Pill></div>
                </div>
              </Card>
            </div>

            <Card title="Deployment surface">
              <div className="row wrap" style={{ gap: 8 }}>
                {Object.entries(d.deployments.platforms).map(([k, v]) => (
                  <Pill key={k} tone={v ? "ok" : "muted"}>{k}: {String(v)}</Pill>
                ))}
              </div>
              <div className="chips mt">
                {d.deployments.files.map((f) => <span className="chip" key={f}>{f}</span>)}
              </div>
            </Card>

            <Card title="Structural patterns">
              {d.patterns.length === 0 ? (
                <Empty icon="◌" title="No patterns detected" />
              ) : (
                <table className="table">
                  <thead><tr><th>Pattern</th><th>Severity</th><th>Confidence</th><th>Evidence</th></tr></thead>
                  <tbody>
                    {d.patterns.map((p) => (
                      <tr key={p.id}>
                        <td className="mono tiny">{p.type}</td>
                        <td>
                          <Pill tone={p.severity === "high" ? "err" : p.severity === "medium" ? "warn" : "muted"}>{p.severity}</Pill>
                        </td>
                        <td className="mono">{p.confidence.toFixed(2)}</td>
                        <td className="tiny faint">{p.evidence.slice(0, 4).join(", ")}{p.evidence.length > 4 ? ` (+${p.evidence.length - 4})` : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Security observations" actions={<Pill tone="ok">values redacted</Pill>}>
              <div className="scroll-list" style={{ maxHeight: 260 }}>
                <table className="table">
                  <thead><tr><th>Path</th><th>Signals</th></tr></thead>
                  <tbody>
                    {d.security.observations.map((o) => (
                      <tr key={o.path}>
                        <td className="mono tiny">{o.path}</td>
                        <td><div className="chips">{o.signals.map((s) => <span className="chip" key={s}>{s}</span>)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Async>

      <Card title="Engineering loop">
        <Async state={eng}>
          {(d) => <Chain nodes={d.loop} />}
        </Async>
        <p className="tiny faint mt" style={{ marginBottom: 0 }}>
          The loop terminates at REVIEW; the substrate cannot advance a run to COMPLETED. MERGE and PRODUCTION_DEPLOY are human-only intents.
        </p>
      </Card>
    </>
  );
}

function LabSessions() {
  const sessions = useAsync(() => ep.sessions(), []);
  const agents = useAsync(() => ep.agents(), []);
  const artifacts = useAsync(() => ep.artifacts(), []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid cols-3">
        <Stat label="Sessions" value={fmtNumber((sessions.data?.sessions ?? []).length)} />
        <Stat label="Agents" value={fmtNumber((agents.data?.agents ?? []).length)} />
        <Stat label="Artifacts" value={fmtNumber(artifacts.data?.count)} />
      </div>
      <div className="grid cols-2">
        <Card title="Governed sessions">
          <Async state={sessions} empty={(d) => d.sessions.length === 0}>
            {() => <JsonBlock value={sessions.data?.sessions} />}
          </Async>
        </Card>
        <Card title="Agents">
          <Async state={agents} empty={(d) => d.agents.length === 0}>
            {() => <JsonBlock value={agents.data?.agents} />}
          </Async>
        </Card>
      </div>
      <Card title="Artifacts">
        <Async state={artifacts} empty={(d) => d.artifacts.length === 0}>
          {() => <JsonBlock value={artifacts.data?.artifacts} />}
        </Async>
      </Card>
    </div>
  );
}

function LabAutomations() {
  const auto = useAsync(() => ep.automations(), []);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Async state={auto}>
        {(d) => (
          <>
            <Card title="Automation grammar">
              <Chain nodes={d.grammar.grammar} />
              <div className="grid cols-2 mt">
                <Kv
                  items={[
                    ["may prepare consequential action", <Pill tone="info">{String(d.grammar.may_prepare_consequential_action)}</Pill>],
                    ["may authorize consequential action", <Pill tone={d.grammar.may_authorize_consequential_action ? "err" : "ok"}>{String(d.grammar.may_authorize_consequential_action)}</Pill>],
                    ["final transition", <span className="mono">{d.grammar.final_transition}</span>],
                  ]}
                />
                <div>
                  <div className="card-title">Trigger kinds</div>
                  <div className="chips">{d.grammar.trigger_kinds.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
                  <div className="card-title mt">States</div>
                  <div className="chips">{d.grammar.states.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
                </div>
              </div>
            </Card>
            <Card title="Registered automations">
              {d.automations.length === 0 ? (
                <Empty icon="⚙" title="No automations registered" hint="Automations may prepare consequential action but may never authorize it." />
              ) : (
                <JsonBlock value={d.automations} />
              )}
            </Card>
          </>
        )}
      </Async>
    </div>
  );
}

function LabGateway() {
  const gw = useAsync(() => ep.gateway(), []);
  return (
    <Async state={gw}>
      {(d) => (
        <div className="grid" style={{ gap: 16 }}>
          <div className="grid cols-3">
            <Card title="Local providers">
              <div className="chips">{d.local_providers.map((p) => <span className="chip" key={p}>{p}</span>)}</div>
            </Card>
            <Card title="Remote providers">
              <div className="chips">{d.remote_providers.map((p) => <span className="chip" key={p}>{p}</span>)}</div>
            </Card>
            <Card title="Agent providers">
              <div className="chips">{d.agent_providers.map((p) => <span className="chip" key={p}>{p}</span>)}</div>
            </Card>
          </div>
          <Card title="Provider catalog" actions={<Pill tone="muted">{d.catalog.length} entries</Pill>}>
            <table className="table">
              <thead><tr><th>Provider</th><th>Model</th><th>Class</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {d.catalog.map((c) => (
                  <tr key={`${c.provider}-${c.model}`}>
                    <td className="mono">{c.provider}</td>
                    <td className="mono tiny">{c.model}</td>
                    <td><Pill tone="muted">{c.config_class}</Pill></td>
                    <td><StatusPill status={c.status} /></td>
                    <td className="tiny faint">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </Async>
  );
}

function LabVoice() {
  const voice = useAsync(() => ep.engineeringVoice(), []);
  return (
    <Async state={voice}>
      {(d) => {
        const intents = (d.intents as string[]) ?? [];
        const humanOnly = (d.human_only_intents as string[]) ?? [];
        return (
          <div className="grid" style={{ gap: 16 }}>
            <Card title="Voice boundary">
              <Kv
                items={[
                  ["surface", String(d.surface ?? "—")],
                  ["provider neutral", <Pill tone={d.provider_neutral ? "ok" : "warn"}>{String(d.provider_neutral)}</Pill>],
                  ["recognizer", <StatusPill status={String(d.recognizer_state ?? "unknown")} />],
                  ["human authority preserved", <Pill tone={d.human_authority_preserved ? "ok" : "err"}>{String(d.human_authority_preserved)}</Pill>],
                ]}
              />
              <p className="tiny faint mt">{String(d.detail ?? "")}</p>
            </Card>
            <Card title="Intents">
              <div className="grid cols-2">
                <div>
                  <div className="card-title">Recognized</div>
                  <div className="chips">
                    {intents.map((i) => (
                      <span className="chip" key={i} style={humanOnly.includes(i) ? { borderColor: "#ff6b7f66", color: "#ffb3bd" } : undefined}>
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="card-title">Human-only</div>
                  <div className="chips">{humanOnly.map((i) => <span className="chip" key={i}>{i}</span>)}</div>
                </div>
              </div>
            </Card>
            <Card title="Raw boundary payload"><JsonBlock value={d} /></Card>
          </div>
        );
      }}
    </Async>
  );
}

function LabIntegrations() {
  const integ = useAsync(() => ep.integrations(), []);
  return (
    <Async state={integ}>
      {(d) => {
        const adapters = (d.adapters as Record<string, { provider: string; state: string; detail: string; credential_source: string | null }>) ?? {};
        return (
          <div className="grid" style={{ gap: 16 }}>
            <Card title="Adapters">
              <table className="table">
                <thead><tr><th>Provider</th><th>State</th><th>Detail</th></tr></thead>
                <tbody>
                  {Object.values(adapters).map((a) => (
                    <tr key={a.provider}>
                      <td className="mono">{a.provider}</td>
                      <td><StatusPill status={a.state} /></td>
                      <td className="tiny faint">{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <div className="error-banner" style={{ background: "#4fd6e012", borderColor: "#4fd6e044", color: "#9fe8ef" }}>
              {String(d.note ?? "External services remain authoritative for their own data.")}
            </div>
            <Card title="Raw payload"><JsonBlock value={d} /></Card>
          </div>
        );
      }}
    </Async>
  );
}
