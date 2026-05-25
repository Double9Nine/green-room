import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  pendingRequests: "notif_pending_requests",
  joinedStatusChanges: "notif_joined_status_changes",
  unreadMessages: "notif_unread_messages",
  unreadPrivate: "notif_unread_private",
  unreadGroup: "notif_unread_group",
  seenRequests: "notif_seen_requests",
  seenStatusChanges: "notif_seen_status_changes",
};

export async function getPendingRequestsCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.pendingRequests);
  return raw ? JSON.parse(raw) : 0;
}

export async function getJoinedStatusChangesCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.joinedStatusChanges);
  return raw ? JSON.parse(raw) : 0;
}

export async function getUnreadPrivateCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.unreadPrivate);
  return raw ? JSON.parse(raw) : 0;
}

export async function getUnreadGroupCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.unreadGroup);
  return raw ? JSON.parse(raw) : 0;
}

export async function getUnreadMessagesCount(): Promise<number> {
  const [priv, group] = await Promise.all([
    getUnreadPrivateCount(),
    getUnreadGroupCount(),
  ]);
  return priv + group;
}

export async function incrementPendingRequests(): Promise<void> {
  const current = await getPendingRequestsCount();
  await AsyncStorage.setItem(
    KEYS.pendingRequests,
    JSON.stringify(current + 1)
  );
}

export async function incrementJoinedStatusChanges(): Promise<void> {
  const current = await getJoinedStatusChangesCount();
  await AsyncStorage.setItem(
    KEYS.joinedStatusChanges,
    JSON.stringify(current + 1)
  );
}

export async function incrementUnreadPrivate(count = 1): Promise<void> {
  const current = await getUnreadPrivateCount();
  await AsyncStorage.setItem(
    KEYS.unreadPrivate,
    JSON.stringify(current + count)
  );
}

export async function incrementUnreadGroup(count = 1): Promise<void> {
  const current = await getUnreadGroupCount();
  await AsyncStorage.setItem(
    KEYS.unreadGroup,
    JSON.stringify(current + count)
  );
}

/** @deprecated Use incrementUnreadPrivate or incrementUnreadGroup */
export async function incrementUnreadMessages(count = 1): Promise<void> {
  await incrementUnreadPrivate(count);
}

export async function clearUnreadPrivate(): Promise<void> {
  await AsyncStorage.setItem(KEYS.unreadPrivate, "0");
}

export async function clearUnreadGroup(): Promise<void> {
  await AsyncStorage.setItem(KEYS.unreadGroup, "0");
}

export async function clearPendingRequests(): Promise<void> {
  await AsyncStorage.setItem(KEYS.pendingRequests, "0");
}

export async function clearJoinedStatusChanges(): Promise<void> {
  await AsyncStorage.setItem(KEYS.joinedStatusChanges, "0");
}

export async function clearUnreadMessages(): Promise<void> {
  await Promise.all([clearUnreadPrivate(), clearUnreadGroup()]);
  await AsyncStorage.setItem(KEYS.unreadMessages, "0");
}

export async function getExploreBadgeCount(): Promise<number> {
  const pending = await getPendingRequestsCount();
  const status = await getJoinedStatusChangesCount();
  return pending + status;
}
