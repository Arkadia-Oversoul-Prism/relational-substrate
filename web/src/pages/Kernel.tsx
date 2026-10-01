import { useAsync, usePolling } from "../lib/hooks";
import * as ep from "../api/endpoints";
import { Async, Card, Empty, JsonBlock, Pill, Stat, StatusPill } from "../components/ui";
import { fmtNumber, fmtRelative } from "../lib/format";

export function Kernel() {
  const metrics = usePolling(() => ep.metrics(), 8000);
  const jobs = useAsync(() => ep.jobs(), []);
  const goals = useAsync(() => ep.goals(), []);
  const tools = useAsync(() => ep.tools(), []);

  const m = metrics.data;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Runtime telemetry" actions={m && <Pill tone="info">polled 8s</Pill>}>
        <div className="grid cols-4">
          <Stat label="Workers alive" value={fmtNumber(m?.workers.alive)} sub={m?.workers.goal_scheduler ? "goal scheduler on" : "goal scheduler off"} />
          <Stat label="Queue depth" value={fmtNumber(m?.jobs.queue_depth)} sub={`${m?.jobs.pending ?? 0} pending`} />
          <Stat label="Plans" value={fmtNumber(m?.plans.plans_total)} sub={`${m?.plans.plans_llm ?? 0} llm · ${m?.plans.plans_fallback ?? 0} fallback`} />
          <Stat label="Goal runs" value={fmtNumber(m?.goals.goal_runs_total)} sub={`${m?.goals.goal_runs_success ?? 0} ok · ${m?.goals.goal_runs_failed ?? 0} failed`} />
        </div>
      </Card>

      <Card title="Job ledger" actions={<button className="btn sm" onClick={jobs.reload}>reload</button>}>
        <Async state={jobs} empty={(d) => d.jobs.length === 0}>
          {(d) => (
            <table className="table">
              <thead><tr><th>Job</th><th>Status</th><th>Intent</th><th>Source</th></tr></thead>
              <tbody>
                {d.jobs.map((j) => (
                  <tr key={j.job_id}>
                    <td className="mono tiny">{j.job_id}</td>
                    <td><StatusPill status={j.status} /></td>
                    <td className="mono tiny">{j.intent?.type}</td>
                    <td className="faint tiny">{j.source ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Async>
      </Card>

      <div className="grid cols-2">
        <Card title="Goals" actions={goals.data && <Pill tone="muted">{goals.data.active} active</Pill>}>
          <Async state={goals} empty={(d) => d.goals.length === 0}>
            {() => <JsonBlock value={goals.data?.goals} />}
          </Async>
        </Card>

        <Card title="Tool registry" actions={tools.data && <Pill tone="muted">{tools.data.tools.length} tools</Pill>}>
          <Async state={tools} empty={(d) => d.tools.length === 0}>
            {(d) => (
              <div className="grid" style={{ gap: 12 }}>
                {d.tools.map((t) => (
                  <div key={t.name} className="card" style={{ background: "var(--bg-inset)" }}>
                    <div className="mono" style={{ color: "var(--cyan)" }}>{t.name}</div>
                    <div className="small faint mt">{t.description}</div>
                    <div className="mt">
                      {Object.entries(t.payload_schema).map(([k, v]) => (
                        <div key={k} className="tiny mono">
                          <span style={{ color: "var(--violet)" }}>{k}</span> <span className="faint">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </Card>
      </div>

      <Card title="Job trace">
        <Async state={jobs} empty={(d) => d.jobs.length === 0}>
          {(d) =>
            d.jobs[0] ? (
              <>
                <div className="tiny faint mb">trace for most recent job <span className="mono">{d.jobs[0].job_id}</span></div>
                <JsonBlock value={d.jobs[0].trace ?? d.jobs[0].result ?? d.jobs[0]} />
              </>
            ) : (
              <Empty icon="∞" title="No jobs to trace" />
            )
          }
        </Async>
      </Card>

      <Card title="Last observed">
        <div className="tiny faint">telemetry timestamp {m ? fmtRelative(new Date(m.ts * 1000).toISOString()) : "—"}</div>
      </Card>
    </div>
  );
}
