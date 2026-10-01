import { useEffect, useMemo, useRef, useState } from "react";
import * as ep from "../api/endpoints";
import type { GraphNode } from "../api/types";
import { useAsync } from "../lib/hooks";
import { Async, Card, JsonBlock, Pill, Stat, StatusPill } from "../components/ui";
import { fmtNumber } from "../lib/format";

interface SimNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
  node: GraphNode;
}

const TYPE_COLOR: Record<string, string> = {
  note: "#4fd6e0",
  document: "#a98bff",
  task: "#ffcc66",
};

function typeColor(t: string): string {
  return TYPE_COLOR[t] ?? "#ff7a45";
}

/** Deterministic force-directed layout — no external dependency. */
function layout(nodes: GraphNode[], edges: { source: number; target: number }[], w: number, h: number): SimNode[] {
  const sim: SimNode[] = nodes.map((n, i) => {
    const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
    const r = Math.min(w, h) * 0.32;
    return { id: n.id, x: w / 2 + r * Math.cos(angle), y: h / 2 + r * Math.sin(angle), vx: 0, vy: 0, degree: 0, node: n };
  });
  const byId = new Map(sim.map((s) => [s.id, s]));
  for (const e of edges) {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (a) a.degree++;
    if (b) b.degree++;
  }

  for (let iter = 0; iter < 220; iter++) {
    const alpha = 0.12 * (1 - iter / 220);
    // repulsion
    for (let i = 0; i < sim.length; i++) {
      for (let j = i + 1; j < sim.length; j++) {
        const a = sim[i];
        const b = sim[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = 1;
        }
        const d = Math.sqrt(d2);
        const force = (9000 / d2) * alpha;
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    // spring attraction
    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const force = ((d - 90) / d) * 0.02 * alpha;
      const fx = dx * force;
      const fy = dy * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
    // centering + integrate
    for (const s of sim) {
      s.vx += (w / 2 - s.x) * 0.004 * alpha;
      s.vy += (h / 2 - s.y) * 0.004 * alpha;
      s.vx *= 0.82;
      s.vy *= 0.82;
      s.x = Math.max(24, Math.min(w - 24, s.x + s.vx));
      s.y = Math.max(24, Math.min(h - 24, s.y + s.vy));
    }
  }
  return sim;
}

export function KnowledgeGraph() {
  const graph = useAsync(() => ep.knowledgeGraph(), []);
  const rel = useAsync(() => ep.relationships(), []);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 900;
  const H = 560;
  const simRef = useRef<SimNode[]>([]);

  const edges = useMemo(() => {
    const raw = graph.data?.edges ?? [];
    return raw
      .map((e) => ({ source: Number(e.source_note_id), target: Number(e.target_note_id) }))
      .filter((e) => Number.isFinite(e.source) && Number.isFinite(e.target));
  }, [graph.data]);

  useEffect(() => {
    if (graph.data) simRef.current = layout(graph.data.nodes, edges, W, H);
  }, [graph.data, edges]);

  const sim = simRef.current;
  const byId = useMemo(() => new Map(sim.map((s) => [s.id, s])), [sim]);
  const maxDegree = useMemo(() => Math.max(1, ...sim.map((s) => s.degree)), [sim]);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid cols-4">
        <Stat label="Nodes" value={fmtNumber(graph.data?.nodes.length)} sub={rel.data ? `${rel.data.summary.total_nodes} in summary` : ""} />
        <Stat label="Edges" value={fmtNumber(edges.length)} sub={rel.data ? `avg degree ${rel.data.summary.average_degree}` : ""} />
        <Stat label="Components" value={fmtNumber(rel.data?.summary.connected_components)} sub="connected subgraphs" />
        <Stat label="Density" value={graph.data ? rel.data?.summary.graph_density?.toFixed(3) ?? "—" : "—"} sub="edges / possible" />
      </div>

      <Card
        title="Graph projection"
        actions={
          <div className="row" style={{ gap: 8 }}>
            {Object.entries(TYPE_COLOR).map(([t, c]) => (
              <span key={t} className="row tiny" style={{ gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
                <span className="faint">{t}</span>
              </span>
            ))}
          </div>
        }
      >
        <Async state={graph} empty={(d) => d.nodes.length === 0}>
          {() => (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", background: "var(--bg-inset)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-soft)" }}>
              {edges.map((e, i) => {
                const a = byId.get(e.source);
                const b = byId.get(e.target);
                if (!a || !b) return null;
                const active = hover === e.source || hover === e.target || selected?.id === e.source || selected?.id === e.target;
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={active ? "#4fd6e0" : "#2b3050"}
                    strokeWidth={active ? 1.4 : 0.6}
                    opacity={active ? 0.9 : 0.35}
                  />
                );
              })}
              {sim.map((s) => {
                const r = 4 + (s.degree / maxDegree) * 12;
                const active = hover === s.id || selected?.id === s.id;
                return (
                  <g key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onClick={() => setSelected(s.node)} style={{ cursor: "pointer" }}>
                    <circle cx={s.x} cy={s.y} r={r + 3} fill="transparent" />
                    <circle cx={s.x} cy={s.y} r={r} fill={typeColor(s.node.note_type)} opacity={active ? 1 : 0.78} stroke={active ? "#fff" : "none"} strokeWidth={1.5} />
                    {active && (
                      <text x={s.x} y={s.y - r - 6} fill="#e7e9f5" fontSize={10} textAnchor="middle" fontFamily="var(--mono)">
                        {s.node.title.length > 28 ? s.node.title.slice(0, 27) + "…" : s.node.title}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </Async>
      </Card>

      <div className="grid cols-2">
        <Card title="Relationship distribution">
          <Async state={rel}>
            {(d) => (
              <div className="table-wrap">
<table className="table">
                <thead>
                  <tr><th>Type</th><th>Direction</th><th className="right">Count</th></tr>
                </thead>
                <tbody>
                  {d.relationship_distribution.map((r) => (
                    <tr key={r.type}>
                      <td>{r.display_name} <span className="faint mono tiny">{r.type}</span></td>
                      <td><Pill tone="muted">{r.direction}</Pill></td>
                      <td className="right mono">{fmtNumber(r.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
</div>
            )}
          </Async>
        </Card>

        <Card title={selected ? "Selected node" : "Top connected nodes"}>
          {selected ? (
            <div className="grid" style={{ gap: 10 }}>
              <div className="row between">
                <strong>{selected.title}</strong>
                <StatusPill status={selected.note_type} />
              </div>
              <div className="tiny faint mono">uuid {selected.uuid}</div>
              {selected.provenance && (
                <dl className="kv">
                  <dt>capture</dt><dd>{selected.provenance.capture_uuid}</dd>
                  <dt>checksum</dt><dd>{selected.provenance.raw_checksum}</dd>
                  <dt>status</dt><dd><StatusPill status={selected.provenance.capture_status} /></dd>
                  <dt>authored by</dt><dd>{selected.provenance.authored_by ?? "UNKNOWN"}</dd>
                </dl>
              )}
              <button className="btn sm" onClick={() => setSelected(null)}>clear</button>
            </div>
          ) : (
            <Async state={rel}>
              {(d) => (
                <div className="table-wrap">
<table className="table">
                  <thead><tr><th>Node</th><th>Type</th><th className="right">Degree</th></tr></thead>
                  <tbody>
                    {d.top_connected_nodes.map((n) => (
                      <tr key={n.id} style={{ cursor: "pointer" }} onClick={() => { const s = byId.get(n.id); if (s) setSelected(s.node); }}>
                        <td>{n.title}</td>
                        <td className="faint">{n.note_type}</td>
                        <td className="right mono">{n.degree}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
</div>
              )}
            </Async>
          )}
        </Card>
      </div>

      {selected?.provenance && (
        <Card title="Raw provenance envelope">
          <JsonBlock value={selected.provenance} />
        </Card>
      )}
    </div>
  );
}
