'use client';

import { parseTranscript, seekOffsetSec } from '@/lib/transcript';

const SPEAKER_COLORS = ['var(--color-mint)', 'var(--color-blue)', 'var(--color-violet)', 'var(--color-amber)', 'var(--color-rose)'];

function colorOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return SPEAKER_COLORS[h % SPEAKER_COLORS.length];
}

const fmtOffset = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function playFrom(offset: number | null) {
  if (offset == null) return;
  const el = document.getElementById('meeting-audio') as HTMLAudioElement | null;
  if (!el) return;
  el.currentTime = offset;
  el.play();
}

function MessageText({ text, highlightCorrections }: { text: string; highlightCorrections?: boolean }) {
  if (!highlightCorrections) return <>{text}</>;
  const parts = text.split(/(\(원문:\s*[^)]*\))/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('(원문:') ? (
          <span key={i} className="mx-0.5 text-[11.5px] text-faint">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function TranscriptChat({
  text,
  highlightCorrections = false,
  audioStartIso,
}: {
  text: string;
  highlightCorrections?: boolean;
  audioStartIso?: string;
}) {
  const messages = parseTranscript(text);
  if (!messages) {
    return <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-6 p-5">{text}</pre>;
  }

  const offsetOf = (time: string) => (audioStartIso ? seekOffsetSec(time, audioStartIso) : null);

  return (
    <div className="p-5 space-y-1.5">
      {messages.map((msg, i) => {
        const offset = offsetOf(msg.time);
        const clickable = offset != null;

        if (msg.isBot) {
          return (
            <div key={i} className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => playFrom(offset)}
                disabled={!clickable}
                className={`max-w-[85%] rounded-full bg-surface-3 border border-line px-4 py-1.5 text-[11.5px] text-dim ${
                  clickable ? 'cursor-pointer hover:border-mint/40 transition-colors' : ''
                }`}
              >
                {msg.text} <span className="font-mono text-[10px] text-faint">· {msg.time}</span>
              </button>
            </div>
          );
        }

        const prev = messages[i - 1];
        const showHeader = !prev || prev.speaker !== msg.speaker || prev.isBot;
        const color = colorOf(msg.speaker);

        return (
          <div key={i} className={`flex gap-3 ${showHeader ? 'pt-3.5 first:pt-0' : ''}`}>
            {showHeader ? (
              <span
                className="size-[30px] shrink-0 rounded-[10px] grid place-items-center text-[12.5px] font-bold text-surface-0"
                style={{ background: color }}
              >
                {msg.speaker[0]}
              </span>
            ) : (
              <span className="w-[30px] shrink-0" />
            )}
            <div className="min-w-0">
              {showHeader && (
                <div className="flex items-baseline gap-2">
                  <span className="text-[12.5px] font-semibold" style={{ color }}>
                    {msg.speaker}
                  </span>
                  <span className="font-mono text-[10.5px] text-faint">{msg.time}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => playFrom(offset)}
                disabled={!clickable}
                title={clickable ? '이 시점부터 듣기' : undefined}
                className={`group mt-1 inline-flex items-end gap-2.5 max-w-full rounded-[13px] rounded-tl-[5px] bg-surface-3 border border-transparent px-3.5 py-2 text-left text-[13.5px] leading-[1.72] whitespace-pre-wrap break-words ${
                  clickable ? 'cursor-pointer hover:bg-[color-mix(in_oklab,var(--color-surface-3)_80%,white_4%)] hover:border-line transition-colors' : 'cursor-default'
                }`}
              >
                <span className="min-w-0">
                  <MessageText text={msg.text} highlightCorrections={highlightCorrections} />
                </span>
                {clickable && (
                  <span className="font-mono text-[10px] text-faint opacity-60 group-hover:opacity-100 shrink-0">
                    ▶ {fmtOffset(offset!)}
                  </span>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
