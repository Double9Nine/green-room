export const SKILL_LEVELS: Record<string, string[]> = {
  tennis: [
    "1.5 - New Player",
    "2.0 - Beginner",
    "2.5 - Beginner+",
    "3.0 - Intermediate",
    "3.5 - Intermediate+",
    "4.0 - Advanced",
    "4.5 - Advanced+",
    "5.0 - Expert",
  ],
  basketball: ["Beginner", "Recreational", "Intermediate", "Advanced", "Semi-Pro"],
  soccer: ["Beginner", "Recreational", "Intermediate", "Advanced", "Semi-Pro"],
  volleyball: ["Beginner", "Recreational", "Intermediate", "Advanced", "Semi-Pro"],
  badminton: ["Beginner", "Intermediate", "Advanced", "Expert"],
  table_tennis: ["Beginner", "Intermediate", "Advanced", "Expert"],
  squash: ["Beginner", "Intermediate", "Advanced", "Expert"],
  golf: [
    "Beginner (30+ Handicap)",
    "High Handicap (20-30)",
    "Mid Handicap (10-20)",
    "Low Handicap (0-10)",
    "Scratch / Pro",
  ],
};

export const PROFILE_SPORTS = [
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "soccer", label: "Soccer", emoji: "⚽" },
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "table_tennis", label: "Table Tennis", emoji: "🏓" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "squash", label: "Squash", emoji: "🎯" },
  { id: "golf", label: "Golf", emoji: "⛳" },
] as const;

export const AVAILABILITY_DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
export const AVAILABILITY_TIMES = ["Mor", "Aft", "Eve"] as const;
