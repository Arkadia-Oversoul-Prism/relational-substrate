import * as ep from "../api/endpoints";
import { useAsync, usePolling } from "../lib/hooks";
import { Async, Bar, Card, Chain, ErrorBanner, Kv, Pill, Stat, StatusPill } from "../components/ui";
import { fmtNumber, fmtRelative, fmtTime, shortHash } from "../lib/format";

const LINEAGE = ["SOURCE", "CAPTURE", "CANONICAL", "PROVENANCE", "INTERPRETATION", "AUTHORITY", "AUTHORIZATION", "EXECUTION", "EVIDENCE", "VERIFICATION"];

export function Overview() {
  const metrics = usePolling(() => ep.metrics(), 10000);
  const knowledge = usePolling(() => ep.knowledgeStatus(), 20000);
  const lab = useAsync(() => ep.labOverview(), []);
  const stellar = usePolling(() => ep.stellar(), 30000);
  const loops = useAsync(() => ep.openLoops(), []);

  const m = metrics.data;
  const k = knowledge.data;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="Substrate liveness">
        <div className="grid cols-4">
          <Stat
            label="Heartbeat"
            value={<span className="row" style={{ gap: 8 }}><span className={`dot ${m || knowledge ? "ok" : "warn"}`} />{metrics.error ? "unreachable" : "radiant"}</span>}
            sub={m ? `resonance sampled ${new Date(m.ts * 1000).toLocaleTimeString()}` : "awaiting sample"}
          />
          <Stat label="Workers alive" value={fmtNumber(m?.workers.alive)} sub={m?.workers.goal_scheduler ? "goal scheduler active" : "goal scheduler idle"} />
          <Stat label="Jobs" value={fmtNumber(m?.jobs.total)} sub={m ? `${m.jobs.completed} completed · ${m.jobs.running} running · ${m.jobs.pending} pending` : "—"} />
          <Stat label="Goals active" value={fmtNumber(m?.goals_active)} sub={m ? `${m.plans.plans_total} plans · ${m.plans.plans_llm} llm · ${m.plans.plans_fallback} fallback` : "—"} />
        </div>
      </Card>

      <Card title="Causal lineage — forward direction">
        <p className="small dim" style={{ marginTop: 0 }}>
          Facts enter through a declared source, become content-addressed captures, are interpreted into canonical records, and every downstream
          action stays traceable to that origin. This console renders the chain; the substrate enforces it in code.
        </p>
        <Chain nodes={LINEAGE} activeIndex={2} />
      </Card>

      <div className="grid cols-2">
        <Card title="Knowledge OS" actions={k && <StatusPill status={k.status} />}>
          <ErrorBanner error={knowledge.error} />
          {k && (
            <div className="grid cols-2" style={{ gap: 12 }}>
              <Stat label="Notes" value={fmtNumber(k.vault.notes)} sub={`${k.vault.chunks} chunks`} />
              <Stat label="Graph edges" value={fmtNumber(k.graph.edges)} sub={`density ${k.graph_density?.toFixed(3)}`} />
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="row between tiny faint mb" style={{ marginBottom: 6 }}>
                  <span>embedding coverage</span>
                  <span className="mono">{(k.indexing_status.coverage * 100).toFixed(1)}%</span>
                </div>
                <Bar value={k.indexing_status.coverage} max={1} />
                <div className="tiny faint mt">
                  {k.indexing_status.complete} complete · {k.indexing_status.pending} pending · {k.indexing_status.failed} failed
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Kv
                  items={[
                    ["graph health", <StatusPill status={k.graph_health} />],
                    ["ontology", `${k.ontology.node_types_count} node types · ${k.ontology.relationship_types_count} relationships`],
                    ["last ingestion", fmtRelative(k.last_ingestion)],
                  ]}
                />
              </div>
            </div>
          )}
        </Card>

        <Card title="Engineering Lab" actions={lab.data && <StatusPill status={lab.data.status} />}>
          <Async state={lab}>
            {(d) => (
              <div className="grid cols-2" style={{ gap: 12 }}>
                <Stat label="Components" value={fmtNumber(d.architecture.components)} sub={`${d.architecture.modules} modules`} />
                <Stat label="Routes served" value={fmtNumber(d.architecture.routes)} sub={`${d.architecture.services} services`} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Kv
                    items={[
                      ["repository head", shortHash(d.repository_head)],
                      ["working tree", <Pill tone={d.repository.clean ? "ok" : "warn"}>{d.repository.clean ? "clean" : "dirty"}</Pill>],
                      ["patterns", `${d.patterns.length} detected`],
                      ["canon sources", `${d.canon.sources.length} loaded`],
                      ["observed", fmtTime(d.observed_at)],
                    ]}
                  />
                </div>
              </div>
            )}
          </Async>
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Authority ceiling" actions={<Pill tone="warn">LAB_AUTHORITY_CEILING = 2</Pill>}>
          <Async state={lab}>
            {(d) => (
              <>
                <p className="small dim" style={{ marginTop: 0 }}>
                  The substrate represents authority up to level {d.governance.maximum_authority} (PREPARE). It cannot originate authority,
                  merge, deploy, or self-authorize. Every execution run terminates at <span className="mono">READY_FOR_REVIEW</span>; the
                  transition to <span className="mono">COMPLETED</span> is forbidden by construction.
                </p>
                <div className="grid cols-2">
                  <div className="row between"><span className="tiny faint">autonomous mutation</span><Pill tone={d.governance.autonomous_mutation ? "err" : "ok"}>{String(d.governance.autonomous_mutation)}</Pill></div>
                  <div className="row between"><span className="tiny faint">production mutation</span><Pill tone={d.governance.production_mutation ? "err" : "ok"}>{String(d.governance.production_mutation)}</Pill></div>
                  <div className="row between"><span className="tiny faint">approval required</span><Pill tone="info">{String(d.governance.approval_required)}</Pill></div>
                  <div className="row between"><span className="tiny faint">secrets redacted</span><Pill tone="ok">{String(d.security.values_redacted)}</Pill></div>
                </div>
              </>
            )}
          </Async>
        </Card>

        <Card title="Celestial readout" actions={stellar.data && <Pill tone="info">{stellar.data.ark_date?.display}</Pill>}>
          <Async state={stellar}>
            {(d) => (
              <Kv
                items={[
                  ["coordinate", d.ark_date?.coordinate ?? "—"],
                  ["epoch", d.ark_date?.epoch ?? "—"],
                  ["completion", `${d.ark_date?.ark_completion_pct ?? "—"}%`],
                  ["linear utc", fmtTime(d.ark_date?.linear_utc)],
                  ["schumann bands", String(d.schumann?.bands?.length ?? "—")],
                ]}
              />
            )}
          </Async>
        </Card>
      </div>

      <Card title="Open loops" actions={loops.data && <Pill tone="muted">{loops.data.total} parsed</Pill>}>
        <Async state={loops}>
          {(d) =>
            d.total === 0 ? (
              <div className="small faint">No open loops in <span className="mono">{d.source}</span> (parsed {fmtTime(d.parsed_at)}).</div>
            ) : (
              <div className="small dim">{d.total} loops across {d.groups.length} groups.</div>
            )
          }
        </Async>
      </Card>
    </div>
  );
}
