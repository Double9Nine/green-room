export type MatchSport = {
  id: string;
  name: string;
  emoji: string;
  skillLevels: number;
};

export const MATCH_SPORTS: MatchSport[] = [
  { id: "tennis", name: "Tennis", emoji: "🎾", skillLevels: 8 },
  { id: "basketball", name: "Basketball", emoji: "🏀", skillLevels: 5 },
  { id: "soccer", name: "Soccer", emoji: "⚽", skillLevels: 5 },
  { id: "badminton", name: "Badminton", emoji: "🏸", skillLevels: 4 },
  { id: "table_tennis", name: "Table Tennis", emoji: "🏓", skillLevels: 4 },
  { id: "volleyball", name: "Volleyball", emoji: "🏐", skillLevels: 5 },
  { id: "squash", name: "Squash", emoji: "🎯", skillLevels: 4 },
  { id: "golf", name: "Golf", emoji: "⛳", skillLevels: 5 },
];

export function getMatchSport(id: string): MatchSport | undefined {
  return MATCH_SPORTS.find((s) => s.id === id);
}
