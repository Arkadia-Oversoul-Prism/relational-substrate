import { useState } from "react";
import * as ep from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../lib/hooks";
import { Async, Card, Empty, JsonBlock, Pill, Stat } from "../components/ui";
import { fmtRelative } from "../lib/format";

export function Commune() {
  const { user } = useAuth();
  const threads = useAsync(() => ep.communeThreads(), []);
  const transmissions = useAsync(() => ep.transmissions(50), []);
  const inbox = useAsync(() => (user ? ep.messagesInbox() : Promise.resolve({ conversations: [] })), [user?.uid]);
  const [selected, setSelected] = useState<string | null>(null);
  const messages = useAsync(() => (selected ? ep.communeMessages(selected) : Promise.resolve({ messages: [] })), [selected]);

  const list = threads.data?.threads ?? [];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid cols-3">
        <Stat label="Threads" value={list.length} sub="Arkana commune" />
        <Stat label="Transmissions" value={transmissions.data?.total ?? 0} sub="social feed" />
        <Stat label="Conversations" value={inbox.data?.conversations.length ?? 0} sub="ReasoMate inbox" />
      </div>

      <div className="grid cols-2">
        <Card title="Threads" actions={<button className="btn sm" onClick={threads.reload}>reload</button>}>
          <Async state={threads} empty={(d) => d.threads.length === 0}>
            {() => (
              <div className="scroll-list">
                {list.map((t) => (
                  <div key={t.thread_uuid} className={`list-row ${selected === t.thread_uuid ? "active" : ""}`} onClick={() => setSelected(t.thread_uuid)}>
                    <div className="small">{t.title ?? "(untitled thread)"}</div>
                    <div className="tiny faint mono mt">{t.thread_uuid}</div>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </Card>

        <Card title="Thread messages" actions={selected && <Pill tone="muted">{selected.slice(0, 8)}</Pill>}>
          {selected ? (
            <Async state={messages} empty={(d) => d.messages.length === 0}>
              {() => <JsonBlock value={messages.data?.messages} />}
            </Async>
          ) : (
            <Empty icon="⌘" title="Select a thread" hint="Threads are first-class: list, create, and read messages through /api/commune/threads." />
          )}
        </Card>
      </div>

      <Card title="Transmissions" actions={transmissions.data && <Pill tone="muted">{transmissions.data.total}</Pill>}>
        <Async state={transmissions} empty={(d) => d.transmissions.length === 0}>
          {() => <JsonBlock value={transmissions.data?.transmissions} />}
        </Async>
      </Card>

      <Card title="ReasoMate inbox">
        {user ? (
          <Async state={inbox} empty={(d) => d.conversations.length === 0}>
            {() => <JsonBlock value={inbox.data?.conversations} />}
          </Async>
        ) : (
          <Empty icon="✉" title="Authentication required" hint="Peer-to-peer messaging (/api/messages/*) is scoped to the resolved identity. Sign in to populate the inbox." />
        )}
      </Card>

      <Card title="Last transmission sync">
        <span className="tiny faint">{transmissions.data ? "feed loaded" : "—"} · {fmtRelative(new Date().toISOString())}</span>
      </Card>
    </div>
  );
}
