// 수신 데이터 시크릿 마스킹 — ailog 클라이언트가 이미 마스킹하지만,
// 구버전 클라이언트 대비 서버에서 한 번 더 적용한다 (defense in depth).
// 규칙은 ailog의 src/record.js SECRET_RULES와 동일하게 유지할 것 (scripts/mask-db.mjs도 함께).
const SECRET_RULES: [RegExp, string][] = [
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

/** 서버 자신이 아는 시크릿 값 — 문맥(KEY= 등) 없이 맨 값으로 등장해도 치환한다 */
function knownSecrets(): string[] {
  const out: string[] = [];
  if (process.env.AILOG_TOKEN) out.push(process.env.AILOG_TOKEN);
  const dbPw = process.env.DATABASE_URL?.match(/:\/\/[^:@/]+:([^@]+)@/)?.[1];
  if (dbPw) out.push(dbPw);
  return out.filter((s) => s.length >= 8);
}

export function maskSecrets(text: string): string {
  // Postgres jsonb는 \u0000을 저장할 수 없다 — 원문 도구 출력에 섞여 올 수 있어 제거
  let out = text.replace(/\u0000/g, '');
  for (const [re, sub] of SECRET_RULES) out = out.replace(re, sub);
  for (const secret of knownSecrets()) out = out.split(secret).join('***masked***');
  return out;
}

/** 객체 트리의 모든 문자열에 마스킹 적용 — 수신 페이로드 전체에 사용 */
export function maskDeep<T>(value: T): T {
  if (typeof value === 'string') return maskSecrets(value) as T;
  if (Array.isArray(value)) return value.map(maskDeep) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskDeep(v);
    return out as T;
  }
  return value;
}
