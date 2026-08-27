import { NextRequest, NextResponse } from 'next/server';
import { deleteMeeting, getMeeting } from '@/lib/store';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getMeeting(id))) {
    return NextResponse.json({ error: '회의를 찾을 수 없습니다' }, { status: 404 });
  }
  try {
    await deleteMeeting(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '삭제 실패' },
      { status: 500 },
    );
  }
}
