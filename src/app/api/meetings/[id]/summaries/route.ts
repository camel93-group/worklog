import { NextRequest, NextResponse } from 'next/server';
import { getMeeting, addSummary } from '@/lib/store';
import { summarize } from '@/lib/summarize';

// 의역본(없으면 원본) 기준으로 요약을 재생성해 새 버전으로 추가한다
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) {
    return NextResponse.json({ error: '회의를 찾을 수 없습니다' }, { status: 404 });
  }
  try {
    const source = meeting.revised?.text ?? meeting.original;
    const text = await summarize(source);
    const updated = await addSummary(id, text, 'regenerated');
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '재생성 실패' },
      { status: 500 },
    );
  }
}
