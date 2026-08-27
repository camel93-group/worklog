export interface ChatMessage {
  time: string;
  speaker: string;
  text: string;
  isBot: boolean;
}

const LINE_RE = /^\[(.+?)\]\s*([^:]+?):\s*(.*)$/;

/**
 * "[13시 36분 21초] 황이성: 텍스트" 형식의 트랜스크립트를 채팅 메시지 목록으로 파싱.
 * 형식이 전혀 맞지 않으면 null (호출부에서 <pre> 폴백).
 */
export function parseTranscript(text: string): ChatMessage[] | null {
  const messages: ChatMessage[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(LINE_RE);
    if (m) {
      const speaker = m[2].trim();
      messages.push({ time: m[1], speaker, text: m[3], isBot: speaker === '회의록봇' });
    } else if (line.trim() && messages.length > 0) {
      messages[messages.length - 1].text += `\n${line}`;
    }
  }
  return messages.length > 0 ? messages : null;
}

/**
 * 발화 시각("13시 36분 21초")과 녹음 시작 시각(ISO)의 차이 → 오디오 내 오프셋(초).
 * 클릭한 발화의 0.5초 전부터 재생되도록 살짝 앞당긴다.
 */
export function seekOffsetSec(msgTime: string, startedAtIso: string): number | null {
  const m = msgTime.match(/(\d+)시\s*(\d+)분\s*(\d+)초/);
  if (!m) return null;
  const msgSec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);

  const startParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(startedAtIso));
  const [h, min, s] = startParts.split(':').map(Number);

  let offset = msgSec - (h * 3600 + min * 60 + s);
  if (offset < -43_200) offset += 86_400; // 자정 넘김 보정
  if (offset < 0) return null;
  return Math.max(0, offset - 0.5);
}
