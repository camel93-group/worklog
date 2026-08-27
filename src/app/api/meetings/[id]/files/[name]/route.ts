import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { meetingFilePath, deleteMeetingFile, listMeetingFiles } from '@/lib/store';

// 회의자료 다운로드
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  let file: string;
  try {
    file = meetingFilePath(id, decodeURIComponent(name));
  } catch {
    return new Response('잘못된 요청', { status: 400 });
  }
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response('파일 없음', { status: 404 });
  }
  const encoded = encodeURIComponent(decodeURIComponent(name));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(size),
      'content-disposition': `attachment; filename*=UTF-8''${encoded}`,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  try {
    await deleteMeetingFile(id, decodeURIComponent(name));
    return NextResponse.json(await listMeetingFiles(id));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '삭제 실패' },
      { status: 500 },
    );
  }
}
