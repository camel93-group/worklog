import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { getMeeting, audioPath } from '@/lib/store';

// 회의 원본 오디오(m4a) 스트리밍 — Range 요청을 지원해 탐색(seek)이 가능하다
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  const file = meeting ? audioPath(meeting) : null;
  if (!file) return new Response('오디오가 없습니다', { status: 404 });

  let size: number;
  try {
    size = (await stat(file)).size;
  } catch {
    return new Response('오디오 파일을 찾을 수 없습니다', { status: 404 });
  }

  const match = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        'content-type': 'audio/mp4',
        'accept-ranges': 'bytes',
        'content-length': String(end - start + 1),
        'content-range': `bytes ${start}-${end}/${size}`,
      },
    });
  }

  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    status: 200,
    headers: {
      'content-type': 'audio/mp4',
      'accept-ranges': 'bytes',
      'content-length': String(size),
    },
  });
}
