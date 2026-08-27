import { NextRequest, NextResponse } from 'next/server';
import { saveSession } from '@/lib/artifacts';

// ailog가 push하는 세션 전체 대화 수신 — 프로젝트 '대화 이력' 탭의 데이터
export async function POST(req: NextRequest) {
  const token = process.env.AILOG_TOKEN;
  if (!token || req.headers.get('x-ailog-token') !== token) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }
  if (!body?.repo || !body?.session?.id || !Array.isArray(body.session?.transcript)) {
    return NextResponse.json({ error: 'repo/session 필수' }, { status: 400 });
  }
  try {
    await saveSession(body.projectId ?? body.repo, body.repo, body.session);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 실패' },
      { status: 500 },
    );
  }
}
