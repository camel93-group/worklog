// 클라이언트에서도 쓰는 스킬 타입·헬퍼 (서버 전용 모듈을 끌고 오지 않도록 분리)

/** 구버전 레코드는 문자열, 신버전은 정의 원문 포함 객체 */
export type SkillUse = string | { name: string; content?: string | null };

export function skillName(skill: SkillUse): string {
  return typeof skill === 'string' ? skill : skill.name;
}

export function skillContent(skill: SkillUse): string | null {
  return typeof skill === 'string' ? null : (skill.content ?? null);
}
