import { gunzipSync } from 'node:zlib';
import { NextRequest, NextResponse } from 'next/server';
import { saveSession } from '@/lib/artifacts';
import { maskDeep } from '@/lib/mask';

// ailog가 push하는 세션 전체 대화 수신 — 프로젝트 '대화 이력' 탭의 데이터.
// 원문 전체(full)가 실려 크기가 커질 수 있어 gzip 본문을 지원한다.
export async function POST(req: NextRequest) {
  const token = process.env.AILOG_TOKEN;
  if (!token || req.headers.get('x-ailog-token') !== token) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  let body;
  try {
    const raw = Buffer.from(await req.arrayBuffer());
    const text =
      req.headers.get('content-encoding') === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }
  if (!body?.repo || !body?.session?.id || !Array.isArray(body.session?.transcript)) {
    return NextResponse.json({ error: 'repo/session 필수' }, { status: 400 });
  }
  try {
    // 클라이언트가 이미 마스킹하지만 구버전 대비 서버에서 한 번 더
    await saveSession(body.projectId ?? body.repo, body.repo, maskDeep(body.session));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 실패' },
      { status: 500 },
    );
  }
}
