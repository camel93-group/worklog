import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// globals.css의 @import url()은 Tailwind 확장 CSS 뒤로 밀려 빌드에서 제거된다 — next/font로 셀프호스팅
const pretendard = localFont({
  src: '../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
});
import { listMeetings } from '@/lib/store';
import { listArtifacts } from '@/lib/artifacts';
import AppShell, { type TreeMeeting, type TreeProject } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: '워크로그',
  description: '회의 · 산출물 협업 관리',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [meetings, artifacts] = await Promise.all([listMeetings(), listArtifacts()]);

  const treeMeetings: TreeMeeting[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    channelName: m.channelName,
    startedAt: m.startedAt,
    reviewed: Boolean(m.reviewed),
  }));

  const projectMap = new Map<string, { name: string; count: number }>();
  for (const a of artifacts) {
    const entry = projectMap.get(a.projectId) ?? { name: a.repo, count: 0 };
    entry.count++;
    entry.name = a.repo || entry.name;
    projectMap.set(a.projectId, entry);
  }
  const nameCounts = new Map<string, number>();
  for (const { name } of projectMap.values()) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  const treeProjects: TreeProject[] = [...projectMap.entries()].map(([id, p]) => ({
    id,
    name: p.name,
    dup: (nameCounts.get(p.name) ?? 0) > 1,
    count: p.count,
  }));

  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="antialiased">
        <AppShell meetings={treeMeetings} projects={treeProjects}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
