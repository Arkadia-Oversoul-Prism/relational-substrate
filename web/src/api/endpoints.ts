// Typed bindings for the substrate endpoints the console consumes.
// Paths are copied verbatim from the served OpenAPI schema (see openapi.snapshot.json).

import { api } from "./client";
import type {
  Approval,
  AutomationsResponse,
  CanonicalWorkspace,
  CodexTree,
  EngineeringOverview,
  GatewayCatalog,
  Goal,
  Heartbeat,
  IdentitySpine,
  Job,
  KnowledgeGraph,
  KnowledgeNote,
  KnowledgeStatus,
  LabOverview,
  MeResponse,
  Metrics,
  NodeSummary,
  OpenLoops,
  Persona,
  ProviderHealth,
  ProviderInfo,
  RelationshipSummary,
  SolspireStatus,
  SourceInfo,
  StellarCartography,
  ToolManifest,
  User,
  WorkEvent,
  Workload,
} from "./types";

// ── Liveness / telemetry ────────────────────────────────────────────────────
export const health = () => api.get<Heartbeat>("/health", { auth: false });
export const heartbeat = () => api.get<Heartbeat>("/api/heartbeat", { auth: false });
export const stellar = () => api.get<StellarCartography>("/api/stellar-cartography", { auth: false });
export const metrics = () => api.get<Metrics>("/api/metrics", { auth: false });
export const arkDate = () => api.get<Record<string, unknown>>("/api/ark-date", { auth: false });
export const openLoops = () => api.get<OpenLoops>("/api/open-loops", { auth: false });
export const codexTree = () => api.get<CodexTree>("/api/codex/github-tree", { auth: false });
export const publicNodes = () => api.get<{ nodes: NodeSummary[]; count: number }>("/api/nodes/public", { auth: false });
export const tools = () => api.get<{ tools: ToolManifest[] }>("/api/tools", { auth: false });
export const sources = () => api.get<{ sources: SourceInfo[] }>("/api/sources", { auth: false });
export const approvals = () => api.get<{ approvals: Approval[] }>("/api/approvals");

// ── Identity ────────────────────────────────────────────────────────────────
export const me = () => api.get<MeResponse>("/api/me");
export const patchMe = (body: Record<string, unknown>) => api.patch<MeResponse>("/api/me", { body });
export const identitySpine = () => api.get<IdentitySpine>("/api/me/identity-spine");
export const aisProfile = () => api.get<{ profile: unknown }>("/api/me/ais-profile");
export const myCodex = () => api.get<Record<string, unknown>>("/api/me/codex");

// ── Knowledge OS ────────────────────────────────────────────────────────────
export const knowledgeStatus = () => api.get<KnowledgeStatus>("/api/knowledge/status", { auth: false });
export const knowledgeNotes = (limit = 200) =>
  api.get<KnowledgeNote[]>("/api/knowledge/notes", { auth: false, query: { limit } });
export const knowledgeGraph = () => api.get<KnowledgeGraph>("/api/knowledge/graph", { auth: false });
export const relationships = () => api.get<RelationshipSummary>("/api/knowledge/relationships", { auth: false });
export const personas = () => api.get<Persona[]>("/api/knowledge/personas", { auth: false });
export const providers = () => api.get<ProviderInfo[]>("/api/knowledge/providers", { auth: false });
export const providersHealth = () => api.get<ProviderHealth[]>("/api/knowledge/providers/health", { auth: false });
export const embeddingsStatus = () =>
  api.get<Record<string, number>>("/api/knowledge/embeddings/status", { auth: false });
export const searchFulltext = (q: string) =>
  api.get<KnowledgeNote[]>("/api/knowledge/search/fulltext", { auth: false, query: { q } });
export const searchSemantic = (q: string) =>
  api.get<{ score: number; chunk_id: number; note_id: number; content: string; title: string; note_type: string }[]>(
    "/api/knowledge/search/semantic",
    { auth: false, query: { q } },
  );
export const ingestNote = (body: Record<string, unknown>) =>
  api.post<Record<string, unknown>>("/api/knowledge/ingest", { body });
export const note = (uuid: string) =>
  api.get<KnowledgeNote>(`/api/knowledge/notes/${uuid}`, { auth: false });
export const traverse = (noteId: number, depth = 2) =>
  api.get<KnowledgeGraph>(`/api/knowledge/graph/${noteId}/traverse`, { auth: false, query: { depth } });
export const timeline = (limit = 50) =>
  api.get<Record<string, unknown>[]>("/api/knowledge/timeline", { auth: false, query: { limit } });
export const personasList = personas;
export const providersList = providers;

// ── Commune threads / transmissions ─────────────────────────────────────────
export const communeThreads = () => api.get<{ threads: { thread_uuid: string; title?: string; [k: string]: unknown }[] }>("/api/commune/threads");
export const communeMessages = (uuid: string) =>
  api.get<{ messages: unknown[] }>(`/api/commune/threads/${uuid}/messages`);

export const messagesInbox = () => api.get<{ conversations: unknown[] }>("/api/messages/inbox");
export const transmissions = (limit = 50) =>
  api.get<{ transmissions: unknown[]; total: number }>("/api/transmissions", { auth: false, query: { limit } });

// ── Engineering Lab ─────────────────────────────────────────────────────────
export const labOverview = () => api.get<LabOverview>("/api/lab/overview");
export const engineeringOverview = () => api.get<EngineeringOverview>("/api/lab/engineering/overview");
export const gateway = () => api.get<GatewayCatalog>("/api/lab/engineering/gateway");
export const automations = () => api.get<AutomationsResponse>("/api/lab/engineering/automations");
export const engineeringLoop = () => api.get<{ loop: string[] }>("/api/lab/engineering/loop");
export const engineeringVoice = () => api.get<Record<string, unknown>>("/api/lab/engineering/voice");
export const integrations = () => api.get<Record<string, unknown>>("/api/lab/engineering/integrations");
export const agents = () => api.get<{ agents: unknown[] }>("/api/lab/engineering/agents");
export const sessions = () => api.get<{ sessions: unknown[] }>("/api/lab/engineering/sessions");
export const artifacts = () => api.get<{ artifacts: unknown[]; count: number }>("/api/lab/engineering/artifacts");
export const createSession = (body: Record<string, unknown>) =>
  api.post<Record<string, unknown>>("/api/lab/engineering/sessions", { body });
export const transitionSession = (id: string, target: string) =>
  api.post<Record<string, unknown>>(`/api/lab/engineering/sessions/${id}/transition`, { body: { target } });
export const authorizeSession = (id: string, body: Record<string, unknown>) =>
  api.post<Record<string, unknown>>(`/api/lab/engineering/sessions/${id}/authorize`, { body });

// ── SolSpire console ────────────────────────────────────────────────────────
export const solspireStatus = () => api.get<SolspireStatus>("/solspire/status");
export const solspireWorkspace = () => api.get<CanonicalWorkspace>("/solspire/workspace");
export const solspireSources = () => api.get<{ sources: SourceInfo[] }>("/solspire/sources");
export const solspireProviders = () =>
  api.get<{ providers: string[]; active: string; token_usage: Record<string, number> }>("/solspire/providers");
export const solspireProjects = () => api.get<{ projects: unknown[]; count: number }>("/solspire/projects");
export const solspireExecutions = () => api.get<{ executions: unknown[]; active: number }>("/solspire/executions");
export const workevents = () => api.get<{ work_events?: WorkEvent[]; workevents?: WorkEvent[]; count?: number }>("/solspire/workevents");
export const workloads = () => api.get<{ workloads?: Workload[]; count?: number }>("/solspire/workloads");
export const createWorkEvent = (body: Record<string, unknown>) =>
  api.post<WorkEvent>("/solspire/workevents", { body });
export const createWorkload = (body: Record<string, unknown>) =>
  api.post<Workload>("/solspire/workloads", { body });
export const solspireProposals = () => api.get<{ proposals?: unknown[]; count?: number }>("/solspire/proposals");
export const pulses = () => api.get<{ pulses?: unknown[]; count?: number }>("/solspire/pulses");
export const syntheses = () => api.get<{ syntheses?: unknown[]; count?: number }>("/solspire/syntheses");
export const enterprises = () => api.get<{ enterprises: unknown[] }>("/solspire/enterprise/workspaces");

// ── Kernel loop ─────────────────────────────────────────────────────────────
export const goals = () => api.get<{ goals: Goal[]; count: number; active: number }>("/api/goals");
export const jobs = () => api.get<{ jobs: Job[] }>("/api/jobs");
export const createGoal = (body: Record<string, unknown>) => api.post<Goal>("/api/goals", { body });

// ── Spec ────────────────────────────────────────────────────────────────────
export const openapiSpec = () => api.get<Record<string, unknown>>("/openapi.json", { auth: false });

export type { User };
