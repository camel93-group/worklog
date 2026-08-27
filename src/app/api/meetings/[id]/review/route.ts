import { NextRequest, NextResponse } from 'next/server';
import { markReviewed } from '@/lib/store';

// 확인 완료 처리 — 유저별 원본 오디오 삭제(합본 유지) + reviewed 표시
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const meeting = await markReviewed(id);
    return NextResponse.json(meeting);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '처리 실패' },
      { status: 500 },
    );
  }
}
