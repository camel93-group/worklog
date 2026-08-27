import Link from 'next/link';
import { listMeetings, durationMin } from '@/lib/store';

export const dynamic = 'force-dynamic';

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(iso));
const fmtWeekday = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(new Date(iso));
const fmtHM = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const fmtMD = (iso: string) => {
  const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="min-w-[92px] rounded-xl bg-surface-2 border border-line px-3.5 py-2.5">
      <div className="font-mono text-[17px] leading-tight">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}

export default async function HomePage() {
  const meetings = await listMeetings();

  const byDate = new Map<string, typeof meetings>();
  for (const m of meetings) {
    const key = fmtDay(m.startedAt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div>
          <div className="mono-label">DEPTH 01</div>
          <h1 className="text-[26px] font-semibold mt-1">회의록</h1>
          <p className="text-[12.5px] text-dim mt-0.5">
            디스코드 음성회의가 자동으로 기록·요약됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Stat value={meetings.length} label="전체 회의" />
          <Stat value={meetings.filter((m) => m.reviewed).length} label="확인 완료" />
          <Stat value={meetings.filter((m) => m.audio).length} label="녹음 보관" />
        </div>
      </div>

      {meetings.length === 0 && (
        <div className="card mt-6 py-16 text-center">
          <p className="text-dim">아직 저장된 회의가 없습니다.</p>
          <p className="text-[12px] text-faint mt-1">
            디스코드 음성채널에서 회의를 진행하면 자동으로 기록됩니다.
          </p>
        </div>
      )}

      <div className="mt-[22px] space-y-[22px]">
        {[...byDate.entries()].map(([date, list]) => (
          <section key={date}>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-[12px] tracking-[0.06em] text-dim">
                {date} {fmtWeekday(list[0].startedAt)}
              </span>
              <span className="flex-1 h-px bg-line" />
              <span className="text-[11.5px] text-faint">{list.length}건</span>
            </div>
            <div className="space-y-2.5">
              {list.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="card flex items-stretch overflow-hidden transition-colors hover:border-mint/40 hover:bg-surface-3 group"
                >
                  <div className="w-[86px] shrink-0 bg-surface-1 border-r border-line grid place-content-center text-center py-3.5">
                    <div className="font-mono text-[19px] font-medium">{fmtHM(m.startedAt)}</div>
                    <div className="font-mono text-[10.5px] text-faint">{fmtMD(m.startedAt)}</div>
                  </div>
                  <div className="min-w-0 flex-1 px-4 py-3">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[16px] font-semibold leading-snug line-clamp-2 min-w-0" title={m.title}>
                        {m.title}
                      </span>
                      <span className="font-mono text-[11px] text-faint shrink-0">#{m.channelName}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="chip">{m.participants.join(', ') || '참가자 없음'}</span>
                      <span className="chip">{durationMin(m.startedAt, m.endedAt)}분</span>
                      <span className="chip">요약 {m.summaries.length}개</span>
                      {m.audio && <span className="chip">녹음</span>}
                      {m.revised?.manuallyEdited && <span className="chip-amber">직접수정</span>}
                      {m.reviewed ? (
                        <span className="chip-mint">✓ 확인완료</span>
                      ) : (
                        <span className="chip-rose">검토 대기</span>
                      )}
                    </div>
                  </div>
                  <div className="grid place-items-center px-3.5 text-[15px] text-faint group-hover:text-dim">
                    ›
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
