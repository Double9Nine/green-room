export const SPORTS = [
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "pickleball", label: "Pickleball", emoji: "🏓" },
  { id: "bouldering", label: "Bouldering", emoji: "🧗" },
  { id: "golf", label: "Golf", emoji: "⛳" },
  { id: "running", label: "Running", emoji: "🏃" },
] as const;

/** @deprecated Use SPORTS — kept for existing imports */
export const PROFILE_SPORTS = SPORTS;

export const SKILL_LEVELS: Record<string, string[]> = {
  tennis: [
    "1.0–1.5 (New to Tennis)",
    "2.0 (Beginner)",
    "2.5 (Beginner+)",
    "3.0 (Advanced Beginner)",
    "3.5 (Intermediate)",
    "4.0 (Intermediate+)",
    "4.5 (Advanced)",
    "5.0 (Advanced+)",
    "5.5 (Tournament)",
    "6.0–7.0 (Pro)",
  ],
  badminton: [
    "H–I (Beginner)",
    "G (Beginner+)",
    "F (Intermediate)",
    "E (Intermediate+)",
    "C–D (Advanced)",
    "A–B (Tournament)",
  ],
  pickleball: [
    "2.0 (New to Pickleball)",
    "2.5 (Beginner)",
    "3.0 (Advanced Beginner)",
    "3.5 (Intermediate)",
    "4.0 (Advanced Intermediate)",
    "4.5 (Advanced)",
    "5.0+ (Tournament / Expert)",
  ],
  bouldering: [
    "VB–V0 (Beginner)",
    "V1–V2 (Beginner+)",
    "V3–V4 (Intermediate)",
    "V5–V6 (Intermediate+)",
    "V7–V8 (Advanced)",
    "V9+ (Expert)",
  ],
  golf: [
    "New to Golf",
    "High Handicap (30.1+)",
    "Beginner+ (25.1–30.0)",
    "Beginner (20.1–25.0)",
    "Intermediate (15.1–20.0)",
    "Upper Intermediate (10.1–15.0)",
    "Advanced (5.1–10.0)",
    "Elite / Low Handicap (+ to 5.0)",
  ],
  running: [
    "12:00+/mi - Just getting started",
    "10:30–11:59/mi - Easygoing",
    "9:00–10:29/mi - Steady",
    "7:45–8:59/mi - Strong",
    "6:30–7:44/mi - Advanced",
    "Under 6:30/mi - Competitive",
  ],
};

export const RUNNING_SKILL_LEVELS_MI = SKILL_LEVELS.running;

export const RUNNING_SKILL_LEVELS_KM = [
  "7:27+/km - Just getting started",
  "6:31–7:26/km - Easygoing",
  "5:36–6:30/km - Steady",
  "4:49–5:35/km - Strong",
  "4:02–4:48/km - Advanced",
  "Under 4:02/km - Competitive",
] as const;

export const GOLF_SCENES = [
  "Driving range only",
  "9-hole round",
  "18-hole round",
  "Either",
] as const;

export const RUNNING_SCENES = [
  "Easy Runs",
  "5K / 10K",
  "Half Marathon / Marathon",
] as const;

export const SKILL_LEVEL_REFERENCE_URLS: Record<string, string | null> = {
  tennis:
    "https://www.usta.com/en/home/play/adult-tennis/programs/national/usta-ntrp-ratings-faqs.html",
  badminton:
    "https://www.badmintonengland.co.uk/competition/rankings-and-gradings/gradings",
  pickleball: "https://usapickleball.org/skill-level/",
  bouldering: "https://ircra.rocks/reporting-grades-in-climbing-research/",
  golf: "https://www.usga.org/content/usga/home-page/handicapping/world-handicap-system/world-handicap-system-usga-golf-faqs.html",
  running: null,
};

export function getSkillLevelCount(sportId: string): number {
  if (sportId === "running") {
    return RUNNING_SKILL_LEVELS_MI.length;
  }
  return SKILL_LEVELS[sportId]?.length ?? SKILL_LEVELS.tennis.length;
}

export const AVAILABILITY_DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
export const AVAILABILITY_TIMES = ["Mor", "Aft", "Eve"] as const;
