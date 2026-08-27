'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectDeleteButton({ repo }: { repo: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/artifacts/${repo}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      router.push('/artifacts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button className="btn btn-rose" onClick={() => setConfirming(true)}>
        프로젝트 삭제
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 flex-wrap justify-end">
      <span className="text-[11.5px] text-faint">
        커밋 기록·세션 대화가 모두 삭제됩니다. (git 저장소 자체는 영향 없음)
      </span>
      <button className="btn" onClick={() => setConfirming(false)} disabled={busy}>
        취소
      </button>
      <button className="btn btn-rose" onClick={remove} disabled={busy}>
        {busy ? '삭제 중…' : '삭제 실행'}
      </button>
      {error && <span className="text-[12px] text-rose">⚠ {error}</span>}
    </span>
  );
}
