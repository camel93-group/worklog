'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Meeting, MeetingFile } from '@/lib/types';
import { durationMin } from '@/lib/format';
import AudioPlayer from './AudioPlayer';
import AttachmentsPanel from './AttachmentsPanel';
import TranscriptChat from '@/components/TranscriptChat';

type Tab = 'summary' | 'revised' | 'raw';
const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: '요약본' },
  { key: 'revised', label: '의역본' },
  { key: 'raw', label: '원본' },
];

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'full' }).format(new Date(iso));
const fmtHM = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const fmtShort = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

const SPEAKER_COLORS = ['var(--color-mint)', 'var(--color-blue)', 'var(--color-violet)', 'var(--color-amber)', 'var(--color-rose)'];
const speakerColor = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length];
};

export default function MeetingView({ initial, files }: { initial: Meeting; files: MeetingFile[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = (search.get('tab') as Tab) ?? 'summary';

  const [meeting, setMeeting] = useState(initial);
  const [confirm, setConfirm] = useState<null | 'review' | 'delete'>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(meeting.summaries.at(-1)?.version);

  const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm === 'review') {
        const res = await fetch(`/api/meetings/${meeting.id}/review`, { method: 'POST' });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        setMeeting(await res.json());
        setConfirm(null);
        router.refresh();
      } else {
        const res = await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const chips = [
    { k: 'DATE', v: fmtDate(meeting.startedAt) },
    { k: 'TIME', v: `${fmtHM(meeting.startedAt)} ~ ${fmtHM(meeting.endedAt)} (${durationMin(meeting.startedAt, meeting.endedAt)}분)` },
    { k: 'CH', v: `#${meeting.channelName}` },
    { k: 'MEMBERS', v: meeting.participants.join(', ') || '없음' },
  ];

  return (
    <div>
      <Link href="/" className="text-[12.5px] text-faint hover:text-dim transition-colors">
        ← 목록으로
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mono-label">DEPTH 02 · MEETING</div>
          <h1 className="text-[26px] font-semibold mt-0.5">{meeting.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {meeting.reviewed ? (
            <span className="chip-mint">✓ 확인 완료</span>
          ) : (
            <button className="btn btn-primary" onClick={() => setConfirm('review')}>
              확인 완료
            </button>
          )}
          <button className="btn btn-rose" onClick={() => setConfirm('delete')}>
            삭제
          </button>
        </div>
      </div>

      {confirm && (
        <div
          className="mt-3 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{
            background: 'color-mix(in oklab, var(--color-amber) 14%, var(--color-surface-1))',
            border: '1px solid color-mix(in oklab, var(--color-amber) 38%, transparent)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">
              {confirm === 'review' ? '확인 완료 처리할까요?' : '이 회의를 삭제할까요?'}
            </div>
            <div className="text-[12px] text-dim">
              {confirm === 'review'
                ? '유저별 원본 오디오(디버그 파일)가 삭제되고 합본만 남습니다.'
                : '회의록·요약·오디오가 모두 삭제되며 되돌릴 수 없습니다.'}
            </div>
          </div>
          <button className="btn" onClick={() => setConfirm(null)} disabled={busy}>
            취소
          </button>
          <button className={confirm === 'delete' ? 'btn btn-rose' : 'btn btn-primary'} onClick={runConfirm} disabled={busy}>
            {busy ? '처리 중…' : confirm === 'review' ? '완료 처리' : '삭제 실행'}
          </button>
          {error && <span className="text-[12px] text-rose w-full">⚠ {error}</span>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {chips.map((c) => (
          <span key={c.k} className="chip">
            <span className="k">{c.k}</span>
            <span className="text-[12px] text-ink">{c.v}</span>
          </span>
        ))}
        {meeting.revised?.manuallyEdited && <span className="chip-amber">직접수정</span>}
      </div>

      <div className="mt-4 grid gap-5 wide:grid-cols-[minmax(0,1fr)_minmax(240px,296px)] items-start">
        <div className="min-w-0">
          {meeting.audio && <AudioPlayer meetingId={meeting.id} />}

          {/* 탭 바 */}
          <div className="mt-4 inline-flex rounded-[13px] bg-surface-1 border border-line p-[5px] gap-1">
            {TABS.map((t, i) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-[12.5px] transition-colors ${
                  tab === t.key
                    ? 'bg-surface-2 font-semibold border border-mint/32 text-ink'
                    : 'text-dim hover:text-ink border border-transparent'
                }`}
              >
                <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-3 card overflow-hidden">
            {tab === 'summary' && (
              <SummaryTab
                meeting={meeting}
                onUpdate={setMeeting}
                selected={selectedVersion}
                setSelected={setSelectedVersion}
              />
            )}
            {tab === 'revised' && <RevisedTab meeting={meeting} onUpdate={setMeeting} />}
            {tab === 'raw' && <TranscriptChat text={meeting.original} audioStartIso={meeting.audio ? meeting.startedAt : undefined} />}
          </div>
        </div>

        {/* 메타 레일 */}
        <aside className="panel p-4 space-y-4 max-wide:order-last">
          <div>
            <div className="mono-label mb-2">MEETING INFO</div>
            {[
              ['일자', fmtDate(meeting.startedAt)],
              ['시간', `${fmtHM(meeting.startedAt)} ~ ${fmtHM(meeting.endedAt)}`],
              ['길이', `${durationMin(meeting.startedAt, meeting.endedAt)}분`],
              ['채널', `#${meeting.channelName}`],
              ['상태', meeting.reviewed ? '확인 완료' : '검토 대기'],
              ['수정', meeting.revised?.manuallyEdited ? '직접수정됨' : '자동 의역'],
            ].map(([k, v]) => (
              <div key={k} className="flex text-[12px] py-[3px]">
                <span className="w-[52px] shrink-0 text-faint">{k}</span>
                <span className="text-dim">{v}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-line" />
          <div>
            <div className="mono-label mb-2">MEMBERS</div>
            <div className="space-y-1.5">
              {meeting.participants.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span
                    className="size-6 rounded-lg grid place-items-center text-[11px] font-bold text-surface-0"
                    style={{ background: speakerColor(p) }}
                  >
                    {p[0]}
                  </span>
                  <span className="text-[12.5px] text-dim">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-line" />
          <div>
            <div className="mono-label mb-2">SUMMARY VERSIONS</div>
            <div className="space-y-1">
              {meeting.summaries.map((s) => (
                <button
                  key={s.version}
                  onClick={() => {
                    setSelectedVersion(s.version);
                    setTab('summary');
                  }}
                  className={`flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-left text-[12px] ${
                    s.version === selectedVersion ? 'bg-surface-2 text-ink' : 'text-dim hover:bg-surface-2'
                  }`}
                >
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ background: s.version === selectedVersion ? 'var(--color-mint)' : 'var(--color-line)' }}
                  />
                  {s.version === 1 ? '최초 생성' : `버전${s.version}`}
                  <span className="ml-auto font-mono text-[10.5px] text-faint">{fmtShort(s.createdAt)}</span>
                </button>
              ))}
              {meeting.summaries.length === 0 && <p className="text-[12px] text-faint">없음</p>}
            </div>
          </div>
          <div className="h-px bg-line" />
          <AttachmentsPanel meetingId={meeting.id} initialFiles={files} />
          <div className="rounded-xl border border-dashed border-line p-3 font-mono text-[10.5px] text-faint leading-6">
            data/meetings/{meeting.id}.json
            <br />├ original / revised
            <br />├ summaries × {meeting.summaries.length}
            <br />└ audio/{meeting.id}.m4a
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryTab({
  meeting,
  onUpdate,
  selected,
  setSelected,
}: {
  meeting: Meeting;
  onUpdate: (m: Meeting) => void;
  selected: number | undefined;
  setSelected: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = meeting.summaries.find((s) => s.version === selected) ?? meeting.summaries.at(-1);

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/summaries`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const updated: Meeting = await res.json();
      onUpdate(updated);
      const latest = updated.summaries.at(-1);
      if (latest) setSelected(latest.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2.5 flex-wrap">
        {meeting.summaries.length > 0 && current && (
          <div className="relative">
            <button className="btn" onClick={() => setOpen(!open)}>
              {current.version === 1 ? '최초 생성' : `버전${current.version}`} ·{' '}
              <span className="font-mono text-[11px] text-faint">{fmtShort(current.createdAt)}</span>
              <span className="text-faint text-[10px]">▾</span>
            </button>
            {open && (
              <div
                className="absolute z-10 mt-1.5 w-[230px] rounded-xl bg-surface-2 border border-line p-1.5"
                style={{ boxShadow: '0 22px 44px -22px black' }}
              >
                {[...meeting.summaries].reverse().map((s) => (
                  <button
                    key={s.version}
                    onClick={() => {
                      setSelected(s.version);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-[12px] text-left text-dim hover:bg-surface-3"
                  >
                    {s.version === 1 ? '최초 생성' : `버전${s.version}`}
                    <span className="ml-auto font-mono text-[10.5px] text-faint">{fmtShort(s.createdAt)}</span>
                    {s.version === current.version && <span className="text-mint text-[10.5px]">현재</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="btn btn-primary" onClick={regenerate} disabled={regenerating}>
          {regenerating && <span className="spinner" />}
          {regenerating ? '재생성 중…' : '의역본 기준 재생성'}
        </button>
      </div>
      {error && <p className="mt-3 text-[12.5px] text-rose">⚠ {error}</p>}
      <div className="mt-4">
        {current ? (
          <SummaryText text={current.text} />
        ) : (
          <p className="text-[12.5px] text-dim">아직 요약본이 없습니다. 재생성 버튼으로 생성할 수 있습니다.</p>
        )}
      </div>
    </div>
  );
}

const SECTION_DOTS: [RegExp, string][] = [
  [/결정/, 'var(--color-rose)'],
  [/액션/, 'var(--color-mint)'],
  [/논의/, 'var(--color-blue)'],
];

function SummaryText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="text-[13.5px] leading-[1.72]">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          const title = line.slice(3).replace(/^[^가-힣A-Za-z]*/, '');
          const dot = SECTION_DOTS.find(([re]) => re.test(title))?.[1] ?? 'var(--color-faint)';
          let count = 0;
          for (let j = i + 1; j < lines.length && !lines[j].startsWith('## '); j++) {
            if (lines[j].startsWith('- ')) count++;
          }
          return (
            <div key={i} className="flex items-center gap-2 mt-5 first:mt-0 pb-1.5 mb-1.5 border-b border-line">
              <span className="size-[7px] rounded-full" style={{ background: dot }} />
              <span className="text-[14.5px] font-semibold">{title}</span>
              <span className="ml-auto font-mono text-[10.5px] text-faint">{count}</span>
            </div>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <p key={i} className="flex gap-2.5 py-[3px] pl-1">
              <span className="size-[5px] rounded-full bg-faint mt-[9px] shrink-0" />
              <span>
                <Bold text={line.slice(2)} />
              </span>
            </p>
          );
        }
        if (!line.trim()) return null;
        return (
          <p key={i} className="py-[3px]">
            <Bold text={line} />
          </p>
        );
      })}
    </div>
  );
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}</>;
}

function RevisedTab({ meeting, onUpdate }: { meeting: Meeting; onUpdate: (m: Meeting) => void }) {
  const currentText = meeting.revised?.text ?? meeting.original;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/revised`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      onUpdate(await res.json());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
        <div className="text-[11.5px] text-faint leading-5">
          교정 표기: <code className="font-mono">교정어(원문: 원래표기)</code>
          <br />
          말풍선을 누르면 그 시점부터 음성이 재생됩니다
        </div>
        {meeting.revised?.manuallyEdited && <span className="chip-amber">직접수정</span>}
        <div className="ml-auto flex gap-2 shrink-0">
          {editing ? (
            <>
              <button
                className="btn"
                disabled={saving}
                onClick={() => {
                  setDraft(currentText);
                  setEditing(false);
                  setError(null);
                }}
              >
                취소
              </button>
              <button className="btn btn-primary" disabled={saving || draft === currentText} onClick={save}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </>
          ) : (
            <button
              className="btn"
              onClick={() => {
                setDraft(currentText);
                setEditing(true);
              }}
            >
              편집
            </button>
          )}
        </div>
      </div>
      {error && <p className="px-5 pt-3 text-[12.5px] text-rose">⚠ {error}</p>}
      {editing ? (
        <div className="p-5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[280px] h-[58vh] rounded-xl bg-surface-0 border border-line p-4 font-mono text-[13px] leading-[1.8] resize-y"
          />
        </div>
      ) : (
        <TranscriptChat
          text={currentText}
          highlightCorrections
          audioStartIso={meeting.audio ? meeting.startedAt : undefined}
        />
      )}
    </div>
  );
}
