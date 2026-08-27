import { NextRequest, NextResponse } from 'next/server';
import { getSessionRecord } from '@/lib/artifacts';

// 대화 이력 탭에서 세션을 펼칠 때 전체 대화를 가져가는 읽기 전용 엔드포인트
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repo: string; id: string }> },
) {
  const { repo, id } = await params;
  try {
    const session = await getSessionRecord(repo, id);
    if (!session) return NextResponse.json({ error: '세션 없음' }, { status: 404 });
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
}
