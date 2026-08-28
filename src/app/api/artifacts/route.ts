import { gunzipSync } from 'node:zlib';
import { NextRequest, NextResponse } from 'next/server';
import { saveArtifact } from '@/lib/artifacts';
import { maskDeep } from '@/lib/mask';

// ailog CLI가 커밋별 AI 개발이력 레코드를 전송하는 수신 엔드포인트
export async function POST(req: NextRequest) {
  const token = process.env.AILOG_TOKEN;
  if (!token || req.headers.get('x-ailog-token') !== token) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  let record;
  try {
    const raw = Buffer.from(await req.arrayBuffer());
    const text =
      req.headers.get('content-encoding') === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    record = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }
  if (!record?.repo || !record?.commit || !record?.agent) {
    return NextResponse.json({ error: 'repo/commit/agent 필수' }, { status: 400 });
  }
  try {
    // 클라이언트가 이미 마스킹하지만 구버전 대비 서버에서 한 번 더
    await saveArtifact(maskDeep(record));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 실패' },
      { status: 500 },
    );
  }
}
