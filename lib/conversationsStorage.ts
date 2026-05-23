import AsyncStorage from "@react-native-async-storage/async-storage";

export const CONVERSATIONS_STORAGE_KEY = "conversations";

export type StoredConversation = {
  id: string;
  playerName: string;
  playerLocation: string;
  playerSkill: string;
  playerPurpose?: string;
  playerAge?: string;
  sportEmoji: string;
  lastMessage: string;
  lastMessageTime: number;
  unread: boolean;
  muted?: boolean;
};

export async function loadStoredConversations(): Promise<StoredConversation[]> {
  try {
    const existing = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!existing) return [];
    const parsed = JSON.parse(existing) as StoredConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveConversations(convos: StoredConversation[]) {
  await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(convos));
}

export async function upsertConversation(
  convo: StoredConversation
): Promise<void> {
  try {
    const convos = await loadStoredConversations();
    const exists = convos.find((c) => c.id === convo.id);
    if (!exists) {
      convos.unshift(convo);
      await saveConversations(convos);
    }
  } catch {
    // ignore persistence errors
  }
}

export async function updateConversationPreview(
  id: string,
  lastMessage: string,
  options?: { unread?: boolean }
): Promise<void> {
  try {
    const convos = await loadStoredConversations();
    const idx = convos.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const updated: StoredConversation = {
      ...convos[idx],
      lastMessage,
      lastMessageTime: Date.now(),
      unread: convos[idx].muted
        ? false
        : (options?.unread ?? convos[idx].unread),
    };
    convos.splice(idx, 1);
    convos.unshift(updated);
    await saveConversations(convos);
  } catch {
    // ignore persistence errors
  }
}

export async function markConversationRead(id: string): Promise<void> {
  try {
    const convos = await loadStoredConversations();
    const idx = convos.findIndex((c) => c.id === id);
    if (idx === -1) return;
    convos[idx] = { ...convos[idx], unread: false };
    await saveConversations(convos);
  } catch {
    // ignore persistence errors
  }
}

export async function setConversationMuted(
  id: string,
  muted: boolean
): Promise<void> {
  try {
    const convos = await loadStoredConversations();
    const idx = convos.findIndex((c) => c.id === id);
    if (idx === -1) return;
    convos[idx] = {
      ...convos[idx],
      muted,
      unread: muted ? false : convos[idx].unread,
    };
    await saveConversations(convos);
  } catch {
    // ignore persistence errors
  }
}

export async function removeConversation(id: string): Promise<void> {
  try {
    const convos = await loadStoredConversations();
    await saveConversations(convos.filter((c) => c.id !== id));
  } catch {
    // ignore persistence errors
  }
}
