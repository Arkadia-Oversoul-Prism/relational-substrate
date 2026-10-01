import { useState } from "react";
import * as ep from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAsync } from "../lib/hooks";
import { Card, Empty, ErrorBanner, Loading, Pill } from "../components/ui";
import { fmtNumber } from "../lib/format";

type Mode = "fulltext" | "semantic";

interface SemanticHit {
  score: number;
  chunk_id: number;
  note_id: number;
  content: string;
  title: string;
  note_type: string;
}

export function KnowledgeSearch() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("fulltext");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Error | null>(null);
  const [fulltext, setFulltext] = useState<{ title: string; note_type: string; vault_path: string }[] | null>(null);
  const [semantic, setSemantic] = useState<SemanticHit[] | null>(null);

  async function run() {
    if (!q.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      if (mode === "fulltext") {
        setFulltext(await ep.searchFulltext(q));
        setSemantic(null);
      } else {
        setSemantic(await ep.searchSemantic(q));
        setFulltext(null);
      }
    } catch (e) {
      setErr(e instanceof ApiError ? new Error(e.message) : (e as Error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card title="Search the vault">
        <div className="row wrap" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 0 }}>
            <button className={`btn ${mode === "fulltext" ? "primary" : "ghost"}`} style={{ borderRadius: "6px 0 0 6px" }} onClick={() => setMode("fulltext")}>
              Fulltext
            </button>
            <button className={`btn ${mode === "semantic" ? "primary" : "ghost"}`} style={{ borderRadius: "0 6px 6px 0", borderLeft: "none" }} onClick={() => setMode("semantic")}>
              Semantic
            </button>
          </div>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="query the corpus…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <button className="btn primary" onClick={run} disabled={busy || !q.trim()}>
            {busy ? <span className="spinner" /> : "Search"}
          </button>
        </div>
        <p className="tiny faint mt" style={{ marginBottom: 0 }}>
          Fulltext matches the SQLite FTS index; semantic ranks chunk embeddings by cosine similarity. Semantic results require a populated
          embedding index — a fresh vault shows partial coverage.
        </p>
      </Card>

      <Card title="Results">
        <ErrorBanner error={err} />
        {busy && <Loading label="Searching…" />}

        {!busy && fulltext && (
          fulltext.length === 0 ? (
            <Empty icon="⌕" title="No fulltext matches" />
          ) : (
            <div className="table-wrap">
<table className="table">
              <thead><tr><th>Title</th><th>Type</th><th>Vault path</th></tr></thead>
              <tbody>
                {fulltext.map((r, i) => (
                  <tr key={i}>
                    <td>{r.title}</td>
                    <td><Pill tone="muted">{r.note_type}</Pill></td>
                    <td className="faint mono tiny">{r.vault_path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          )
        )}

        {!busy && semantic && (
          semantic.length === 0 ? (
            <Empty icon="⌕" title="No semantic matches" />
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              {semantic.map((r) => (
                <div key={r.chunk_id} className="card" style={{ background: "var(--bg-inset)" }}>
                  <div className="row between">
                    <strong className="small">{r.title}</strong>
                    <Pill tone="info">score {r.score.toFixed(3)}</Pill>
                  </div>
                  <div className="tiny faint mono mt">note #{r.note_id} · chunk #{r.chunk_id} · {r.note_type}</div>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12, margin: "8px 0 0", color: "var(--ink-dim)" }}>
                    {r.content.length > 400 ? r.content.slice(0, 400) + "…" : r.content}
                  </pre>
                </div>
              ))}
            </div>
          )
        )}

        {!busy && !fulltext && !semantic && (
          <div className="grid cols-2">
            <EmbeddingStatus />
            <ProviderPanel />
          </div>
        )}
      </Card>
    </div>
  );
}

function EmbeddingStatus() {
  const emb = useAsync(() => ep.embeddingsStatus(), []);
  const data = emb.data;
  return (
    <div>
      <div className="card-title">Embedding index</div>
      {data ? (
        <dl className="kv">
          <dt>total chunks</dt><dd>{fmtNumber(data.total)}</dd>
          <dt>complete</dt><dd>{fmtNumber(data.complete)}</dd>
          <dt>pending</dt><dd>{fmtNumber(data.pending)}</dd>
          <dt>backlog</dt><dd>{fmtNumber(data.backlog)}</dd>
          <dt>coverage</dt><dd>{(data.coverage * 100).toFixed(1)}%</dd>
        </dl>
      ) : (
        <span className="small faint">unavailable</span>
      )}
    </div>
  );
}

function ProviderPanel() {
  const prov = useAsync(() => ep.providers(), []);
  const data: { name: string; display_name: string; authenticated: boolean }[] | null = prov.data;
  return (
    <div>
      <div className="card-title">Model providers</div>
      {data ? (
        <div className="grid" style={{ gap: 6 }}>
          {data.map((p) => (
            <div key={p.name} className="row between">
              <span className="small">{p.display_name}</span>
              <Pill tone={p.authenticated ? "ok" : "muted"}>{p.authenticated ? "authenticated" : "unconfigured"}</Pill>
            </div>
          ))}
        </div>
      ) : (
        <span className="small faint">unavailable</span>
      )}
    </div>
  );
}
