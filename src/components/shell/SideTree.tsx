'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { TreeMeeting, TreeProject } from './AppShell';

function dateKey(iso: string) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(iso));
}
function timeLabel(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block text-[11px] leading-none transition-transform duration-150 ${
        open ? 'rotate-90' : ''
      }`}
    >
      ▸
    </span>
  );
}

function itemCls(active: boolean) {
  return `flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-[12.5px] text-left transition-colors relative ${
    active
      ? 'bg-mint/13 border border-mint/34 text-ink before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded before:bg-mint'
      : 'text-dim hover:bg-surface-2 border border-transparent'
  }`;
}

/** 루트 행: 라벨 클릭 = 목록으로 이동, 우측 셰브론 = 접기/펼치기 */
function RootRow({
  href,
  active,
  dotClass,
  label,
  count,
  open,
  onToggle,
  onNavigate,
}: {
  href: string;
  active: boolean;
  dotClass: string;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="flex items-center rounded-lg hover:bg-surface-2 transition-colors">
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2 text-[13px] font-semibold ${
          active ? 'text-ink' : 'text-dim hover:text-ink'
        }`}
      >
        <span className={`size-1.5 rounded-full ${dotClass}`} />
        {label}
        <span className="ml-auto font-mono text-[10.5px] text-faint font-normal">{count}</span>
      </Link>
      <button
        onClick={onToggle}
        aria-label={open ? `${label} 접기` : `${label} 펼치기`}
        className="grid place-items-center size-8 mr-1 shrink-0 rounded-md text-faint hover:text-ink hover:bg-surface-3 transition-colors"
      >
        <Chevron open={open} />
      </button>
    </div>
  );
}

export default function SideTree({
  meetings,
  projects,
  onNavigate,
}: {
  meetings: TreeMeeting[];
  projects: TreeProject[];
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number; project: TreeProject } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function closeMenu() {
    setMenu(null);
    setConfirming(false);
    setDeleting(false);
  }

  async function deleteProject() {
    if (!menu) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/artifacts/${menu.project.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (pathname.startsWith(`/artifacts/${menu.project.id}`)) router.push('/artifacts');
        router.refresh();
      }
    } finally {
      closeMenu();
    }
  }
  const isOpen = (key: string) => open[key] ?? true;
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !isOpen(key) }));

  const byDate = new Map<string, TreeMeeting[]>();
  for (const m of meetings) {
    const key = dateKey(m.startedAt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }

  const railCls = 'ml-[17px] pl-[8px] border-l border-line space-y-0.5';

  return (
    <nav className="space-y-1">
      <RootRow
        href="/"
        active={pathname === '/'}
        dotClass="bg-mint"
        label="회의록"
        count={meetings.length}
        open={isOpen('meetings')}
        onToggle={() => toggle('meetings')}
        onNavigate={onNavigate}
      />
      {isOpen('meetings') && (
        <div className={railCls}>
          {[...byDate.entries()].map(([date, list]) => (
            <div key={date}>
              {/* 날짜 그룹: 행 전체가 접기/펼치기 버튼 */}
              <button
                onClick={() => toggle(`d-${date}`)}
                className="flex items-center gap-2 w-full rounded-lg px-2 py-[7px] text-left text-faint hover:text-dim hover:bg-surface-2 transition-colors"
              >
                <Chevron open={isOpen(`d-${date}`)} />
                <span className="font-mono text-[11px] tracking-wider">{date}</span>
                <span className="ml-auto font-mono text-[10px]">{list.length}</span>
              </button>
              {isOpen(`d-${date}`) && (
                <div className={railCls}>
                  {list.map((m) => {
                    const active = pathname.startsWith(`/meetings/${m.id}`);
                    return (
                      <Link
                        key={m.id}
                        href={`/meetings/${m.id}`}
                        onClick={onNavigate}
                        className={itemCls(active)}
                        title={m.title}
                      >
                        <span className="font-mono text-[11px] text-faint shrink-0">
                          {timeLabel(m.startedAt)}
                        </span>
                        <span className="truncate">{m.title}</span>
                        {m.reviewed && <span className="ml-auto text-mint text-[11px]">✓</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {meetings.length === 0 && <p className="px-2 py-1 text-[11.5px] text-faint">회의 없음</p>}
        </div>
      )}

      <div className="pt-2">
        <RootRow
          href="/artifacts"
          active={pathname === '/artifacts'}
          dotClass="bg-amber"
          label="산출물"
          count={projects.length}
          open={isOpen('artifacts')}
          onToggle={() => toggle('artifacts')}
          onNavigate={onNavigate}
        />
      </div>
      {isOpen('artifacts') && (
        <div className={railCls}>
          {projects.map((p) => {
            const active = pathname.startsWith(`/artifacts/${p.id}`);
            return (
              <Link
                key={p.id}
                href={`/artifacts/${p.id}`}
                onClick={onNavigate}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setConfirming(false);
                  setMenu({ x: e.clientX, y: e.clientY, project: p });
                }}
                className={itemCls(active)}
                title={p.dup ? `${p.name} (${p.id.slice(0, 6)})` : p.name}
              >
                <span className="font-mono text-[12px] truncate">{p.name}</span>
                {p.dup && <span className="font-mono text-[9.5px] text-faint">{p.id.slice(0, 6)}</span>}
                <span className="ml-auto font-mono text-[10.5px] text-faint">{p.count}</span>
              </Link>
            );
          })}
          {projects.length === 0 && <p className="px-2 py-1 text-[11.5px] text-faint">프로젝트 없음</p>}
        </div>
      )}

      {/* 산출물 우클릭 컨텍스트 메뉴 */}
      {menu && (
        <>
          <button
            aria-label="메뉴 닫기"
            className="fixed inset-0 z-40 cursor-default"
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          />
          <div
            className="fixed z-50 min-w-[190px] rounded-xl bg-surface-2 border border-line p-1.5"
            style={{
              left: Math.min(menu.x, typeof window !== 'undefined' ? window.innerWidth - 210 : menu.x),
              top: menu.y,
              boxShadow: '0 22px 44px -22px black',
            }}
          >
            <div className="px-2.5 py-1 font-mono text-[10.5px] text-faint truncate">
              {menu.project.name} · {menu.project.id.slice(0, 6)}
            </div>
            {confirming ? (
              <>
                <div className="px-2.5 py-1 text-[11px] text-faint">
                  커밋 기록·세션 대화가 삭제됩니다.
                </div>
                <button
                  onClick={deleteProject}
                  disabled={deleting}
                  className="flex w-full rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-left transition-colors disabled:opacity-50"
                  style={{ color: 'color-mix(in oklab, var(--color-rose) 80%, white)', background: 'color-mix(in oklab, var(--color-rose) 16%, transparent)' }}
                >
                  {deleting ? '삭제 중…' : '정말 삭제'}
                </button>
                <button
                  onClick={closeMenu}
                  className="flex w-full rounded-lg px-2.5 py-1.5 text-[12.5px] text-dim text-left hover:bg-surface-3 transition-colors"
                >
                  취소
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex w-full rounded-lg px-2.5 py-1.5 text-[12.5px] text-left hover:bg-surface-3 transition-colors"
                style={{ color: 'color-mix(in oklab, var(--color-rose) 78%, white)' }}
              >
                프로젝트 삭제…
              </button>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
