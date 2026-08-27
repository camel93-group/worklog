export function agentBadge(agent: string): { label: string; chip: string; color: string } {
  switch (agent) {
    case 'claude-code':
      return { label: 'Claude Code', chip: 'chip-amber', color: 'var(--color-amber)' };
    case 'codex':
      return { label: 'Codex', chip: 'chip-blue', color: 'var(--color-blue)' };
    case 'gemini':
      return { label: 'Gemini', chip: 'chip-violet', color: 'var(--color-violet)' };
    default:
      return { label: '휴먼', chip: 'chip-gray', color: 'var(--color-agentgray)' };
  }
}
