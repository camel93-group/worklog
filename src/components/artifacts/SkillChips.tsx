'use client';

import { useState } from 'react';
import { skillContent, skillName, type SkillUse } from '@/lib/skills';

/** 사용된 스킬 칩 — 정의 원문이 있으면 클릭해서 펼쳐볼 수 있다 */
export default function SkillChips({ skills }: { skills: SkillUse[] }) {
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  if (skills.length === 0) return null;

  const opened = skills.find((s) => skillName(s) === openSkill);
  const openedContent = opened ? skillContent(opened) : null;

  return (
    <>
      {skills.map((s) => {
        const name = skillName(s);
        const hasContent = skillContent(s) !== null;
        const active = openSkill === name;
        return (
          <button
            key={name}
            onClick={() => hasContent && setOpenSkill(active ? null : name)}
            className={`chip-violet ${hasContent ? 'hover:opacity-85' : 'cursor-default opacity-80'}`}
            title={hasContent ? '클릭하면 스킬 정의를 볼 수 있습니다' : '정의 원문 미수집'}
          >
            <span className="k">SKILL</span>
            {name}
            {hasContent && <span className="text-[9px]">{active ? '▴' : '▾'}</span>}
          </button>
        );
      })}
      {openedContent && (
        <div className="w-full mt-2 rounded-xl border bg-surface-1 overflow-hidden"
          style={{ borderColor: 'color-mix(in oklab, var(--color-violet) 34%, transparent)' }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-line">
            <span className="mono-label">SKILL · {openSkill}</span>
            <button onClick={() => setOpenSkill(null)} className="text-[12px] text-faint hover:text-ink">
              × 닫기
            </button>
          </div>
          <pre className="p-4 max-h-[50vh] overflow-y-auto scrollbox whitespace-pre-wrap font-mono text-[11.5px] leading-6 text-dim">
            {openedContent}
          </pre>
        </div>
      )}
    </>
  );
}
