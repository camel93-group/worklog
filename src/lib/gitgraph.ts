import { db } from './db';
import { listArtifacts, type ArtifactSummary } from './artifacts';

export interface GraphRefs {
  head: boolean;
  branches: string[];
  tags: string[];
}

export interface GraphNode {
  hash: string;
  shortHash: string;
  parents: string[];
  author: string;
  date: string;
  subject: string;
  refs: GraphRefs;
  lane: number;
  mergeFrom?: number;
  /** ailog 커밋 레코드 요약 (없으면 '기록 없음' 커밋) */
  record?: Pick<
    ArtifactSummary,
    'agent' | 'model' | 'effort' | 'usage' | 'stats' | 'transcriptCount' | 'human' | 'skills' | 'subagentCount'
  >;
}

export function parseRefsRaw(raw: string): GraphRefs {
  const refs: GraphRefs = { head: false, branches: [], tags: [] };
  for (const part of (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (part.startsWith('tag: ')) refs.tags.push(part.slice(5));
    else if (part.startsWith('HEAD -> ')) {
      refs.head = true;
      refs.branches.push(part.slice(8));
    } else if (part === 'HEAD') refs.head = true;
    else refs.branches.push(part);
  }
  return refs;
}

/** 부모 해시 기반 레인 배정 (최신순 목록) — 머지 커밋은 mergeFrom 레인으로 커브 연결 */
function assignLanes(nodes: GraphNode[]) {
  const laneExpect: (string | null)[] = [];
  const alloc = (hash: string | null) => {
    const idx = laneExpect.indexOf(null);
    if (idx >= 0) {
      laneExpect[idx] = hash;
      return idx;
    }
    laneExpect.push(hash);
    return laneExpect.length - 1;
  };

  for (const node of nodes) {
    let lane = laneExpect.findIndex((h) => h === node.hash);
    if (lane === -1) lane = alloc(node.hash);
    // 같은 커밋을 기다리던 다른 레인(분기점)은 닫는다
    for (let l = 0; l < laneExpect.length; l++) {
      if (l !== lane && laneExpect[l] === node.hash) laneExpect[l] = null;
    }
    node.lane = lane;
    laneExpect[lane] = node.parents[0] ?? null;

    for (const parent of node.parents.slice(1)) {
      let mergeLane = laneExpect.findIndex((h) => h === parent);
      if (mergeLane === -1) mergeLane = alloc(parent);
      node.mergeFrom = mergeLane; // 시각화는 첫 병합 부모만
    }
  }
}

interface GraphFile {
  repo: string;
  projectId?: string;
  remote?: string | null;
  order: string[];
  commits: Record<
    string,
    { parents: string[]; author: string; date: string; subject: string; refsRaw: string }
  >;
  syncedAt?: string;
  syncedBy?: string;
}

export async function loadGraphFile(projectId: string): Promise<GraphFile | null> {
  if (!/^[A-Za-z0-9_.-]+$/.test(projectId)) return null;
  const client = await db();
  const { rows } = await client.query('SELECT graph FROM graphs WHERE project_id = $1', [projectId]);
  return rows[0]?.graph ?? null;
}

/** 프로젝트 표시 이름·remote — 그래프 테이블 우선, 없으면 최근 레코드 */
export async function getProjectMeta(
  projectId: string,
): Promise<{ repo: string; remote: string | null } | null> {
  if (!/^[A-Za-z0-9_.-]+$/.test(projectId)) return null;
  const client = await db();
  const g = await client.query('SELECT repo, remote FROM graphs WHERE project_id = $1', [projectId]);
  if (g.rows[0]) return { repo: g.rows[0].repo ?? projectId, remote: g.rows[0].remote ?? null };
  const a = await client.query(
    'SELECT repo FROM artifacts WHERE project_id = $1 ORDER BY committed_at DESC NULLS LAST LIMIT 1',
    [projectId],
  );
  if (a.rows[0]) return { repo: a.rows[0].repo ?? projectId, remote: null };
  return null;
}

/**
 * 프로젝트의 그래프 노드 목록(레인 계산 + ailog 레코드 오버레이).
 * graph.json이 없으면(구버전 수집분) 레코드만으로 단일 레인 폴백.
 */
export async function loadGraph(projectId: string): Promise<GraphNode[]> {
  const records = (await listArtifacts()).filter((a) => a.projectId === projectId);
  const byHash = new Map(records.map((r) => [r.commit, r]));

  const file = await loadGraphFile(projectId);
  let nodes: GraphNode[];

  if (file) {
    nodes = file.order
      .filter((h) => file.commits[h])
      .map((h) => {
        const c = file.commits[h];
        return {
          hash: h,
          shortHash: h.slice(0, 7),
          parents: c.parents,
          author: c.author,
          date: c.date,
          subject: c.subject,
          refs: parseRefsRaw(c.refsRaw),
          lane: 0,
        };
      });
  } else {
    // 폴백: 레코드만으로 선형 그래프
    nodes = records
      .sort((a, b) => (b.committedAt ?? '').localeCompare(a.committedAt ?? ''))
      .map((r) => ({
        hash: r.commit,
        shortHash: r.shortCommit,
        parents: [],
        author: r.author,
        date: r.committedAt,
        subject: r.message,
        refs: { head: false, branches: [], tags: [] },
        lane: 0,
      }));
  }

  assignLanes(nodes);

  for (const node of nodes) {
    const r = byHash.get(node.hash);
    if (r) {
      node.record = {
        agent: r.agent,
        model: r.model,
        effort: r.effort,
        usage: r.usage,
        stats: r.stats,
        transcriptCount: r.transcriptCount,
        human: r.human,
        skills: r.skills,
        subagentCount: r.subagentCount,
      };
    }
  }
  return nodes;
}

/** 그래프 스냅샷 병합 저장 — 커밋은 union, order/refs는 최신 스냅샷 기준 */
export async function mergeGraphSnapshot(snapshot: {
  repo: string;
  projectId?: string;
  remote?: string | null;
  syncedBy?: string;
  commits: { hash: string; parents: string[]; author: string; date: string; subject: string; refsRaw: string }[];
}): Promise<void> {
  const projectId = snapshot.projectId ?? snapshot.repo;
  if (!/^[A-Za-z0-9_.-]+$/.test(projectId)) throw new Error('잘못된 프로젝트 ID');
  const existing = await loadGraphFile(projectId);
  const commits: GraphFile['commits'] = { ...(existing?.commits ?? {}) };
  const order: string[] = [];
  for (const c of snapshot.commits) {
    if (!/^[a-f0-9]{7,40}$/.test(c.hash)) continue;
    commits[c.hash] = {
      parents: c.parents ?? [],
      author: c.author ?? '',
      date: c.date ?? '',
      subject: c.subject ?? '',
      refsRaw: c.refsRaw ?? '',
    };
    order.push(c.hash);
  }
  // 최신 스냅샷에 없는 기존 커밋(다른 클론에만 있던 것)은 뒤에 날짜순으로 보존
  const known = new Set(order);
  const extras = Object.keys(commits)
    .filter((h) => !known.has(h))
    .sort((a, b) => (commits[b].date ?? '').localeCompare(commits[a].date ?? ''));

  const merged: GraphFile = {
    repo: snapshot.repo,
    projectId,
    remote: snapshot.remote ?? existing?.remote ?? null,
    order: [...order, ...extras],
    commits,
    syncedAt: new Date().toISOString(),
    syncedBy: snapshot.syncedBy,
  };
  const client = await db();
  await client.query(
    `INSERT INTO graphs (project_id, repo, remote, graph, synced_at) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (project_id) DO UPDATE SET repo = $2, remote = $3, graph = $4, synced_at = now()`,
    [projectId, snapshot.repo, merged.remote, merged],
  );
}
