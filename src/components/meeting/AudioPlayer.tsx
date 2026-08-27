'use client';

import { useEffect, useRef, useState } from 'react';

const BAR_COUNT = 64;

/** 회의 id 기반 결정적 의사 파형 (7–30px) */
function bars(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(7 + (h % 24));
  }
  return out;
}

const fmt = (sec: number) => {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function AudioPlayer({ meetingId }: { meetingId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const heights = bars(meetingId);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    el.play();
  }

  const progress = duration > 0 ? time / duration : 0;

  return (
    <div className="panel px-4 py-3 flex items-center gap-4">
      {/* TranscriptChat의 말풍선 클릭 시킹이 이 엘리먼트를 재사용한다 */}
      <audio ref={audioRef} id="meeting-audio" preload="metadata" src={`/api/meetings/${meetingId}/audio`} />
      <button
        onClick={toggle}
        aria-label={playing ? '일시정지' : '재생'}
        className="size-[42px] shrink-0 rounded-full grid place-items-center text-[13px]"
        style={{
          background: 'color-mix(in oklab, var(--color-mint) 18%, var(--color-surface-2))',
          border: '1px solid color-mix(in oklab, var(--color-mint) 45%, transparent)',
          color: 'color-mix(in oklab, var(--color-mint) 75%, white)',
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex items-end gap-[2px] h-[34px] cursor-pointer"
          onClick={seek}
          title="클릭해서 이동"
        >
          {heights.map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}px`,
                background: i / BAR_COUNT <= progress ? 'var(--color-mint)' : '#4A4E5B',
                opacity: i / BAR_COUNT <= progress ? 0.9 : 0.8,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-faint">
          <span>{fmt(time)}</span>
          <span>전원 음성 합본 · m4a</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
