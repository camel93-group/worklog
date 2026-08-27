import { NextRequest, NextResponse } from 'next/server';
import { getArtifact } from '@/lib/artifacts';

// 그래프 행 클릭 시 커밋 상세(대화 포함)를 클라이언트에서 가져가는 읽기 전용 엔드포인트
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repo: string; commit: string }> },
) {
  const { repo, commit } = await params;
  try {
    const record = await getArtifact(repo, commit);
    if (!record) return NextResponse.json({ error: '기록 없음' }, { status: 404 });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
}
