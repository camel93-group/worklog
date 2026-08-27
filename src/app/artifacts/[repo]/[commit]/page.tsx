import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadGraph, getProjectMeta } from '@/lib/gitgraph';
import { getArtifact, listSessions } from '@/lib/artifacts';
import CommitExplorer from '@/components/artifacts/CommitExplorer';
import SessionTimeline from '@/components/artifacts/SessionTimeline';
import ProjectDeleteButton from '@/components/artifacts/ProjectDeleteButton';

export const dynamic = 'force-dynamic';

/** git remote 주소 → 브라우저로 열 수 있는 웹 URL (변환 불가 시 null) */
function remoteWebUrl(remote: string): string | null {
  const ssh = remote.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+?)(?:\.git)?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  if (/^https?:\/\//.test(remote)) return remote.replace(/\.git$/, '');
  return null;
}

export default async function CommitPage({
  params,
  searchParams,
}: {
  params: Promise<{ repo: string; commit: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { repo, commit } = await params;
  const { tab } = await searchParams;
  const nodes = await loadGraph(repo);
  if (nodes.length === 0) notFound();
  const meta = await getProjectMeta(repo);
  const remoteUrl = meta?.remote ? remoteWebUrl(meta.remote) : null;

  const selected = nodes.find((n) => n.hash === commit || n.shortHash === commit) ?? nodes[0];
  const history = tab === 'history';

  return (
    <div>
      <Link href="/artifacts" className="text-[12.5px] text-faint hover:text-dim transition-colors">
        ← 프로젝트 목록으로
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mono-label">DEPTH 02 · PROJECT</div>
          <h1 className="text-[24px] font-semibold mt-0.5 font-mono">
            {meta?.repo ?? repo}
            <span className="ml-2 text-[12px] text-faint font-normal">{repo.slice(0, 12)}</span>
          </h1>
          <p className="mt-1 font-mono text-[11px] text-faint">
            {meta?.remote ? (
              remoteUrl ? (
                <>
                  REMOTE{' '}
                  <a
                    href={remoteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-dim transition-colors"
                  >
                    {meta.remote}
                  </a>{' '}
                  ↗
                </>
              ) : (
                `REMOTE ${meta.remote}`
              )
            ) : (
              'REMOTE 미등록 — 저장소에서 git remote add origin <url> 후 커밋하면 자동 등록'
            )}
          </p>
        </div>
        <div className="pt-1 shrink-0">
          <ProjectDeleteButton repo={repo} />
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-[13px] bg-surface-1 border border-line p-[5px] gap-1">
        <Link
          href={`/artifacts/${repo}/${selected.hash}`}
          className={`flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-[12.5px] transition-colors ${
            !history ? 'bg-surface-2 font-semibold border border-amber/32 text-ink' : 'text-dim hover:text-ink border border-transparent'
          }`}
        >
          <span className="font-mono text-[10px] text-faint">01</span>
          Git 그래프
        </Link>
        <Link
          href={`/artifacts/${repo}/${selected.hash}?tab=history`}
          className={`flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-[12.5px] transition-colors ${
            history ? 'bg-surface-2 font-semibold border border-amber/32 text-ink' : 'text-dim hover:text-ink border border-transparent'
          }`}
        >
          <span className="font-mono text-[10px] text-faint">02</span>
          대화 이력
        </Link>
      </div>

      {history ? (
        <SessionTimeline
          repo={repo}
          sessions={await listSessions(repo)}
          commits={nodes.map((n) => ({
            hash: n.hash,
            shortHash: n.shortHash,
            subject: n.subject,
            date: n.date,
          }))}
        />
      ) : (
        <CommitExplorer
          repo={repo}
          nodes={nodes}
          initialHash={selected.hash}
          initialRecord={await getArtifact(repo, selected.hash).catch(() => null)}
        />
      )}
    </div>
  );
}
