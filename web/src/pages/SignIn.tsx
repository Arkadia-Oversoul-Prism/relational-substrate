import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Card, Pill } from "../components/ui";

export function SignIn() {
  const { signInWithToken, signInDev, error, token } = useAuth();
  const navigate = useNavigate();

  const [uid, setUid] = useState("dev-architect");
  const [email, setEmail] = useState("architect@example.com");
  const [name, setName] = useState("Architect");
  const [nodeKey, setNodeKey] = useState("");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);

  async function dev() {
    setBusy(true);
    await signInDev({ uid, email, name, ...(nodeKey ? { node_key: nodeKey } : {}) });
    setBusy(false);
    navigate("/identity");
  }

  async function paste() {
    if (!pasted.trim()) return;
    setBusy(true);
    await signInWithToken(pasted.trim());
    setBusy(false);
    navigate("/identity");
  }

  return (
    <div className="grid signin-page" style={{ gap: 16 }}>
      {error && <div className="error-banner">{error}</div>}

      <Card title="Development sign-in" actions={<Pill tone="warn">dev-mode backend only</Pill>}>
        <p className="small dim" style={{ marginTop: 0 }}>
          When the backend boots without <span className="mono">FIREBASE_SERVICE_ACCOUNT_JSON</span>, it runs in dev-mode and decodes JWT
          payloads without verifying signatures. This builder mints an unsigned token understood only by that mode. Against a production
          backend the same token is correctly rejected with 401.
        </p>
        <div className="grid cols-2">
          <div className="field">
            <label className="label">uid</label>
            <input className="input" value={uid} onChange={(e) => setUid(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">display name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">node_key (optional — IMS-issued)</label>
            <input className="input" value={nodeKey} onChange={(e) => setNodeKey(e.target.value)} placeholder="e.g. fixture-node-01" />
          </div>
        </div>
        <button className="btn primary" onClick={dev} disabled={busy}>
          {busy ? <span className="spinner" /> : "Mint development token"}
        </button>
      </Card>

      <Card title="Paste a bearer token" actions={token ? <Pill tone="ok">token present</Pill> : undefined}>
        <p className="small dim" style={{ marginTop: 0 }}>
          Supply a Firebase ID token issued by the deployment's Firebase project. The console attaches it as{" "}
          <span className="mono">Authorization: Bearer &lt;token&gt;</span> on every authenticated request.
        </p>
        <div className="field">
          <label className="label">Firebase ID token</label>
          <textarea className="textarea" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..." />
        </div>
        <button className="btn" onClick={paste} disabled={busy || !pasted.trim()}>
          Use token
        </button>
      </Card>

      <Card title="What identity resolves">
        <p className="small dim" style={{ marginTop: 0 }}>
          The backend resolves identity from the token's declared claims only. A node/role/access-level is applied only when the token carries
          an explicit <span className="mono">node_key</span> custom claim — email-hint matching never populates display identity, and authorship
          is stored exactly as declared, or UNKNOWN.
        </p>
      </Card>
    </div>
  );
}
