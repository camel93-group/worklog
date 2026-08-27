import { NextRequest, NextResponse } from 'next/server';
import { saveRevised } from '@/lib/store';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 });
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return NextResponse.json({ error: 'text가 필요합니다' }, { status: 400 });
  }
  try {
    const meeting = await saveRevised(id, text);
    return NextResponse.json(meeting);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 실패' },
      { status: 500 },
    );
  }
}
