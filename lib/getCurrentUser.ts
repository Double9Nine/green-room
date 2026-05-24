import AsyncStorage from "@react-native-async-storage/async-storage";

import { USER_PROFILE_KEY } from "./profileStorage";

export type CurrentUser = {
  name: string;
  initial: string;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  try {
    const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      const profile = JSON.parse(raw) as { name?: string };
      const name = profile.name?.trim() || "You";
      return { name, initial: name[0]?.toUpperCase() || "Y" };
    }
  } catch {
    // fall through
  }
  return { name: "You", initial: "Y" };
}

export function isCurrentUser(
  senderName: string,
  currentUserName: string
): boolean {
  if (!senderName || !currentUserName) return false;
  return (
    senderName.trim().toLowerCase() === currentUserName.trim().toLowerCase()
  );
}

/** UI label for the logged-in member (display only). */
export function displayUserLabel(
  name: string,
  currentUserName: string
): string {
  return isCurrentUser(name, currentUserName) ? "You" : name;
}
