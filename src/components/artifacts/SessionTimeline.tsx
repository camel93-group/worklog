'use client';

import { useState } from 'react';
import type { SessionRecord, SessionSummary } from '@/lib/artifacts';
import { skillName } from '@/lib/skills';
import ArtifactChat, { type CommitMarker } from '@/components/ArtifactChat';
import SkillChips from './SkillChips';

const fmtShort = (iso: string | null) => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
};

export default function SessionTimeline({
  repo,
  sessions,
  commits,
}: {
  repo: string;
  sessions: SessionSummary[];
  commits: CommitMarker[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, SessionRecord>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!loaded[id]) {
      setLoading(id);
      try {
        const res = await fetch(`/api/artifacts/${repo}/sessions/${id}`);
        if (res.ok) {
          const session = await res.json();
          setLoaded((prev) => ({ ...prev, [id]: session }));
        }
      } finally {
        setLoading(null);
      }
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="panel mt-3 py-14 text-center">
        <p className="text-[13px] text-dim">아직 수집된 세션 대화가 없습니다.</p>
        <p className="text-[11.5px] text-faint mt-1">
          이 저장소에서 다음 커밋(또는 <code className="font-mono">ailog sync</code>)이 실행되면 채워집니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2.5">
      <p className="text-[11.5px] text-faint px-1">
        세션을 펼치면 처음부터 끝까지의 AI 대화가 표시되고, 커밋이 발생한 지점에 배지가 붙습니다.
      </p>
      {sessions.map((s) => {
        const open = openId === s.id;
        const sessionCommits = commits.filter(
          (c) => s.startedAt && s.endedAt && c.date >= s.startedAt && c.date <= s.endedAt,
        );
        return (
          <div key={s.id} className="panel overflow-hidden">
            <button
              onClick={() => toggle(s.id)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-surface-2 transition-colors"
            >
              <span className={`text-[10px] text-faint transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
              <span className="font-mono text-[12px]">
                {fmtShort(s.startedAt)} ~ {fmtShort(s.endedAt)}
              </span>
              {s.model && <span className="chip !py-0.5 !text-[10.5px]">{s.model}</span>}
              {s.effort && <span className="chip !py-0.5 !text-[10.5px]">effort {s.effort}</span>}
              {sessionCommits.length > 0 && (
                <span className="chip-amber !py-0.5 !text-[10.5px]">⎇ 커밋 {sessionCommits.length}</span>
              )}
              {s.skills?.map((sk) => (
                <span key={skillName(sk)} className="chip-violet !py-0.5 !text-[10.5px]">
                  {skillName(sk)}
                </span>
              ))}
              {s.subagentCount > 0 && (
                <span className="chip-violet !py-0.5 !text-[10.5px]">서브에이전트 {s.subagentCount}</span>
              )}
              <span className="ml-auto font-mono text-[10.5px] text-faint">
                {s.transcriptCount.toLocaleString()}항목
                {s.usage && ` · 출력 ${s.usage.outputTokens.toLocaleString()}tk`}
              </span>
            </button>
            {open && (
              <div className="border-t border-line max-h-[70vh] overflow-y-auto scrollbox">
                {loading === s.id ? (
                  <div className="p-10 grid place-items-center text-dim">
                    <span className="spinner" />
                  </div>
                ) : loaded[s.id] ? (
                  <>
                    {(loaded[s.id].skills?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap px-5 pt-4">
                        <SkillChips skills={loaded[s.id].skills!} />
                      </div>
                    )}
                  <ArtifactChat
                    transcript={loaded[s.id].transcript}
                    markers={sessionCommits}
                    repo={repo}
                    header={null}
                    subagents={loaded[s.id].subagents ?? []}
                  />
                  </>
                ) : (
                  <p className="p-6 text-[12.5px] text-dim">세션을 불러오지 못했습니다.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
