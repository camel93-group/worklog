import { notFound, redirect } from 'next/navigation';
import { loadGraph } from '@/lib/gitgraph';

export const dynamic = 'force-dynamic';

export default async function RepoPage({ params }: { params: Promise<{ repo: string }> }) {
  const { repo } = await params;
  const nodes = await loadGraph(repo);
  if (nodes.length === 0) notFound();
  redirect(`/artifacts/${repo}/${nodes[0].hash}`);
}
