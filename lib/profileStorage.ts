import AsyncStorage from "@react-native-async-storage/async-storage";

export const USER_PROFILE_KEY = "userProfile";

export type ProfileNotifications = {
  newMatches: boolean;
  newMessages: boolean;
  gameReminders: boolean;
};

export type UserProfile = {
  name: string;
  photo: string | null;
  sport: string;
  skillLevel: string;
  availability: string[];
  location: string;
  work: string;
  university: string;
  purpose: string;
  tags: string[];
  notifications: ProfileNotifications;
  gamesPlayed?: number;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  photo: null,
  sport: "tennis",
  skillLevel: "3.0 - Intermediate",
  availability: [],
  location: "",
  work: "",
  university: "",
  purpose: "",
  tags: [],
  notifications: {
    newMatches: true,
    newMessages: true,
    gameReminders: true,
  },
  gamesPlayed: 0,
};

function migrateLegacy(raw: Record<string, unknown>): Partial<UserProfile> {
  const legacyNotifications = raw.notifications as
    | Partial<ProfileNotifications>
    | undefined;

  return {
    name:
      (typeof raw.name === "string" && raw.name) ||
      (typeof raw.fullName === "string" && raw.fullName) ||
      "",
    photo:
      raw.photo === null || raw.photoUri === null
        ? null
        : typeof raw.photo === "string"
          ? raw.photo
          : typeof raw.photoUri === "string"
            ? raw.photoUri
            : undefined,
    sport:
      (typeof raw.sport === "string" && raw.sport) ||
      (typeof raw.sportId === "string" && raw.sportId) ||
      "tennis",
    skillLevel:
      typeof raw.skillLevel === "string" ? raw.skillLevel : undefined,
    availability: Array.isArray(raw.availability)
      ? (raw.availability as string[])
      : undefined,
    location:
      (typeof raw.location === "string" && raw.location) ||
      (typeof raw.locationLabel === "string" && raw.locationLabel) ||
      "",
    work:
      (typeof raw.work === "string" && raw.work) ||
      (typeof raw.occupation === "string" && raw.occupation) ||
      "",
    university:
      typeof raw.university === "string" ? raw.university : undefined,
    purpose: typeof raw.purpose === "string" ? raw.purpose : undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
    notifications: legacyNotifications
      ? {
          newMatches: legacyNotifications.newMatches ?? true,
          newMessages: legacyNotifications.newMessages ?? true,
          gameReminders: legacyNotifications.gameReminders ?? true,
        }
      : undefined,
    gamesPlayed:
      typeof raw.gamesPlayed === "number" ? raw.gamesPlayed : undefined,
  };
}

function mergeWithDefaults(parsed: Partial<UserProfile>): UserProfile {
  return {
    ...DEFAULT_USER_PROFILE,
    ...parsed,
    availability: Array.isArray(parsed.availability)
      ? parsed.availability
      : DEFAULT_USER_PROFILE.availability,
    tags: Array.isArray(parsed.tags) ? parsed.tags : DEFAULT_USER_PROFILE.tags,
    notifications: {
      ...DEFAULT_USER_PROFILE.notifications,
      ...(parsed.notifications ?? {}),
    },
    gamesPlayed:
      typeof parsed.gamesPlayed === "number"
        ? parsed.gamesPlayed
        : DEFAULT_USER_PROFILE.gamesPlayed,
  };
}

export async function loadUserProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return { ...DEFAULT_USER_PROFILE };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return mergeWithDefaults(migrateLegacy(parsed));
  } catch {
    return { ...DEFAULT_USER_PROFILE };
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export async function mergeUserProfile(
  patch: Partial<UserProfile>
): Promise<UserProfile> {
  const current = await loadUserProfile();
  const next = mergeWithDefaults({
    ...current,
    ...patch,
    availability: patch.availability ?? current.availability,
    tags: patch.tags ?? current.tags,
    notifications: patch.notifications
      ? { ...current.notifications, ...patch.notifications }
      : current.notifications,
  });
  await saveUserProfile(next);
  return next;
}
