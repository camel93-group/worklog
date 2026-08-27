import { NextRequest, NextResponse } from 'next/server';
import { getMeeting, listMeetingFiles, saveMeetingFile } from '@/lib/store';

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listMeetingFiles(id));
}

// 회의자료 업로드 (multipart form, 'files' 필드 복수 허용)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getMeeting(id))) {
    return NextResponse.json({ error: '회의를 찾을 수 없습니다' }, { status: 404 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'multipart 형식이 아닙니다' }, { status: 400 });
  }
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
  }
  try {
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `${file.name}: 100MB 초과` }, { status: 413 });
      }
      await saveMeetingFile(id, file.name, Buffer.from(await file.arrayBuffer()));
    }
    return NextResponse.json(await listMeetingFiles(id));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '업로드 실패' },
      { status: 500 },
    );
  }
}
