import { NextRequest, NextResponse } from 'next/server';
import { mergeGraphSnapshot } from '@/lib/gitgraph';

// ailog가 커밋 시마다 push하는 저장소 그래프 스냅샷 수신 (해시·부모·refs 메타만)
export async function POST(req: NextRequest) {
  const token = process.env.AILOG_TOKEN;
  if (!token || req.headers.get('x-ailog-token') !== token) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }
  let snapshot;
  try {
    snapshot = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }
  if (!snapshot?.repo || !Array.isArray(snapshot?.commits)) {
    return NextResponse.json({ error: 'repo/commits 필수' }, { status: 400 });
  }
  try {
    await mergeGraphSnapshot(snapshot);
    return NextResponse.json({ ok: true, commits: snapshot.commits.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 실패' },
      { status: 500 },
    );
  }
}
