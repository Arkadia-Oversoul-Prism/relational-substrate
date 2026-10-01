// Domain types derived from the live OpenAPI schema and observed payloads.
// Only the fields the console renders are typed strictly; the rest are kept
// loose so a schema evolution does not break the UI.

export interface Heartbeat {
  status: string;
  resonance?: number;
}

export interface ArkDate {
  ark_year: number;
  ark_total_years: number;
  day_in_year: number;
  total_ark_day: number;
  pulse: number;
  breath: number;
  ark_completion_pct: number;
  coordinate: string;
  display: string;
  epoch: string;
  linear_utc: string;
  linear_note: string;
}

export interface StellarCartography {
  ark_date: ArkDate;
  schumann?: {
    bands: { hz: number; name: string }[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface Metrics {
  tools: unknown[];
  plans: Record<string, number>;
  goals: Record<string, number>;
  ts: number;
  workers: { alive: number; goal_scheduler: boolean };
  jobs: {
    completed: number;
    failed: number;
    running: number;
    pending: number;
    total: number;
    queue_depth: number;
  };
  goals_active: number;
}

export interface User {
  uid: string;
  email: string;
  node_key: string | null;
  display_name: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  role_sigil: string;
  ims_id: string | null;
  access_level: number;
  status: string;
  access_tools: string[];
  profile_complete: boolean;
}

export interface MeResponse {
  user: User;
}

export interface NodeSummary {
  display_name: string;
  role: string;
  role_sigil: string;
  ims_id: string;
  status: string;
}

export interface KnowledgeStatus {
  status: string;
  vault: { notes: number; projects: number; chunks: number; embeddings: number; pending_embeddings: number };
  graph: { edges: number };
  timeline: { events: number };
  ontology: { version: string; node_types_count: number; relationship_types_count: number };
  graph_version: string;
  nodes_by_type: Record<string, number>;
  relationships_by_type: Record<string, number>;
  graph_density: number;
  graph_health: string;
  indexing_status: {
    complete: number;
    pending: number;
    partial: number;
    failed: number;
    coverage: number;
  };
  last_ingestion: string;
  growth?: Record<string, number>;
}

export interface KnowledgeNote {
  id: number;
  uuid: string;
  title: string;
  content: string;
  vault_path: string;
  note_type: string;
  project_id: number | null;
  thread_id: string | null;
  participants: string;
  tags: string;
  created_at?: string;
}

export interface Provenance {
  capture_uuid: string;
  raw_checksum: string;
  capture_status: string;
  captured_at: string;
  captured_by: string;
  captured_by_kind: string;
  authored_by: string | null;
  authored_by_kind: string;
  source?: {
    source_uuid: string;
    kind?: string;
    label?: string;
    [k: string]: unknown;
  };
}

export interface GraphNode {
  id: number;
  uuid: string;
  title: string;
  note_type: string;
  project_id: number | null;
  created_at: string;
  user_id: string | null;
  provenance?: Provenance;
}

export interface GraphEdge {
  /** The Knowledge OS graph serves edges as source_note_id/target_note_id. */
  source_note_id: number;
  target_note_id: number;
  relationship?: string;
  weight?: number;
  [k: string]: unknown;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges?: GraphEdge[];
}

export interface RelationshipSummary {
  summary: {
    total_nodes: number;
    total_relationships: number;
    relationship_types_used: number;
    graph_density: number;
    average_degree: number;
    connected_components: number;
  };
  relationship_distribution: {
    type: string;
    display_name: string;
    direction: string;
    count: number;
  }[];
  top_connected_nodes: { id: number; title: string; note_type: string; degree: number }[];
}

export interface ProviderInfo {
  name: string;
  display_name: string;
  capabilities: string[];
  authenticated: boolean;
}

export interface ProviderHealth {
  status: string;
  model: string;
  latency_ms: number;
  reason: string;
  provider: string;
}

export interface Persona {
  id: number;
  name: string;
  preferred_provider: string | null;
  created_at: string;
}

export interface LabGovernance {
  maximum_authority: number;
  autonomous_mutation: boolean;
  production_mutation: boolean;
  approval_required: boolean;
}

export interface LabOverview {
  schema_version: string;
  observed_at: string;
  repository_head: string;
  system: string;
  repository: { branch: string; head: string; clean: boolean; remote: string; status: string };
  architecture: {
    components: number;
    modules: number;
    services: number;
    routes: number;
    execution_paths: number;
    status: string;
  };
  trajectory: { commits_analysed: number; major_transitions: number; high_churn_components: number };
  canon: { loaded: boolean; sources: { path: string; classification: string; bytes: number }[]; version: string };
  patterns: {
    id: string;
    type: string;
    severity: string;
    confidence: number;
    evidence: string[];
  }[];
  graph: { entities: number; relationships: number; status: string };
  deployments: {
    files: string[];
    platforms: { vercel: boolean; render: boolean; github_actions: boolean; docker: boolean };
  };
  security: { observations: { path: string; signals: string[]; classification: string }[]; values_redacted: boolean };
  governance: LabGovernance;
  status: string;
}

export interface EngineeringSession {
  session_id: string;
  workspace_ref: string;
  agent_id: string;
  objective: string;
  state: string;
  [k: string]: unknown;
}

export interface EngineeringOverview {
  sessions: EngineeringSession[];
  agents: { agent_id: string; role: string; display_name: string; [k: string]: unknown }[];
  automations: { automation_id: string; name: string; state: string; [k: string]: unknown }[];
  loop: string[];
  gateway: GatewayCatalog;
}

export interface GatewayCatalog {
  local_providers: string[];
  remote_providers: string[];
  agent_providers: string[];
  catalog: {
    provider: string;
    model: string;
    config_class: string;
    configured: boolean;
    status: string;
    detail: string;
    cost_note?: string;
  }[];
}

export interface AutomationsResponse {
  automations: { automation_id: string; name: string; state: string; trigger_kind?: string }[];
  grammar: {
    grammar: string[];
    states: string[];
    trigger_kinds: string[];
    may_prepare_consequential_action: boolean;
    may_authorize_consequential_action: boolean;
    final_transition: string;
  };
}

export interface SolspireStatus {
  version: Record<string, string>;
  providers: { active: string; available: string[]; token_usage: Record<string, number> };
  projects: { active_count: number };
  executions: { total: number; active: number; by_status: Record<string, number> };
  milestone: number;
  phase: number;
}

export interface WorkEvent {
  work_event_id: string;
  event_type: string;
  occurred_at: string;
  status: string;
  actor_ref?: string;
  [k: string]: unknown;
}

export interface Workload {
  workload_id?: string;
  title?: string;
  [k: string]: unknown;
}

export interface CanonicalWorkspace {
  workspace: {
    id: string;
    workspace_type: string;
    canonical_subject_ref: string;
    display_name: string;
    lifecycle: string;
    created_at: number;
    updated_at: number;
  };
  canonical: boolean;
  subject_binding: string;
}

export interface Approval {
  approval_id: string;
  status: string;
  [k: string]: unknown;
}

export interface ToolManifest {
  name: string;
  description: string;
  payload_schema: Record<string, string>;
}

export interface SourceInfo {
  /** /api/sources uses `name`; /solspire/sources uses `source`. */
  name?: string;
  source?: string;
  label?: string;
  description?: string;
  kind?: string;
  status?: string;
  configured: boolean;
  authenticated?: boolean;
  live?: boolean;
  repo?: string;
  branch?: string;
  connected_at?: string | null;
  last_sync?: string | null;
  last_sync_count?: number;
}

export interface CodexTree {
  total: number;
  files: { path: string; mode: string; type: string; sha: string; size: number; url: string }[];
}

export interface OpenLoops {
  source: string;
  parsed_at: string;
  total: number;
  groups: unknown[];
}

export interface IdentitySpine {
  identity_spine: {
    version: number;
    identity: {
      uid: string;
      canonical_name: string;
      preferred_name: string;
      username: string;
      role: string;
      role_sigil: string;
      ims_id: string | null;
    };
    [k: string]: unknown;
  };
}

export interface GovernanceBoundary {
  scope: string;
  description: string;
  allowed_roles: string[];
}

export interface Job {
  job_id: string;
  status: string;
  intent: { type: string; payload: Record<string, unknown> };
  source?: string;
  result?: Record<string, unknown>;
  error?: string | null;
  retries?: number;
  trace?: Record<string, unknown> | unknown[];
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  goal_id: string;
  title?: string;
  status?: string;
  [k: string]: unknown;
}
