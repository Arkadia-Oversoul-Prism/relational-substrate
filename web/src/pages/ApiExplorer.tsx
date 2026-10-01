import { useMemo, useState } from "react";
import * as ep from "../api/endpoints";
import { api, ApiError } from "../api/client";
import { useAsync } from "../lib/hooks";
import { Card, ErrorBanner, JsonBlock, Pill, Stat } from "../components/ui";

interface Op {
  method: string;
  path: string;
  summary?: string;
  tags: string[];
  params: { name: string; required: boolean; in: string }[];
  requestSchema?: string;
  operationId?: string;
}

const METHOD_TONE: Record<string, "ok" | "info" | "warn" | "err" | "muted"> = {
  get: "info",
  post: "ok",
  put: "warn",
  patch: "warn",
  delete: "err",
};

function groupOf(path: string): string {
  if (path.startsWith("/solspire")) return "SolSpire";
  if (path.startsWith("/api/lab")) return "Engineering Lab";
  if (path.startsWith("/api/knowledge")) return "Knowledge OS";
  if (path.startsWith("/api/commune") || path.startsWith("/api/messages") || path.startsWith("/api/transmissions") || path.startsWith("/api/social")) return "Commune";
  if (path.startsWith("/api/me") || path.startsWith("/api/nodes") || path.startsWith("/api/codex")) return "Identity";
  if (path.startsWith("/api/goals") || path.startsWith("/api/jobs") || path.startsWith("/api/plan") || path.startsWith("/api/agent")) return "Kernel";
  if (path.startsWith("/api/keys") || path.startsWith("/api/provider-keys") || path.startsWith("/api/tts") || path.startsWith("/api/sources") || path.startsWith("/api/tools")) return "Providers";
  if (path.startsWith("/api/distribution")) return "Distribution";
  if (path.startsWith("/api/ims") || path.startsWith("/api/products")) return "IMS & Products";
  if (path.startsWith("/api")) return "Other API";
  return "Root";
}

export function ApiExplorer() {
  const spec = useAsync(() => ep.openapiSpec(), []);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("");
  const [selected, setSelected] = useState<Op | null>(null);

  const ops = useMemo<Op[]>(() => {
    const s = spec.data as { paths?: Record<string, Record<string, Record<string, unknown>>> } | null;
    if (!s?.paths) return [];
    const out: Op[] = [];
    for (const [path, methods] of Object.entries(s.paths)) {
      for (const [method, raw] of Object.entries(methods)) {
        const op = raw as Record<string, unknown>;
        out.push({
          method: method.toUpperCase(),
          path,
          summary: op.summary as string | undefined,
          tags: (op.tags as string[]) ?? [],
          operationId: op.operationId as string | undefined,
          params: ((op.parameters as Record<string, unknown>[]) ?? []).map((p) => ({
            name: p.name as string,
            required: Boolean(p.required),
            in: p.in as string,
          })),
          requestSchema:
            ((op.requestBody as { content?: Record<string, { schema?: { $ref?: string } }> })?.content?.["application/json"]?.schema?.$ref as string) ?? undefined,
        });
      }
    }
    return out.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }, [spec.data]);

  const groups = useMemo(() => {
    const counts: Record<string, number> = {};
    ops.forEach((o) => {
      const g = groupOf(o.path);
      counts[g] = (counts[g] ?? 0) + 1;
    });
    return counts;
  }, [ops]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ops.filter((o) => {
      if (group && groupOf(o.path) !== group) return false;
      if (!needle) return true;
      return o.path.toLowerCase().includes(needle) || o.method.toLowerCase().includes(needle) || (o.summary ?? "").toLowerCase().includes(needle);
    });
  }, [ops, q, group]);

  const info = (spec.data as { info?: { title?: string; version?: string } } | null)?.info;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid cols-4">
        <Stat label="Operations" value={ops.length} sub="served by api.main:app" />
        <Stat label="Paths" value={new Set(ops.map((o) => o.path)).size} />
        <Stat label="Groups" value={Object.keys(groups).length} />
        <Stat label="Spec title" value={<span style={{ fontSize: 14 }}>{info?.title ?? "—"}</span>} sub={`v${info?.version ?? "?"}`} />
      </div>

      <Card title="Route surface">
        <div className="row wrap" style={{ gap: 10 }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="filter by path, method, or summary…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" style={{ width: 200 }} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">all groups ({ops.length})</option>
            {Object.entries(groups).sort().map(([g, n]) => (
              <option key={g} value={g}>{g} ({n})</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="split">
        <Card title={`${visible.length} operations`}>
          <div className="scroll-list" style={{ maxHeight: 620 }}>
            {visible.map((o) => (
              <div key={`${o.method} ${o.path}`} className={`list-row ${selected === o ? "active" : ""}`} onClick={() => setSelected(o)}>
                <div className="row" style={{ gap: 8 }}>
                  <Pill tone={METHOD_TONE[o.method.toLowerCase()] ?? "muted"}>{o.method}</Pill>
                  <span className="mono tiny" style={{ wordBreak: "break-all" }}>{o.path}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div>
          {selected ? <OpDetail op={selected} /> : <Card title="Operation detail"><div className="small faint">Select an operation to inspect its parameters and try read-only requests.</div></Card>}
        </div>
      </div>
    </div>
  );
}

function OpDetail({ op }: { op: Op }) {
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<{ status: number | string; body: unknown } | null>(null);
  const [err, setErr] = useState<Error | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const pathParams = op.params.filter((p) => p.in === "path");
  const queryParams = op.params.filter((p) => p.in === "query");
  const canTry = op.method === "GET";

  async function tryIt() {
    setBusy(true);
    setErr(null);
    setResp(null);
    try {
      let path = op.path;
      for (const p of pathParams) {
        path = path.replace(`{${p.name}}`, encodeURIComponent(paramValues[p.name] ?? ""));
      }
      const query: Record<string, string> = {};
      for (const p of queryParams) {
        if (paramValues[p.name]) query[p.name] = paramValues[p.name];
      }
      const data = await api.get<unknown>(path, { query });
      setResp({ status: 200, body: data });
    } catch (e) {
      if (e instanceof ApiError) {
        setResp({ status: e.status, body: e.detail });
      } else {
        setErr(e as Error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card title="Operation">
        <div className="row wrap" style={{ gap: 8 }}>
          <Pill tone={METHOD_TONE[op.method.toLowerCase()] ?? "muted"}>{op.method}</Pill>
          <span className="mono" style={{ wordBreak: "break-all" }}>{op.path}</span>
        </div>
        {op.summary && <div className="small dim mt">{op.summary}</div>}
        {op.operationId && <div className="tiny faint mono mt">operationId: {op.operationId}</div>}
        {op.tags.length > 0 && (
          <div className="chips mt">{op.tags.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
        )}
      </Card>

      {(pathParams.length > 0 || queryParams.length > 0) && (
        <Card title="Parameters">
          <div className="grid" style={{ gap: 10 }}>
            {[...pathParams, ...queryParams].map((p) => (
              <div className="field" key={`${p.in}-${p.name}`} style={{ marginBottom: 0 }}>
                <label className="label">
                  <span className="mono">{p.name}</span> <span className="faint">· {p.in}</span> {p.required && <Pill tone="warn">required</Pill>}
                </label>
                <input className="input" value={paramValues[p.name] ?? ""} onChange={(e) => setParamValues((v) => ({ ...v, [p.name]: e.target.value }))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {op.requestSchema && (
        <Card title="Request body schema">
          <div className="mono tiny faint">{op.requestSchema.split("/").pop()}</div>
          <div className="tiny faint mt">This console executes read-only (GET) requests. Mutating operations are described but not invoked.</div>
        </Card>
      )}

      <Card
        title="Try request"
        actions={
          <button className="btn primary sm" onClick={tryIt} disabled={!canTry || busy}>
            {busy ? <span className="spinner" /> : canTry ? "Send GET" : "read-only console"}
          </button>
        }
      >
        <ErrorBanner error={err} />
        {resp ? (
          <>
            <div className="row between mb">
              <span className="tiny faint">response</span>
              <Pill tone={typeof resp.status === "number" && resp.status < 400 ? "ok" : "err"}>{resp.status}</Pill>
            </div>
            <JsonBlock value={resp.body} />
          </>
        ) : (
          <div className="small faint">
            {canTry ? "Enter any parameters above and send the request." : "Only GET operations are executable from this console; the surface is shown for completeness."}
          </div>
        )}
      </Card>
    </div>
  );
}
