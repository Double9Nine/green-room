import AsyncStorage from "@react-native-async-storage/async-storage";

import { isCurrentUser } from "./getCurrentUser";

export type GroupChatMessageType =
  | "text"
  | "photo"
  | "image"
  | "location"
  | "voice"
  | "venue";

export type GroupChatMessage = {
  id: string;
  sender: string;
  initial: string;
  sent: boolean;
  time: string;
  createdAt: number;
  type: GroupChatMessageType;
  text?: string;
  recalled?: boolean;
  imageUri?: string;
  locationLabel?: string;
  voiceUri?: string;
  voiceDurationSec?: number;
  isConvertedTranscript?: boolean;
  convertedFromMessageId?: string;
  venueName?: string;
  venueArea?: string;
  venueCourts?: number;
  venuePrice?: string;
  venueRating?: string;
  venueAvailable?: string;
  venueUrl?: string;
};

export function groupChatStorageKey(eventId: number | string): string {
  return `groupChatMessages_${eventId}`;
}

export function normalizeGroupChatMessage(
  raw: Partial<GroupChatMessage> & {
    id: string | number;
    sender: string;
  }
): GroupChatMessage {
  const type =
    raw.type ??
    (raw.imageUri
      ? "photo"
      : raw.voiceUri
        ? "voice"
        : raw.venueName
          ? "venue"
          : raw.locationLabel
            ? "location"
            : "text");

  return {
    id: String(raw.id),
    sender: raw.sender,
    initial: raw.initial ?? raw.sender[0]?.toUpperCase() ?? "?",
    sent: raw.sent === true,
    time: raw.time ?? "",
    createdAt: raw.createdAt ?? Date.now(),
    type,
    text: raw.text,
    recalled: raw.recalled,
    imageUri: raw.imageUri,
    locationLabel: raw.locationLabel,
    voiceUri: raw.voiceUri,
    voiceDurationSec: raw.voiceDurationSec,
    isConvertedTranscript: raw.isConvertedTranscript,
    convertedFromMessageId: raw.convertedFromMessageId,
    venueName: raw.venueName,
    venueArea: raw.venueArea,
    venueCourts: raw.venueCourts,
    venuePrice: raw.venuePrice,
    venueRating: raw.venueRating,
    venueAvailable: raw.venueAvailable,
    venueUrl: raw.venueUrl,
  };
}

export async function loadGroupChatMessages(
  eventId: number | string
): Promise<GroupChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(groupChatStorageKey(eventId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) =>
      normalizeGroupChatMessage(item as GroupChatMessage)
    );
  } catch {
    return [];
  }
}

export async function saveGroupChatMessages(
  eventId: number | string,
  messages: GroupChatMessage[]
): Promise<void> {
  await AsyncStorage.setItem(
    groupChatStorageKey(eventId),
    JSON.stringify(messages)
  );
}

/** Align bubbles for the viewer; only real messages from storage (no auto-seed). */
export function applyMessagesForViewer(
  messages: GroupChatMessage[],
  currentUserName: string
): GroupChatMessage[] {
  return messages.map((msg) => {
    const legacyYou = msg.sender.trim().toLowerCase() === "you";
    const sender = legacyYou ? currentUserName : msg.sender;
    const isMine =
      msg.sent === true ||
      legacyYou ||
      isCurrentUser(sender, currentUserName);
    return {
      ...msg,
      sender,
      sent: isMine,
    };
  });
}

export function getGroupChatPreviewText(
  messages: GroupChatMessage[]
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.recalled) continue;
    if (m.isConvertedTranscript) continue;
    if (m.type === "text" && m.text) return m.text;
    if (m.type === "photo" || m.type === "image") return "Photo";
    if (m.type === "voice") return "Voice message";
    if (m.type === "venue") return `📍 ${m.venueName ?? "Venue"}`;
    if (m.type === "location") return m.locationLabel ?? "Location";
  }
  return "No messages yet";
}
