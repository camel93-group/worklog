'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { TreeMeeting, TreeProject } from './AppShell';

const TAB_LABELS: Record<string, string> = { summary: '요약본', revised: '의역본', raw: '원본' };

function Crumbs({ meetings, projects }: { meetings: TreeMeeting[]; projects: TreeProject[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const segments: { label: string; href?: string }[] = [];

  if (pathname.startsWith('/meetings/')) {
    const id = pathname.split('/')[2];
    const meeting = meetings.find((m) => m.id === id);
    segments.push({ label: '회의록', href: '/' });
    segments.push({ label: meeting?.title ?? id });
    const tab = search.get('tab') ?? 'summary';
    segments.push({ label: TAB_LABELS[tab] ?? tab });
  } else if (pathname.startsWith('/artifacts')) {
    const [, , pid, commit] = pathname.split('/');
    segments.push({ label: '산출물', href: '/artifacts' });
    if (pid) {
      const project = projects.find((p) => p.id === pid);
      segments.push({ label: project?.name ?? pid.slice(0, 7), href: `/artifacts/${pid}` });
    }
    if (commit) segments.push({ label: commit.slice(0, 7) });
  } else {
    segments.push({ label: '회의록' });
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {segments.map((seg, i) => {
        const num = String(i + 1).padStart(2, '0');
        const last = i === segments.length - 1;
        const inner = (
          <>
            <span className="font-mono text-[10px] text-faint">{num}</span>
            <span className="truncate max-w-[220px]">{seg.label}</span>
          </>
        );
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-line select-none">/</span>}
            {last ? (
              <span
                className="flex items-center gap-1.5 rounded-lg bg-surface-2 border border-line px-2.5 py-1 text-[12px] font-medium min-w-0"
                title={seg.label}
              >
                {inner}
              </span>
            ) : seg.href ? (
              <Link
                href={seg.href}
                className="flex items-center gap-1.5 px-1.5 py-1 text-[12px] text-dim hover:text-ink min-w-0"
              >
                {inner}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 px-1.5 py-1 text-[12px] text-dim min-w-0">{inner}</span>
            )}
          </span>
        );
      })}
      <span className="ml-auto pl-3 font-mono text-[10.5px] text-faint tracking-widest shrink-0">
        DEPTH {segments.length}
      </span>
    </div>
  );
}

export default function TopBar({
  meetings,
  projects,
  onMenu,
}: {
  meetings: TreeMeeting[];
  projects: TreeProject[];
  onMenu: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-20 h-[58px] border-b border-line flex items-center px-4"
      style={{ background: 'oklch(0.168 0.01 265 / 0.86)', backdropFilter: 'blur(14px)' }}
    >
      <button
        onClick={onMenu}
        className="hidden max-nav:grid place-items-center size-[34px] rounded-lg border border-line text-dim mr-2.5 shrink-0"
        aria-label="메뉴"
      >
        ≡
      </button>
      <div className="flex-1 min-w-0">
        <Suspense fallback={null}>
          <Crumbs meetings={meetings} projects={projects} />
        </Suspense>
      </div>
    </header>
  );
}
