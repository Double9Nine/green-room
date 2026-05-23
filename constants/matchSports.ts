import { getSkillLevelCount, SPORTS } from "@/constants/skillLevels";

export type MatchSport = {
  id: string;
  name: string;
  emoji: string;
  skillLevels: number;
};

export const MATCH_SPORTS: MatchSport[] = SPORTS.map((s) => ({
  id: s.id,
  name: s.label,
  emoji: s.emoji,
  skillLevels: getSkillLevelCount(s.id),
}));

export function getMatchSport(id: string): MatchSport | undefined {
  return MATCH_SPORTS.find((s) => s.id === id);
}
