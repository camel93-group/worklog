import { db } from './db';

export interface TranscriptItem {
  ts?: string;
  role: 'user' | 'assistant' | 'tool' | string;
  tool?: string;
  text: string;
}

export interface SubagentGroup {
  id: string;
  model?: string | null;
  items: TranscriptItem[];
}

import type { SkillUse } from './skills';
export type { SkillUse } from './skills';

export interface ArtifactRecord {
  schema: number;
  projectId?: string;
  remote?: string | null;
  repo: string;
  commit: string;
  shortCommit: string;
  branch: string;
  author: string;
  committedAt: string;
  message: string;
  stats: { files: number; insertions: number; deletions: number };
  agent: string;
  model: string | null;
  effort: string | null;
  session: { id: string; matchedBy: string } | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  } | null;
  human: { description: string | null; aiReview: { ok: boolean; note: string } | null } | null;
  parents?: string[];
  tags?: string[];
  files?: { path: string; add: number; del: number }[];
  skills?: SkillUse[];
  subagents?: SubagentGroup[];
  transcript: TranscriptItem[];
  collectedBy?: string | null;
  collectedAt?: string;
}

export type ArtifactSummary = Omit<ArtifactRecord, 'transcript' | 'subagents'> & {
  projectId: string;
  transcriptCount: number;
  subagentCount: number;
};

export interface SessionRecord {
  id: string;
  agent: string;
  cwd?: string;
  model: string | null;
  effort: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
  startedAt: string | null;
  endedAt: string | null;
  skills?: SkillUse[];
  subagents?: SubagentGroup[];
  transcript: TranscriptItem[];
}
export type SessionSummary = Omit<SessionRecord, 'transcript' | 'subagents'> & {
  transcriptCount: number;
  subagentCount: number;
};

const SAFE = /^[A-Za-z0-9_.-]+$/;
const check = (v: string) => {
  if (!SAFE.test(v)) throw new Error('잘못된 식별자');
};

export async function saveArtifact(record: ArtifactRecord): Promise<void> {
  const projectId = record.projectId ?? record.repo; // 구버전 클라이언트 폴백
  check(projectId);
  check(record.commit);
  const client = await db();
  await client.query(
    `INSERT INTO artifacts (project_id, repo, commit_hash, agent, committed_at, record)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (project_id, commit_hash)
     DO UPDATE SET repo = $2, agent = $4, committed_at = $5, record = $6`,
    [projectId, record.repo, record.commit, record.agent, record.committedAt || null, record],
  );
}

export async function getArtifact(projectId: string, commit: string): Promise<ArtifactRecord | null> {
  check(projectId);
  check(commit);
  const client = await db();
  const { rows } = await client.query(
    'SELECT record FROM artifacts WHERE project_id = $1 AND commit_hash = $2',
    [projectId, commit],
  );
  return rows[0]?.record ?? null;
}

/** 목록용 — transcript는 크므로 DB에서 제외하고 개수만 */
export async function listArtifacts(): Promise<ArtifactSummary[]> {
  const client = await db();
  const { rows } = await client.query(`
    SELECT project_id, repo,
           record - 'transcript' - 'subagents' AS meta,
           jsonb_array_length(coalesce(record->'transcript', '[]'::jsonb)) AS tcount,
           jsonb_array_length(coalesce(record->'subagents', '[]'::jsonb)) AS scount
    FROM artifacts
    ORDER BY committed_at DESC NULLS LAST
  `);
  return rows.map((r) => ({
    ...r.meta,
    projectId: r.project_id,
    repo: r.repo ?? r.meta.repo,
    transcriptCount: Number(r.tcount),
    subagentCount: Number(r.scount),
  }));
}

export async function saveSession(projectId: string, repo: string, session: SessionRecord): Promise<void> {
  check(projectId);
  check(session.id);
  const client = await db();
  await client.query(
    `INSERT INTO sessions (project_id, repo, session_id, started_at, ended_at, session)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (project_id, session_id)
     DO UPDATE SET repo = $2, started_at = $4, ended_at = $5, session = $6`,
    [projectId, repo, session.id, session.startedAt || null, session.endedAt || null, session],
  );
}

export async function getSessionRecord(projectId: string, id: string): Promise<SessionRecord | null> {
  check(projectId);
  check(id);
  const client = await db();
  const { rows } = await client.query(
    'SELECT session FROM sessions WHERE project_id = $1 AND session_id = $2',
    [projectId, id],
  );
  return rows[0]?.session ?? null;
}

export async function listSessions(projectId: string): Promise<SessionSummary[]> {
  check(projectId);
  const client = await db();
  const { rows } = await client.query(
    `SELECT session - 'transcript' - 'subagents' AS meta,
            jsonb_array_length(coalesce(session->'transcript', '[]'::jsonb)) AS tcount,
            jsonb_array_length(coalesce(session->'subagents', '[]'::jsonb)) AS scount
     FROM sessions WHERE project_id = $1
     ORDER BY ended_at DESC NULLS LAST`,
    [projectId],
  );
  return rows.map((r) => ({ ...r.meta, transcriptCount: Number(r.tcount), subagentCount: Number(r.scount) }));
}

/** 프로젝트 전체 삭제 (커밋 레코드·세션·그래프) */
export async function deleteProject(projectId: string): Promise<void> {
  check(projectId);
  const client = await db();
  await client.query('DELETE FROM artifacts WHERE project_id = $1', [projectId]);
  await client.query('DELETE FROM sessions WHERE project_id = $1', [projectId]);
  await client.query('DELETE FROM graphs WHERE project_id = $1', [projectId]);
}
