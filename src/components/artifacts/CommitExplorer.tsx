'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { GraphNode } from '@/lib/gitgraph';
import type { ArtifactRecord } from '@/lib/artifacts';
import { agentBadge } from '@/lib/agents';
import ArtifactChat from '@/components/ArtifactChat';
import SkillChips from './SkillChips';

const laneX = (l: number) => 13 + l * 20;

const fmtShort = (iso: string) => {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
};

export default function CommitExplorer({
  repo,
  nodes,
  initialHash,
  initialRecord,
}: {
  repo: string;
  nodes: GraphNode[];
  initialHash: string;
  initialRecord: ArtifactRecord | null;
}) {
  const [selected, setSelected] = useState(initialHash);
  const [record, setRecord] = useState<ArtifactRecord | null>(initialRecord);
  const [loading, setLoading] = useState(false);

  const { firstOfLane, lastOfLane, maxLane } = useMemo(() => {
    const first: Record<number, number> = {};
    const last: Record<number, number> = {};
    let max = 0;
    nodes.forEach((n, i) => {
      if (first[n.lane] === undefined) first[n.lane] = i;
      last[n.lane] = i;
      if (n.mergeFrom !== undefined && first[n.mergeFrom] === undefined) first[n.mergeFrom] = i;
      max = Math.max(max, n.lane, n.mergeFrom ?? 0);
    });
    return { firstOfLane: first, lastOfLane: last, maxLane: max };
  }, [nodes]);

  const graphWidth = laneX(maxLane) + 26;
  const selectedNode = nodes.find((n) => n.hash === selected);

  async function select(node: GraphNode) {
    if (node.hash === selected) return;
    setSelected(node.hash);
    window.history.replaceState(null, '', `/artifacts/${repo}/${node.hash}`);
    if (!node.record) {
      setRecord(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/artifacts/${repo}/${node.hash}`);
      setRecord(res.ok ? await res.json() : null);
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Git 그래프 */}
      <div className="panel mt-3 px-3 pt-[15px] pb-2.5 overflow-x-auto scrollbox">
        <div className="flex items-baseline justify-between px-1.5 pb-2">
          <span className="mono-label">GIT GRAPH</span>
          <span className="text-[11px] text-faint">노드를 클릭하면 아래에 해당 커밋이 열립니다</span>
        </div>
        <div
          className="grid items-center gap-x-3 px-1.5 pb-1.5 border-b border-line mono-label !text-[10px]"
          style={{ gridTemplateColumns: `${graphWidth}px minmax(0,1fr) 108px 100px 132px` }}
        >
          <span>GRAPH</span>
          <span>COMMIT</span>
          <span>COMMIT ID</span>
          <span className="max-wide:hidden">COMMITTER</span>
          <span className="max-wide:hidden text-right">DATE</span>
        </div>
        <div className="max-h-[380px] overflow-y-auto scrollbox">
          {nodes.map((node, i) => {
            const isSelected = node.hash === selected;
            const color = node.record ? agentBadge(node.record.agent).color : 'var(--color-graphline)';
            const segments: React.ReactNode[] = [];
            for (let l = 0; l <= maxLane; l++) {
              if (firstOfLane[l] === undefined) continue;
              if (i < firstOfLane[l] || i > lastOfLane[l]) continue;
              if (node.mergeFrom === l && i === firstOfLane[l]) continue;
              if (i > firstOfLane[l]) {
                segments.push(
                  <span key={`t${l}`} className="absolute w-[2px] top-0 h-1/2" style={{ left: laneX(l), background: 'var(--color-graphline)' }} />,
                );
              }
              if (i < lastOfLane[l]) {
                segments.push(
                  <span key={`b${l}`} className="absolute w-[2px] top-1/2 bottom-0" style={{ left: laneX(l), background: 'var(--color-graphline)' }} />,
                );
              }
            }
            return (
              <button
                key={node.hash}
                onClick={() => select(node)}
                className={`grid items-center gap-x-3 w-full text-left rounded-[9px] px-1.5 py-[11px] transition-colors ${
                  isSelected ? 'bg-surface-3' : 'hover:bg-surface-2'
                }`}
                style={{ gridTemplateColumns: `${graphWidth}px minmax(0,1fr) 108px 100px 132px` }}
              >
                <span className="relative self-stretch" style={{ width: graphWidth }}>
                  {segments}
                  {node.mergeFrom !== undefined && (
                    <span
                      className="absolute top-1/2 bottom-0"
                      style={{
                        left: laneX(node.lane) + 1,
                        width: laneX(node.mergeFrom) - laneX(node.lane),
                        borderTop: '2px solid var(--color-graphline)',
                        borderRight: '2px solid var(--color-graphline)',
                        borderTopRightRadius: 9,
                      }}
                    />
                  )}
                  <span
                    className="absolute top-1/2 -translate-y-1/2 size-[11px] rounded-full"
                    style={{
                      left: laneX(node.lane) - 4.5,
                      border: `2px solid ${color}`,
                      background: isSelected ? color : `color-mix(in oklab, ${color} 26%, transparent)`,
                      boxShadow: isSelected ? `0 0 0 3px color-mix(in oklab, ${color} 30%, transparent)` : undefined,
                    }}
                  />
                </span>
                <span className="min-w-0 flex items-center gap-1.5">
                  {node.refs.branches.map((b) => (
                    <span key={b} className="chip-amber !py-0.5 font-mono !text-[10px]">{b}</span>
                  ))}
                  {node.refs.head && <span className="chip-mint !py-0.5 font-mono !text-[10px]">HEAD</span>}
                  {node.refs.tags.map((t) => (
                    <span key={t} className="chip-gray !py-0.5 font-mono !text-[10px]">{t}</span>
                  ))}
                  <span className={`truncate text-[12.5px] ${isSelected ? 'font-semibold' : 'text-dim'}`}>
                    {node.subject}
                  </span>
                  {/* 이 커밋에서 사용된 스킬 매핑 */}
                  {(node.record?.skills ?? []).slice(0, 2).map((s) => {
                    const name = typeof s === 'string' ? s : s.name;
                    return (
                      <span key={name} className="chip-violet !py-0.5 font-mono !text-[9.5px] shrink-0" title={`스킬: ${name}`}>
                        ⚡{name}
                      </span>
                    );
                  })}
                  {(node.record?.skills?.length ?? 0) > 2 && (
                    <span className="font-mono text-[9.5px] text-faint shrink-0">+{node.record!.skills!.length - 2}</span>
                  )}
                </span>
                <span className="font-mono text-[11.5px] text-faint">{node.shortHash}</span>
                <span className="max-wide:hidden text-[11.5px] text-faint truncate">
                  {node.author.replace(/<.*>/, '').trim()}
                </span>
                <span className="max-wide:hidden font-mono text-[11px] text-faint text-right">
                  {fmtShort(node.date)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 커밋 상세 */}
      {selectedNode && (
        <CommitDetail key={selected} node={selectedNode} record={record} loading={loading} />
      )}
    </div>
  );
}

function CommitDetail({
  node,
  record,
  loading,
}: {
  node: GraphNode;
  record: ArtifactRecord | null;
  loading: boolean;
}) {
  const summary = node.record;
  const badge = summary ? agentBadge(summary.agent) : null;

  return (
    <div className="mt-6 rise">
      <div className="mono-label">DEPTH 03 · COMMIT</div>
      <h2 className="text-[24px] font-semibold mt-0.5">{node.subject}</h2>
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        {badge ? (
          <span className={badge.chip}>{badge.label}</span>
        ) : (
          <span className="chip-gray">기록 없음</span>
        )}
        {summary?.model && <span className="chip">{summary.model}</span>}
        {summary?.effort && (
          <span className="chip">
            <span className="k">EFFORT</span>
            {summary.effort}
          </span>
        )}
        <span className="chip font-mono text-[11px]">{node.shortHash}</span>
        <span className="chip">
          {node.author.replace(/<.*>/, '').trim()} · {fmtShort(node.date)}
        </span>
        {summary?.stats && (
          <span className="chip">
            <span style={{ color: 'var(--color-mint)' }}>+{summary.stats.insertions}</span>
            <span style={{ color: 'var(--color-rose)' }}>−{summary.stats.deletions}</span>
            <span>· {summary.stats.files}개 파일</span>
          </span>
        )}
        {summary?.usage && (
          <span className="chip-amber">출력 {summary.usage.outputTokens.toLocaleString()} 토큰</span>
        )}
        {summary?.skills && <SkillChips skills={summary.skills} />}
        {(summary?.subagentCount ?? 0) > 0 && (
          <span className="chip-violet">서브에이전트 {summary!.subagentCount}</span>
        )}
      </div>

      {record?.human && (record.human.description || record.human.aiReview) && (
        <div className="mt-4 grid gap-3 wide:grid-cols-2">
          {record.human.description && (
            <div className="card p-4 text-[13px]">
              <div className="mono-label mb-1.5">작성자 설명</div>
              {record.human.description}
            </div>
          )}
          {record.human.aiReview && (
            <div
              className="card p-4 text-[13px]"
              style={{ borderColor: 'color-mix(in oklab, var(--color-blue) 40%, transparent)' }}
            >
              <div className="mono-label mb-1.5">AI 검토 결과</div>
              {record.human.aiReview.note}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-5 wide:grid-cols-[minmax(0,1fr)_minmax(240px,296px)] items-start">
        <div className="card overflow-hidden min-w-0">
          {loading ? (
            <div className="p-10 grid place-items-center text-dim">
              <span className="spinner" />
            </div>
          ) : record && record.transcript.length > 0 ? (
            <ArtifactChat transcript={record.transcript} subagents={record.subagents ?? []} />
          ) : (
            <div className="p-8 text-center border border-dashed border-line rounded-[15px] m-4">
              <p className="text-[13px] text-dim">
                {summary?.agent === 'human' ? '휴먼 커밋 — AI 대화 기록이 없습니다' : 'AI 대화 기록이 없는 커밋입니다'}
              </p>
              {!summary && (
                <p className="text-[11.5px] text-faint mt-1">
                  ailog가 수집하지 못한 커밋입니다 (훅 미설치 시점 등)
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="panel p-4 space-y-4 max-wide:order-last">
          <div>
            <div className="mono-label mb-2">COMMIT INFO</div>
            {(
              [
                ['해시', node.shortHash],
                ['작성자', node.author.replace(/<.*>/, '').trim()],
                ['일시', fmtShort(node.date)],
                ['에이전트', badge?.label ?? '기록 없음'],
                ['모델', summary?.model ?? '—'],
                ['effort', summary?.effort ?? '—'],
                ['출력 토큰', summary?.usage ? summary.usage.outputTokens.toLocaleString() : '—'],
                ['대화', summary ? `${summary.transcriptCount}항목` : '—'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex text-[12px] py-[3px]">
                <span className="w-[64px] shrink-0 text-faint">{k}</span>
                <span className="text-dim font-mono text-[11.5px]">{v}</span>
              </div>
            ))}
          </div>
          {record?.files && record.files.length > 0 && (
            <>
              <div className="h-px bg-line" />
              <div>
                <div className="mono-label mb-2">CHANGED FILES</div>
                <div className="space-y-1">
                  {record.files.map((f) => (
                    <div key={f.path} className="flex items-baseline gap-2 text-[11px] font-mono">
                      <span className="truncate text-dim">{f.path}</span>
                      <span className="ml-auto shrink-0" style={{ color: 'var(--color-mint)' }}>
                        +{f.add}
                      </span>
                      <span className="shrink-0" style={{ color: 'var(--color-rose)' }}>
                        −{f.del}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
