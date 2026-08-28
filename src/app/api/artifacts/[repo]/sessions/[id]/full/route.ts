import { NextRequest, NextResponse } from 'next/server';
import { getSessionFullPage } from '@/lib/artifacts';

// '원문 전체' 보기 — 항목이 수만 개일 수 있어 페이지 단위로 내려준다
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repo: string; id: string }> },
) {
  const { repo, id } = await params;
  const sp = req.nextUrl.searchParams;
  const offset = Math.max(0, Number(sp.get('offset')) || 0);
  const limit = Math.min(500, Math.max(1, Number(sp.get('limit')) || 300));
  try {
    const page = await getSessionFullPage(repo, id, offset, limit);
    if (!page) return NextResponse.json({ error: '원문 없음' }, { status: 404 });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
}
