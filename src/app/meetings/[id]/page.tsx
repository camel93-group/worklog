import { notFound } from 'next/navigation';
import { getMeeting, listMeetingFiles } from '@/lib/store';
import MeetingView from '@/components/meeting/MeetingView';

export const dynamic = 'force-dynamic';

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  return <MeetingView initial={meeting} files={await listMeetingFiles(id)} />;
}
