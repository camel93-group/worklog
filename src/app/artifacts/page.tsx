import Link from 'next/link';
import { listArtifacts } from '@/lib/artifacts';
import { agentBadge } from '@/lib/agents';

export const dynamic = 'force-dynamic';

const fmtShort = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 border border-line px-4 py-3">
      <div className="font-mono text-[17px] leading-tight">{value}</div>
      <div className="text-[11px] text-faint">
        {label}
        {sub && <span className="ml-1.5 text-dim">{sub}</span>}
      </div>
    </div>
  );
}

export default async function ArtifactsPage() {
  const artifacts = await listArtifacts();

  const aiCount = artifacts.filter((a) => a.agent !== 'human').length;
  const totalOut = artifacts.reduce((s, a) => s + (a.usage?.outputTokens ?? 0), 0);
  const totalIns = artifacts.reduce((s, a) => s + (a.stats?.insertions ?? 0), 0);
  const totalDel = artifacts.reduce((s, a) => s + (a.stats?.deletions ?? 0), 0);

  // projectId(root 커밋 해시) 기준 그룹 — 이름이 같아도 다른 프로젝트면 분리된다
  const repos = new Map<string, typeof artifacts>();
  for (const a of artifacts) {
    if (!repos.has(a.projectId)) repos.set(a.projectId, []);
    repos.get(a.projectId)!.push(a);
  }
  const nameCounts = new Map<string, number>();
  for (const list of repos.values()) {
    const name = list[0].repo;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mono-label">DEPTH 01</div>
      <h1 className="text-[26px] font-semibold mt-1">산출물</h1>
      <p className="text-[12.5px] text-dim mt-0.5">
        프로젝트를 선택하면 Git 그래프와 커밋 기록이 열립니다.
      </p>

      <div className="mt-5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Stat value={String(artifacts.length)} label="커밋" sub={`AI ${aiCount} · 휴먼 ${artifacts.length - aiCount}`} />
        <Stat value={totalOut.toLocaleString()} label="누적 출력 토큰" />
        <Stat value={`+${totalIns.toLocaleString()} −${totalDel.toLocaleString()}`} label="변경 라인" />
      </div>

      {artifacts.length === 0 && (
        <div className="card mt-6 py-16 text-center">
          <p className="text-dim">아직 기록된 산출물이 없습니다.</p>
          <p className="text-[12px] text-faint mt-1">
            프로젝트 저장소에 <code className="font-mono">ailog install</code> 후 커밋하면 자동으로 기록됩니다.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
        {[...repos.entries()].map(([projectId, list]) => {
          const latest = list[0];
          const dup = (nameCounts.get(latest.repo) ?? 0) > 1;
          const agents = [...new Set(list.map((a) => a.agent))];
          const ai = list.filter((a) => a.agent !== 'human').length;
          return (
            <Link
              key={projectId}
              href={`/artifacts/${projectId}`}
              className="card p-4 transition-colors hover:border-amber/40 group"
            >
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber" />
                <span className="font-mono text-[14px] font-semibold">{latest.repo}</span>
                {dup && <span className="font-mono text-[10px] text-faint">{projectId.slice(0, 6)}</span>}
                {latest.remote && <span className="font-mono text-[10px] text-faint" title={latest.remote}>⇅</span>}
                <span className="ml-auto font-mono text-[10.5px] text-faint">{list.length} 커밋</span>
              </div>
              <div className="mt-2 text-[12.5px] text-dim truncate">{latest.message}</div>
              <div className="font-mono text-[10.5px] text-faint">최근 {fmtShort(latest.committedAt)}</div>
              <div className="mt-3 flex items-center gap-2">
                {agents.map((a) => (
                  <span key={a} className="size-2 rounded-full" style={{ background: agentBadge(a).color }} />
                ))}
                <span className="text-[11px] text-faint">
                  AI {ai} · 휴먼 {list.length - ai}
                </span>
                <span className="ml-auto text-[14px] text-faint group-hover:text-dim">›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
