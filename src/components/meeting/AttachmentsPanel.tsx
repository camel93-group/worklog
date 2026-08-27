'use client';

import { useRef, useState } from 'react';
import type { MeetingFile } from '@/lib/types';

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};

/** 회의자료 업로드·다운로드·삭제 (메타 레일용) */
export default function AttachmentsPanel({
  meetingId,
  initialFiles,
}: {
  meetingId: string;
  initialFiles: MeetingFile[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState(initialFiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const f of selected) form.append('files', f);
      const res = await fetch(`/api/meetings/${meetingId}/files`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setFiles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(name: string) {
    setError(null);
    const res = await fetch(`/api/meetings/${meetingId}/files/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (res.ok) setFiles(await res.json());
    else setError('삭제 실패');
  }

  return (
    <div>
      <div className="flex items-center mb-2">
        <span className="mono-label">FILES</span>
        <button
          className="ml-auto text-[11.5px] text-dim hover:text-ink border border-line rounded-md px-2 py-0.5 transition-colors"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? '업로드 중…' : '+ 업로드'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
      {error && <p className="text-[11.5px] text-rose mb-1">⚠ {error}</p>}
      {files.length === 0 ? (
        <p className="text-[11.5px] text-faint">첨부된 회의자료 없음</p>
      ) : (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.name} className="group flex items-center gap-1.5 text-[12px]">
              <a
                href={`/api/meetings/${meetingId}/files/${encodeURIComponent(f.name)}`}
                className="min-w-0 truncate text-dim hover:text-ink hover:underline"
                title={`${f.name} 다운로드`}
                download
              >
                {f.name}
              </a>
              <span className="ml-auto font-mono text-[10px] text-faint shrink-0">{fmtSize(f.size)}</span>
              <button
                onClick={() => remove(f.name)}
                className="shrink-0 text-faint hover:text-rose opacity-0 group-hover:opacity-100 transition-opacity"
                title="삭제"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
