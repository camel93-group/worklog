// 서버/클라이언트 공용 포맷 헬퍼 (node 의존성 없음)
export function durationMin(startIso: string, endIso: string): number {
  return Math.max(1, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000));
}
