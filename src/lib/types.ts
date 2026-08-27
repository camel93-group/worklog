export interface SummaryVersion {
  version: number;
  text: string;
  createdAt: string;
  source: 'auto' | 'regenerated' | string;
}

export interface Revised {
  text: string;
  manuallyEdited: boolean;
  updatedAt: string;
}

export interface MeetingFile {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  channelName: string;
  startedAt: string;
  endedAt: string;
  participants: string[];
  audio?: { file: string } | null;
  reviewed?: { at: string } | null;
  original: string;
  revised: Revised | null;
  summaries: SummaryVersion[];
}
