'use client';

import Link from 'next/link';
import type { SubagentGroup, TranscriptItem } from '@/lib/artifacts';

export interface CommitMarker {
  hash: string;
  shortHash: string;
  subject: string;
  date: string;
}

function fmtTime(ts?: string) {
  if (!ts) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts));
}

type StreamItem =
  | (TranscriptItem & { kind?: undefined })
  | { kind: 'commit'; marker: CommitMarker; ts: string };

/** 대화 항목 + (선택) 커밋 배지를 시간순으로 병합 */
function mergeStream(transcript: TranscriptItem[], markers: CommitMarker[]): StreamItem[] {
  if (markers.length === 0) return transcript;
  const stream: StreamItem[] = [...transcript];
  for (const marker of markers) {
    const idx = stream.findIndex((it) => 'ts' in it && it.ts && it.ts > marker.date);
    const badge: StreamItem = { kind: 'commit', marker, ts: marker.date };
    if (idx === -1) stream.push(badge);
    else stream.splice(idx, 0, badge);
  }
  return stream;
}

function groupItems(stream: StreamItem[]) {
  const groups: (
    | { kind: 'msg'; item: TranscriptItem }
    | { kind: 'tools'; items: TranscriptItem[] }
    | { kind: 'commit'; marker: CommitMarker }
  )[] = [];
  for (const item of stream) {
    if ('kind' in item && item.kind === 'commit') {
      groups.push({ kind: 'commit', marker: item.marker });
    } else if (item.role === 'tool') {
      const last = groups.at(-1);
      if (last?.kind === 'tools') last.items.push(item as TranscriptItem);
      else groups.push({ kind: 'tools', items: [item as TranscriptItem] });
    } else {
      groups.push({ kind: 'msg', item: item as TranscriptItem });
    }
  }
  return groups;
}

export default function ArtifactChat({
  transcript,
  markers = [],
  repo,
  header = 'AI 대화',
  subagents = [],
}: {
  transcript: TranscriptItem[];
  markers?: CommitMarker[];
  repo?: string;
  header?: string | null;
  subagents?: SubagentGroup[];
}) {
  const groups = groupItems(mergeStream(transcript, markers));
  const turns = transcript.filter((t) => t.role !== 'tool').length;

  return (
    <div>
      {header && (
        <div className="flex items-baseline justify-between px-5 py-3 border-b border-line">
          <span className="mono-label">{header}</span>
          <span className="font-mono text-[10.5px] text-faint">{turns} turns</span>
        </div>
      )}
      <div className="p-5 space-y-3">
        {groups.map((group, i) => {
          if (group.kind === 'commit') {
            const { marker } = group;
            const inner = (
              <>
                <span className="font-mono">{marker.shortHash}</span>
                <span className="truncate max-w-[360px]">{marker.subject}</span>
              </>
            );
            return (
              <div key={i} className="flex justify-center py-1">
                {repo ? (
                  <Link href={`/artifacts/${repo}/${marker.hash}`} className="chip-amber hover:opacity-90" title={marker.subject}>
                    ⎇ 커밋 {inner}
                  </Link>
                ) : (
                  <span className="chip-amber">⎇ 커밋 {inner}</span>
                )}
              </div>
            );
          }
          if (group.kind === 'tools') {
            const toolNames = [...new Set(group.items.map((t) => t.tool).filter(Boolean))].slice(0, 3);
            return (
              <details key={i} className="rounded-xl border border-line bg-surface-1">
                <summary className="cursor-pointer select-none px-4 py-2 text-[11.5px] text-faint hover:text-dim flex items-center gap-2">
                  <span>▸ 도구 작업 {group.items.length}건</span>
                  {toolNames.length > 0 && (
                    <span className="font-mono text-[10px]">{toolNames.join(' · ')}</span>
                  )}
                </summary>
                <div className="border-t border-line px-3 py-2 space-y-1 max-h-[220px] overflow-y-auto scrollbox">
                  {group.items.map((t, j) => (
                    <p key={j} className="rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-[11px] leading-5 text-faint whitespace-pre-wrap break-words">
                      {t.text}
                    </p>
                  ))}
                </div>
              </details>
            );
          }
          const { item } = group;
          const isUser = item.role === 'user';
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[86%] ${isUser ? 'text-right' : ''}`}>
                <div className="font-mono text-[10.5px] text-faint mb-1">
                  {isUser ? '사용자' : 'AI'} {fmtTime(item.ts)}
                </div>
                <div
                  className={`inline-block rounded-[13px] px-4 py-2.5 text-left text-[13px] leading-[1.78] whitespace-pre-wrap break-words ${
                    isUser ? 'rounded-tr-[5px]' : 'rounded-tl-[5px] bg-surface-3'
                  }`}
                  style={
                    isUser
                      ? {
                          background: 'color-mix(in oklab, var(--color-blue) 26%, var(--color-surface-2))',
                          border: '1px solid color-mix(in oklab, var(--color-blue) 34%, transparent)',
                        }
                      : undefined
                  }
                >
                  {item.text}
                </div>
              </div>
            </div>
          );
        })}

        {subagents.map((sub, i) => (
          <details
            key={`sub-${i}`}
            className="rounded-xl bg-surface-1"
            style={{ border: '1px solid color-mix(in oklab, var(--color-violet) 34%, transparent)' }}
          >
            <summary className="px-4 py-2 text-[11.5px] hover:text-ink flex items-center gap-2" style={{ color: 'color-mix(in oklab, var(--color-violet) 70%, white)' }}>
              <span>▸ 서브에이전트 {sub.id}</span>
              {sub.model && <span className="font-mono text-[10px] text-faint">{sub.model}</span>}
              <span className="ml-auto font-mono text-[10px] text-faint">{sub.items.length}항목</span>
            </summary>
            <div className="border-t border-line px-3 py-2 space-y-1 max-h-[320px] overflow-y-auto scrollbox">
              {sub.items.map((t, j) => (
                <p
                  key={j}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] leading-5 whitespace-pre-wrap break-words ${
                    t.role === 'tool' ? 'bg-surface-2 font-mono text-[11px] text-faint' : 'bg-surface-3 text-dim'
                  }`}
                >
                  {t.role !== 'tool' && (
                    <span className="font-mono text-[10px] text-faint mr-1.5">{t.role === 'user' ? '지시' : 'AI'}</span>
                  )}
                  {t.text}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
