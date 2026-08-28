'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptItem } from '@/lib/artifacts';

const PAGE = 300;
const CLAMP = 1200; // 이보다 긴 본문은 접어서 렌더 — 원문은 항목 하나가 수십만 자일 수 있다

const fmtTime = (ts?: string) => {
  if (!ts) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts));
};

const ROLE_LABEL: Record<string, string> = {
  user: '사용자',
  assistant: 'AI',
  thinking: '사고',
  system: '시스템',
  tool: '도구',
};

/** 긴 본문은 <details>로 — 펼치기 전에는 앞부분만 DOM에 올린다 */
function ClampedText({ text, className }: { text: string; className: string }) {
  if (text.length <= CLAMP) {
    return <pre className={`${className} whitespace-pre-wrap break-words`}>{text}</pre>;
  }
  return (
    <details>
      <summary className="cursor-pointer select-none">
        <pre className={`${className} inline whitespace-pre-wrap break-words`}>{text.slice(0, 400)}</pre>
        <span className="ml-1 font-mono text-[10.5px] text-faint">
          … 전체 {text.length.toLocaleString()}자 펼치기 ▸
        </span>
      </summary>
      <pre className={`${className} whitespace-pre-wrap break-words mt-1 max-h-[480px] overflow-y-auto scrollbox`}>
        {text}
      </pre>
    </details>
  );
}

function Row({ item }: { item: TranscriptItem }) {
  const isOutput = item.role === 'tool' && !item.tool;
  const label = item.tool ?? ROLE_LABEL[item.role] ?? item.role;
  const accent =
    item.role === 'user'
      ? 'var(--color-blue)'
      : item.role === 'system'
        ? 'var(--color-agentgray)'
        : item.role === 'thinking'
          ? 'var(--color-violet)'
          : item.role === 'tool'
            ? 'var(--color-amber)'
            : 'var(--color-mint)';

  // 시스템 주입(리마인더·훅 결과 등)은 길고 보조적 — 기본 접힘
  if (item.role === 'system') {
    return (
      <details className="rounded-lg border border-line bg-surface-1 px-3 py-1.5">
        <summary className="cursor-pointer select-none text-[11px] text-faint">
          시스템 {fmtTime(item.ts)} — {item.text.slice(0, 80).replace(/\n/g, ' ')}…
        </summary>
        <pre className="mt-1.5 font-mono text-[11px] leading-5 text-faint whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto scrollbox">
          {item.text}
        </pre>
      </details>
    );
  }

  return (
    <div
      className={`rounded-lg px-3 py-2 ${item.sub ? 'ml-6' : ''} bg-surface-1`}
      style={{ borderLeft: `2px solid color-mix(in oklab, ${accent} 45%, transparent)` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="font-mono text-[10px]"
          style={{ color: `color-mix(in oklab, ${accent} 75%, white)` }}
        >
          {isOutput ? '결과' : label}
        </span>
        {item.sub && <span className="font-mono text-[9.5px] text-faint">서브에이전트</span>}
        <span className="font-mono text-[10px] text-faint">{fmtTime(item.ts)}</span>
      </div>
      <ClampedText
        text={item.role === 'tool' && item.text.startsWith('→ ') ? item.text.slice(2) : item.text}
        className={
          item.role === 'tool'
            ? 'font-mono text-[11px] leading-5 text-dim'
            : item.role === 'thinking'
              ? 'text-[12px] leading-[1.7] text-faint italic'
              : 'text-[12.5px] leading-[1.75] text-ink'
        }
      />
    </div>
  );
}

/** 절단 없는 원문 전체 뷰 — 페이지 단위로 불러온다 */
export default function FullTranscript({ repo, id, total }: { repo: string; id: string; total: number }) {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetched = useRef(0);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/artifacts/${repo}/sessions/${id}/full?offset=${fetched.current}&limit=${PAGE}`);
      if (!res.ok) throw new Error();
      const page: { items: TranscriptItem[] } = await res.json();
      fetched.current += page.items.length;
      setItems((prev) => [...prev, ...page.items]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [repo, id, loading]);

  useEffect(() => {
    if (fetched.current === 0) void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 space-y-1.5">
      <p className="px-1 pb-1 text-[11px] text-faint">
        원문 전체 {total.toLocaleString()}항목 — 수집기가 자르지 않은 전문입니다 (시크릿은 마스킹됨).
        도구 델타·파일 스냅샷 같은 상태 동기화 레코드는 대화가 아니므로 제외됩니다.
      </p>
      {items.map((item, i) => (
        <Row key={i} item={item} />
      ))}
      {error && <p className="p-3 text-[12px] text-dim">원문을 불러오지 못했습니다.</p>}
      {!error && items.length < total && (
        <button
          onClick={() => void loadMore()}
          disabled={loading}
          className="w-full rounded-lg border border-line bg-surface-2 py-2 text-[12px] text-dim hover:text-ink hover:bg-surface-3 transition-colors"
        >
          {loading ? '불러오는 중…' : `더 불러오기 (${items.length.toLocaleString()} / ${total.toLocaleString()})`}
        </button>
      )}
    </div>
  );
}
