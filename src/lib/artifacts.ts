import { db } from './db';

export interface TranscriptItem {
  ts?: string;
  // 원문 전체(full)에는 'thinking'·'system'도 온다
  role: 'user' | 'assistant' | 'tool' | 'thinking' | 'system' | string;
  tool?: string;
  sub?: boolean; // 서브에이전트(sidechain) 항목 표시 (원문 전체 전용)
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
  full?: TranscriptItem[]; // 절단 없는 원문 전체 (별도 컬럼에 저장, 조회는 페이지 단위)
}
export type SessionSummary = Omit<SessionRecord, 'transcript' | 'subagents' | 'full'> & {
  transcriptCount: number;
  subagentCount: number;
  fullCount: number; // 원문 전체 항목 수 (0이면 원문 미수집 세션)
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
  // 원문 전체는 별도 컬럼에 — 구버전 클라이언트(full 없음)가 기존 원문을 지우지 않게 coalesce
  const { full, ...meta } = session;
  await client.query(
    `INSERT INTO sessions (project_id, repo, session_id, started_at, ended_at, session, full_transcript)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (project_id, session_id)
     DO UPDATE SET repo = $2, started_at = $4, ended_at = $5, session = $6,
                   full_transcript = coalesce($7, sessions.full_transcript)`,
    [projectId, repo, session.id, session.startedAt || null, session.endedAt || null, meta,
     full ? JSON.stringify(full) : null],
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
            jsonb_array_length(coalesce(session->'subagents', '[]'::jsonb)) AS scount,
            jsonb_array_length(coalesce(full_transcript, '[]'::jsonb)) AS fcount
     FROM sessions WHERE project_id = $1
     ORDER BY ended_at DESC NULLS LAST`,
    [projectId],
  );
  return rows.map((r) => ({
    ...r.meta,
    transcriptCount: Number(r.tcount),
    subagentCount: Number(r.scount),
    fullCount: Number(r.fcount),
  }));
}

/** 원문 전체를 페이지 단위로 — 수만 항목·수 MB가 될 수 있어 한 번에 내리지 않는다 */
export async function getSessionFullPage(
  projectId: string,
  id: string,
  offset: number,
  limit: number,
): Promise<{ total: number; items: TranscriptItem[] } | null> {
  check(projectId);
  check(id);
  const client = await db();
  const { rows: totalRows } = await client.query(
    `SELECT jsonb_array_length(full_transcript) AS total
     FROM sessions WHERE project_id = $1 AND session_id = $2 AND full_transcript IS NOT NULL`,
    [projectId, id],
  );
  if (totalRows.length === 0) return null;
  const { rows } = await client.query(
    `SELECT t.item
     FROM sessions, LATERAL jsonb_array_elements(full_transcript) WITH ORDINALITY AS t(item, ord)
     WHERE project_id = $1 AND session_id = $2
     ORDER BY t.ord OFFSET $3 LIMIT $4`,
    [projectId, id, offset, limit],
  );
  return { total: Number(totalRows[0].total), items: rows.map((r) => r.item) };
}

/** 프로젝트 전체 삭제 (커밋 레코드·세션·그래프) */
export async function deleteProject(projectId: string): Promise<void> {
  check(projectId);
  const client = await db();
  await client.query('DELETE FROM artifacts WHERE project_id = $1', [projectId]);
  await client.query('DELETE FROM sessions WHERE project_id = $1', [projectId]);
  await client.query('DELETE FROM graphs WHERE project_id = $1', [projectId]);
}
