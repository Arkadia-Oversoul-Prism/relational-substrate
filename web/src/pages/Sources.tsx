import * as ep from "../api/endpoints";
import { api } from "../api/client";
import { useAsync } from "../lib/hooks";
import { Async, Card, Empty, JsonBlock, Pill, Stat, StatusPill } from "../components/ui";
import { fmtBytes, fmtNumber, fmtRelative } from "../lib/format";

interface ProviderKeyRow {
  provider: string;
  label: string | null;
  masked: string | null;
  added_at: string | null;
  source: string;
  quota_hit: boolean;
}

interface TtsStatus {
  engine: string;
  ready: boolean;
  voices: string[];
  default: string;
  elevenlabs_active: boolean;
  edge_tts_active: boolean;
  preferred_engine: string;
}

export function Sources() {
  const sources = useAsync(() => ep.sources(), []);
  const keys = useAsync(() => api.get<{ keys: ProviderKeyRow[] }>("/api/provider-keys", { auth: false }), []);
  const pool = useAsync(() => api.get<Record<string, unknown>>("/api/keys/pool", { auth: false }), []);
  const tts = useAsync(() => api.get<TtsStatus>("/api/tts/status", { auth: false }), []);
  const tree = useAsync(() => ep.codexTree(), []);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Corpus sources">
        <Async state={sources} empty={(d) => d.sources.length === 0}>
          {(d) => (
            <div className="table-wrap">
<table className="table">
              <thead><tr><th>Source</th><th>Configured</th><th>Authenticated</th><th>Live</th><th>Repo</th></tr></thead>
              <tbody>
                {d.sources.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td><Pill tone={s.configured ? "ok" : "muted"}>{String(s.configured)}</Pill></td>
                    <td>{s.authenticated === undefined ? <span className="faint">—</span> : <Pill tone={s.authenticated ? "ok" : "warn"}>{String(s.authenticated)}</Pill>}</td>
                    <td>{s.live === undefined ? <span className="faint">—</span> : <Pill tone={s.live ? "ok" : "muted"}>{String(s.live)}</Pill>}</td>
                    <td className="faint tiny mono">{s.repo ?? "—"} {s.branch ? `@${s.branch}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          )}
        </Async>
      </Card>

      <div className="grid cols-2">
        <Card title="Provider keys" actions={<Pill tone="muted">masked</Pill>}>
          <Async state={keys} empty={(d) => d.keys.length === 0}>
            {(d) => (
              <div className="table-wrap">
<table className="table">
                <thead><tr><th>Provider</th><th>Source</th><th>Quota</th></tr></thead>
                <tbody>
                  {d.keys.map((k) => (
                    <tr key={k.provider}>
                      <td className="mono">{k.provider}</td>
                      <td><Pill tone={k.source === "none" ? "muted" : "ok"}>{k.source}</Pill></td>
                      <td>{k.quota_hit ? <Pill tone="err">exhausted</Pill> : <Pill tone="muted">ok</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
</div>
            )}
          </Async>
          <p className="tiny faint mt" style={{ marginBottom: 0 }}>
            Values are never returned — only a masked reference and the credential source. The substrate reports truthful integration state
            (UNAVAILABLE / UNCONFIGURED) rather than fabricating availability.
          </p>
        </Card>

        <Card title="Key pool" actions={pool.data && <Pill tone="info">{String((pool.data as { strategy?: string }).strategy ?? "")}</Pill>}>
          <Async state={pool}>
            {(d) => (
              <div className="grid cols-3">
                <Stat label="Size" value={fmtNumber(d.size as number)} />
                <Stat label="Available" value={fmtNumber(d.available as number)} />
                <Stat label="Cooled" value={fmtNumber((d.cooled as unknown[])?.length ?? 0)} />
              </div>
            )}
          </Async>
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Text-to-speech" actions={tts.data && <StatusPill status={tts.data.ready ? "ready" : "unconfigured"} />}>
          <Async state={tts}>
            {(d) => (
              <div className="grid" style={{ gap: 12 }}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <Pill tone="info">engine {d.engine}</Pill>
                  <Pill tone={d.elevenlabs_active ? "ok" : "muted"}>elevenlabs {String(d.elevenlabs_active)}</Pill>
                  <Pill tone={d.edge_tts_active ? "ok" : "muted"}>edge {String(d.edge_tts_active)}</Pill>
                  <Pill tone="muted">default {d.default}</Pill>
                </div>
                <div>
                  <div className="card-title">Voices</div>
                  <div className="chips">{d.voices.map((v) => <span className="chip" key={v}>{v}</span>)}</div>
                </div>
              </div>
            )}
          </Async>
        </Card>

        <Card title="Codex corpus tree" actions={tree.data && <Pill tone="muted">{tree.data.total} files</Pill>}>
          <Async state={tree} empty={(d) => d.files.length === 0}>
            {(d) => (
              <div className="scroll-list" style={{ maxHeight: 320 }}>
                <div className="table-wrap">
<table className="table">
                  <thead><tr><th>Path</th><th className="right">Size</th></tr></thead>
                  <tbody>
                    {d.files.slice(0, 120).map((f) => (
                      <tr key={f.sha}>
                        <td className="mono tiny">{f.path}</td>
                        <td className="right faint tiny">{fmtBytes(f.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
</div>
                {d.files.length > 120 && <div className="tiny faint mt">showing 120 of {d.total}</div>}
              </div>
            )}
          </Async>
        </Card>
      </div>

      <Card title="Distribution">
        <Empty icon="⇄" title="Release distribution surface" hint="The /api/distribution/* routes serve artist releases and covenant signing. They are documented in the Route Surface view and are currently empty on this deployment." />
      </Card>

      <Card title="Raw source payload">
        <Async state={sources}>
          {(d) => <JsonBlock value={d} />}
        </Async>
      </Card>
    </div>
  );
}

export function lastSyncLabel(v: string | null | undefined): string {
  return v ? fmtRelative(v) : "never";
}
