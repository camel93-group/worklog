import { Pool } from 'pg';

// dev HMR에도 커넥션 풀이 하나만 유지되도록 globalThis에 보관
const g = globalThis as unknown as { worklogPool?: Pool; worklogSchema?: Promise<void> };

function pool(): Pool {
  g.worklogPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
  });
  return g.worklogPool;
}

async function ensureSchema(): Promise<void> {
  // project_id = 저장소 root 커밋 해시 (폴더 이름 충돌과 무관한 고유 키), repo = 표시용 이름
  await pool().query(`
    CREATE TABLE IF NOT EXISTS artifacts (
      project_id   text NOT NULL,
      repo         text,
      commit_hash  text NOT NULL,
      agent        text,
      committed_at timestamptz,
      record       jsonb NOT NULL,
      PRIMARY KEY (project_id, commit_hash)
    );
    CREATE TABLE IF NOT EXISTS graphs (
      project_id text PRIMARY KEY,
      repo       text,
      remote     text,
      graph      jsonb NOT NULL,
      synced_at  timestamptz
    );
    CREATE TABLE IF NOT EXISTS sessions (
      project_id text NOT NULL,
      repo       text,
      session_id text NOT NULL,
      started_at timestamptz,
      ended_at   timestamptz,
      session    jsonb NOT NULL,
      PRIMARY KEY (project_id, session_id)
    );
    CREATE INDEX IF NOT EXISTS artifacts_project_date ON artifacts (project_id, committed_at DESC);
    -- 절단 없는 원문 전체 대화 — 목록·상세 쿼리가 무거워지지 않게 session과 분리 보관
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS full_transcript jsonb;
  `);
}

/** 스키마 보장 후 풀 반환 — 모든 쿼리는 이걸 통해 실행 */
export async function db(): Promise<Pool> {
  g.worklogSchema ??= ensureSchema();
  await g.worklogSchema;
  return pool();
}
