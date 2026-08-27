'use client';

import { useState } from 'react';
import SideTree from './SideTree';
import TopBar from './TopBar';

export interface TreeMeeting {
  id: string;
  title: string;
  channelName: string;
  startedAt: string;
  reviewed: boolean;
}
export interface TreeProject {
  id: string; // projectId (root 커밋 해시) — URL 키
  name: string; // 표시 이름 (폴더명)
  dup: boolean; // 같은 이름의 프로젝트가 또 있는지
  count: number;
}

export default function AppShell({
  meetings,
  projects,
  children,
}: {
  meetings: TreeMeeting[];
  projects: TreeProject[];
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen nav:grid nav:grid-cols-[268px_minmax(0,1fr)]">
      {/* 모바일 스크림 */}
      {navOpen && (
        <button
          aria-label="메뉴 닫기"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 max-nav:block hidden"
          style={{ background: 'oklch(0.10 0.01 265 / 0.66)', backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* 사이드패널 */}
      <aside
        className={`z-40 flex flex-col bg-surface-1 border-r border-line
          nav:sticky nav:top-0 nav:h-screen
          max-nav:fixed max-nav:inset-y-0 max-nav:left-0 max-nav:w-[292px]
          max-nav:transition-transform max-nav:duration-300
          ${navOpen ? 'max-nav:translate-x-0' : 'max-nav:-translate-x-[101%]'}`}
        style={navOpen ? { boxShadow: '30px 0 60px -40px black' } : undefined}
      >
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-line">
          <span className="size-[26px] rounded-lg bg-mint/80 shrink-0" />
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight">워크로그</div>
            <div className="text-[10.5px] text-faint">회의 · 산출물 협업 관리</div>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            className="ml-auto hidden max-nav:grid place-items-center size-8 rounded-lg text-dim hover:bg-surface-2"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbox px-2.5 py-3">
          <SideTree meetings={meetings} projects={projects} onNavigate={() => setNavOpen(false)} />
        </div>

        <div className="px-4 py-3 border-t border-line">
          <div className="font-mono text-[10.5px] text-faint">data/meetings · data/artifacts</div>
          <div className="text-[11.5px] text-faint mt-0.5">DB 없음 · 파일 기반 저장</div>
        </div>
      </aside>

      {/* 본문 */}
      <div className="min-w-0">
        {/* 주의: main에 key={pathname}을 걸면 그래프 행 클릭(replaceState) 시
            전체가 리마운트되어 선택 상태가 초기화된다 — key 없이 유지 */}
        <TopBar meetings={meetings} projects={projects} onMenu={() => setNavOpen(true)} />
        <main className="rise mx-auto max-w-[1140px] px-5 pt-[26px] pb-[72px]">{children}</main>
      </div>
    </div>
  );
}
