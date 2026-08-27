import { NextRequest, NextResponse } from 'next/server';
import { deleteProject } from '@/lib/artifacts';

// 프로젝트 전체 삭제 — 커밋 레코드·세션 대화·그래프 (git 저장소 자체는 무관)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ repo: string }> }) {
  const { repo } = await params;
  try {
    await deleteProject(repo);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '삭제 실패' },
      { status: 500 },
    );
  }
}
