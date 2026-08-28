#!/usr/bin/env node
// 기존 DB에 이미 저장된 대화에서 시크릿을 마스킹하는 일회성 스크립트.
// (과거 ailog 세션 경로에는 마스킹이 없어 토큰·비밀번호가 남아있을 수 있다)
//
// 사용법: DATABASE_URL=postgres://... node scripts/mask-db.mjs
//         (DATABASE_URL 미지정 시 .env.local 의 값을 읽는다)
import fs from 'node:fs';
import { Pool } from 'pg';

// 규칙은 src/lib/mask.ts · ailog의 src/record.js 와 동일하게 유지할 것
const SECRET_RULES = [
  [/sk-(?:ant-)?[A-Za-z0-9_-]{16,}/g, '***masked***'],
  [/(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g, '***masked***'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '***masked***'],
  [/glpat-[A-Za-z0-9_-]{16,}/g, '***masked***'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/g, '***masked***'],
  [/AKIA[0-9A-Z]{16}/g, '***masked***'],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '***masked***'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '***masked-private-key***'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/g, '$1 ***masked***'],
  [
    /\b([A-Za-z0-9_-]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|CREDENTIAL)[A-Za-z0-9_-]*)(["']?\s*[=:]\s*["']?)[^\s"'&]{8,}/gi,
    '$1$2***masked***',
  ],
  [/\b([a-z][a-z0-9+]{1,20}:\/\/[^\s:@/]+):([^\s@]{4,})@/gi, '$1:***masked***@'],
  [/(--(?:token|password|passwd|secret|api-?key|access-?key))([= ]+)[^\s"']{8,}/gi, '$1$2***masked***'],
];

// 접속 정보에서 알아낸 시크릿 값은 문맥 없이 등장해도 치환 (AILOG_TOKEN 환경변수 포함)
const KNOWN_SECRETS = [];

function maskSecrets(text) {
  let out = text;
  for (const [re, sub] of SECRET_RULES) out = out.replace(re, sub);
  for (const secret of KNOWN_SECRETS) out = out.split(secret).join('***masked***');
  return out;
}

function maskDeep(value) {
  if (typeof value === 'string') return maskSecrets(value);
  if (Array.isArray(value)) return value.map(maskDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskDeep(v);
    return out;
  }
  return value;
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  throw new Error('DATABASE_URL 이 필요합니다');
}

const url = databaseUrl();
const dbPw = url.match(/:\/\/[^:@/]+:([^@]+)@/)?.[1];
for (const s of [process.env.AILOG_TOKEN, dbPw]) {
  if (s && s.length >= 8) KNOWN_SECRETS.push(s);
}

const pool = new Pool({ connectionString: url, max: 2 });
let changed = 0;

async function maskColumn(table, keyCols, col) {
  const { rows } = await pool.query(`SELECT ${keyCols.join(', ')}, ${col} AS payload FROM ${table} WHERE ${col} IS NOT NULL`);
  for (const row of rows) {
    const before = JSON.stringify(row.payload);
    const masked = maskDeep(row.payload);
    if (JSON.stringify(masked) === before) continue;
    const where = keyCols.map((k, i) => `${k} = $${i + 2}`).join(' AND ');
    await pool.query(`UPDATE ${table} SET ${col} = $1 WHERE ${where}`, [
      JSON.stringify(masked),
      ...keyCols.map((k) => row[k]),
    ]);
    changed++;
    console.log(`masked: ${table}.${col} — ${keyCols.map((k) => row[k]).join('/')}`);
  }
}

await maskColumn('artifacts', ['project_id', 'commit_hash'], 'record');
await maskColumn('sessions', ['project_id', 'session_id'], 'session');
await maskColumn('sessions', ['project_id', 'session_id'], 'full_transcript');
console.log(changed ? `완료 — ${changed}개 레코드 마스킹` : '완료 — 마스킹할 시크릿 없음');
await pool.end();
