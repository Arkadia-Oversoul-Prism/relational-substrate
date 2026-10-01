import { useMemo, useState } from "react";
import * as ep from "../api/endpoints";
import type { KnowledgeNote } from "../api/types";
import { useAsync } from "../lib/hooks";
import { Async, Card, Empty, Pill, StatusPill } from "../components/ui";
import { fmtRelative, parseJsonArray } from "../lib/format";

const TYPE_TONES: Record<string, string> = {
  note: "info",
  document: "muted",
  task: "warn",
};

export function KnowledgeNotes() {
  const [selected, setSelected] = useState<KnowledgeNote | null>(null);
  const [filter, setFilter] = useState<string>("");
  const notes = useAsync(() => ep.knowledgeNotes(200), []);

  const types = useMemo(() => {
    const set = new Set<string>();
    notes.data?.forEach((n) => set.add(n.note_type));
    return Array.from(set).sort();
  }, [notes.data]);

  const visible = useMemo(() => {
    if (!notes.data) return [];
    return notes.data.filter((n) => !filter || n.note_type === filter);
  }, [notes.data, filter]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Card
        title="Vault notes"
        actions={
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">all types</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button className="btn sm" onClick={notes.reload}>reload</button>
          </div>
        }
      >
        <Async state={notes} empty={(d) => d.length === 0}>
          {(d) => (
            <>
              <div className="tiny faint mb">
                {visible.length} of {d.length} notes · {types.length} types
              </div>
              <div className="split">
                <div className="scroll-list" style={{ border: "1px solid var(--line-soft)", borderRadius: "var(--radius-sm)" }}>
                  {visible.map((n) => (
                    <div
                      key={n.uuid}
                      className={`list-row ${selected?.uuid === n.uuid ? "active" : ""}`}
                      onClick={() => setSelected(n)}
                    >
                      <div className="row between" style={{ gap: 8 }}>
                        <span className="small" style={{ fontWeight: 500 }}>{n.title}</span>
                        <Pill tone={(TYPE_TONES[n.note_type] as "info" | "muted" | "warn") ?? "muted"}>{n.note_type}</Pill>
                      </div>
                      <div className="tiny faint mono" style={{ marginTop: 3 }}>
                        #{n.id} · {n.vault_path?.split("/").pop()}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  {selected ? <NoteDetail note={selected} /> : <Empty icon="❖" title="Select a note" hint="Notes are the canonical records the Knowledge OS interprets captures into." />}
                </div>
              </div>
            </>
          )}
        </Async>
      </Card>
    </div>
  );
}

function NoteDetail({ note }: { note: KnowledgeNote }) {
  const tags = parseJsonArray(note.tags);
  const participants = parseJsonArray(note.participants);
  const provenance = useAsync(() => ep.traverse(note.id, 1), [note.id]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div>
        <div className="row between">
          <h2 style={{ margin: 0, fontSize: 17 }}>{note.title}</h2>
          <StatusPill status={note.note_type} />
        </div>
        <div className="tiny faint mono mt">
          uuid {note.uuid} · id {note.id} · created {fmtRelative(note.created_at)}
        </div>
      </div>

      <div className="card" style={{ background: "var(--bg-inset)" }}>
        <div className="card-title">Content</div>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12.5, margin: 0, color: "var(--ink-dim)" }}>
          {note.content}
        </pre>
      </div>

      <div className="grid cols-2">
        <Card title="Tags">
          {tags.length ? (
            <div className="chips">
              {tags.map((t) => (
                <span className="chip" key={t}>{t}</span>
              ))}
            </div>
          ) : (
            <span className="small faint">none</span>
          )}
        </Card>
        <Card title="Participants">
          {participants.length ? (
            <div className="chips">
              {participants.map((p) => (
                <span className="chip" key={p}>{p}</span>
              ))}
            </div>
          ) : (
            <span className="small faint">none declared</span>
          )}
        </Card>
      </div>

      <Card title="Provenance projection">
        <p className="tiny faint" style={{ marginTop: 0 }}>
          The graph node carrying this record exposes its canonical capture provenance — the checksum, the declared source, and authorship
          stored exactly as declared or UNKNOWN (never inferred).
        </p>
        <Async state={provenance}>
          {(g) => {
            const node = g.nodes?.find((n) => n.uuid === note.uuid) ?? g.nodes?.[0];
            if (!node?.provenance) return <span className="small faint">No provenance node in projection.</span>;
            const p = node.provenance;
            return (
              <dl className="kv">
                <dt>capture uuid</dt><dd>{p.capture_uuid}</dd>
                <dt>raw checksum</dt><dd>{p.raw_checksum}</dd>
                <dt>capture status</dt><dd><StatusPill status={p.capture_status} /></dd>
                <dt>captured by</dt><dd>{p.captured_by} ({p.captured_by_kind})</dd>
                <dt>authored by</dt><dd>{p.authored_by ?? <span className="faint">UNKNOWN</span>} ({p.authored_by_kind})</dd>
                <dt>source</dt><dd>{p.source?.source_uuid ?? "—"} {p.source?.label ? `· ${p.source.label}` : ""}</dd>
                <dt>captured at</dt><dd>{p.captured_at}</dd>
              </dl>
            );
          }}
        </Async>
      </Card>
    </div>
  );
}
