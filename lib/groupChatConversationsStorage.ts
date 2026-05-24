import AsyncStorage from "@react-native-async-storage/async-storage";

export const GROUP_CHAT_CONVERSATIONS_KEY = "groupChatConversations";

export type StoredGroupChatConversation = {
  eventId: string;
  eventTitle: string;
  sportEmoji: string;
  organizer?: string;
  lastMessage: string;
  lastMessageTime: number;
};

export async function loadGroupChatConversations(): Promise<
  StoredGroupChatConversation[]
> {
  try {
    const raw = await AsyncStorage.getItem(GROUP_CHAT_CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredGroupChatConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function upsertGroupChatConversation(
  convo: StoredGroupChatConversation
): Promise<void> {
  try {
    const list = await loadGroupChatConversations();
    const idx = list.findIndex((c) => c.eventId === convo.eventId);
    const next: StoredGroupChatConversation = {
      ...convo,
      eventId: String(convo.eventId),
    };
    if (idx === -1) {
      list.unshift(next);
    } else {
      list.splice(idx, 1);
      list.unshift(next);
    }
    await AsyncStorage.setItem(
      GROUP_CHAT_CONVERSATIONS_KEY,
      JSON.stringify(list)
    );
  } catch {
    // ignore persistence errors
  }
}
