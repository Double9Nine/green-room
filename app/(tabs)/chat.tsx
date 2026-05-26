import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  loadStoredConversations,
  removeConversation,
  type StoredConversation,
} from "@/lib/conversationsStorage";
import {
  GROUP_CHAT_CONVERSATIONS_KEY,
  loadGroupChatConversations,
  type StoredGroupChatConversation,
} from "@/lib/groupChatConversationsStorage";
import {
  clearUnreadGroup,
  clearUnreadPrivate,
  getUnreadGroupCount,
  getUnreadPrivateCount,
} from "@/lib/notificationStore";

type ChatSubTab = "private" | "group";

const MUTED_CONVERSATIONS_KEY = "mutedConversations";
const MUTED_GROUP_CHATS_KEY = "mutedGroupChats";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#22c55e";
const ACCENT_DARK = "#15803d";
const ACTION_WIDTH = 70;
const SWIPE_ACTIONS_WIDTH = ACTION_WIDTH * 2;

function formatConversationTime(timestamp: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();

  const nowDay = new Date(
    now.getFullYear(), now.getMonth(), now.getDate()
  ).getTime();
  const msgDay = new Date(
    date.getFullYear(), date.getMonth(), date.getDate()
  ).getTime();

  const diffDays = Math.round((nowDay - msgDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function GroupChatRow({
  convo,
  isMuted,
  onPress,
  swipeableRef,
  onSwipeableWillOpen,
  renderRightActions,
}: {
  convo: StoredGroupChatConversation;
  isMuted: boolean;
  onPress: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
  onSwipeableWillOpen: () => void;
  renderRightActions: () => ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.swipeRow}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableWillOpen={onSwipeableWillOpen}
      >
        <Animated.View style={[styles.convoCard, { transform: [{ scale }] }]}>
          <Pressable
            onPress={onPress}
            onPressIn={() => animateScale(0.97)}
            onPressOut={() => animateScale(1)}
            style={styles.cardPressable}
          >
            <View style={styles.groupChatAvatar}>
              <Text style={styles.groupChatAvatarEmoji}>{convo.sportEmoji}</Text>
            </View>
            <View style={styles.convoBody}>
              <View style={styles.convoTop}>
                <View style={styles.nameRow}>
                  <Text style={styles.convoName} numberOfLines={1}>
                    {convo.eventTitle}
                  </Text>
                  {isMuted ? (
                    <Ionicons
                      name="notifications-off-outline"
                      size={16}
                      color={MUTED}
                    />
                  ) : null}
                </View>
                <Text style={styles.convoTime}>
                  {formatConversationTime(convo.lastMessageTime)}
                </Text>
              </View>
              <Text style={styles.convoPreview} numberOfLines={1}>
                {convo.lastMessage}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </Swipeable>
    </View>
  );
}

function ConversationRow({
  convo,
  isMuted,
  onPress,
  swipeableRef,
  onSwipeableWillOpen,
  renderRightActions,
}: {
  convo: StoredConversation;
  isMuted: boolean;
  onPress: () => void;
  swipeableRef: (ref: Swipeable | null) => void;
  onSwipeableWillOpen: () => void;
  renderRightActions: () => ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const showUnread = convo.unread && !isMuted;

  return (
    <View style={styles.swipeRow}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableWillOpen={onSwipeableWillOpen}
      >
        <Animated.View style={[styles.convoCard, { transform: [{ scale }] }]}>
          <Pressable
            onPress={onPress}
            onPressIn={() => animateScale(0.97)}
            onPressOut={() => animateScale(1)}
            style={styles.cardPressable}
          >
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={ACCENT_DARK} />
            </View>
            <View style={styles.convoBody}>
              <View style={styles.convoTop}>
                <View style={styles.nameRow}>
                  <Text style={styles.convoName} numberOfLines={1}>
                    {convo.playerName}
                  </Text>
                  {isMuted ? (
                    <Ionicons
                      name="notifications-off-outline"
                      size={16}
                      color={MUTED}
                    />
                  ) : null}
                  <Text style={styles.nameSportEmoji}>{convo.sportEmoji}</Text>
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.convoTime}>
                    {formatConversationTime(convo.lastMessageTime)}
                  </Text>
                  {showUnread ? <View style={styles.unreadDot} /> : null}
                </View>
              </View>
              <Text style={styles.convoPreview} numberOfLines={1}>
                {convo.lastMessage}
              </Text>
              {convo.playerLocation || convo.playerSkill ? (
                <Text style={styles.convoMeta} numberOfLines={1}>
                  {[convo.playerSkill, convo.playerLocation]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </Swipeable>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [subTab, setSubTab] = useState<ChatSubTab>("private");
  const [privateBadge, setPrivateBadge] = useState(0);
  const [groupBadge, setGroupBadge] = useState(0);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [groupChats, setGroupChats] = useState<StoredGroupChatConversation[]>(
    []
  );
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [mutedGroupIds, setMutedGroupIds] = useState<string[]>([]);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const subTabRef = useRef<ChatSubTab>("private");
  subTabRef.current = subTab;

  const loadConversations = useCallback(async () => {
    const convos = await loadStoredConversations();
    setConversations(convos);
  }, []);

  const loadGroupChats = useCallback(async () => {
    const groups = await loadGroupChatConversations();
    setGroupChats(groups);
  }, []);

  const refreshBadges = useCallback(async () => {
    const [priv, grp] = await Promise.all([
      getUnreadPrivateCount(),
      getUnreadGroupCount(),
    ]);
    if (subTabRef.current === "private") {
      await clearUnreadPrivate();
      setPrivateBadge(0);
      setGroupBadge(grp);
    } else {
      await clearUnreadGroup();
      setGroupBadge(0);
      setPrivateBadge(priv);
    }
  }, []);

  const switchSubTab = useCallback(async (tab: ChatSubTab) => {
    setSubTab(tab);
    if (tab === "private") {
      await clearUnreadPrivate();
      setPrivateBadge(0);
    } else {
      await clearUnreadGroup();
      setGroupBadge(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      void loadGroupChats();
      void refreshBadges();

      AsyncStorage.getItem(MUTED_CONVERSATIONS_KEY).then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val) as string[];
            setMutedIds(Array.isArray(parsed) ? parsed : []);
          } catch {
            setMutedIds([]);
          }
        } else {
          setMutedIds([]);
        }
      });

      AsyncStorage.getItem(MUTED_GROUP_CHATS_KEY).then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val) as string[];
            setMutedGroupIds(Array.isArray(parsed) ? parsed : []);
          } catch {
            setMutedGroupIds([]);
          }
        } else {
          setMutedGroupIds([]);
        }
      });
    }, [loadConversations, loadGroupChats, refreshBadges])
  );

  const closeAllSwipeables = useCallback(() => {
    Object.values(swipeableRefs.current).forEach((ref) => ref?.close());
  }, []);

  const closeOtherSwipeables = useCallback((openId: string) => {
    Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
      if (id !== openId) ref?.close();
    });
  }, []);

  const openConversation = (convo: StoredConversation) => {
    closeAllSwipeables();
    router.push({
      pathname: "/chat-conversation",
      params: {
        playerId: convo.id,
        playerName: convo.playerName,
        playerAge: convo.playerAge ?? "",
        playerLocation: convo.playerLocation,
        playerSkill: convo.playerSkill,
        playerPurpose: convo.playerPurpose ?? "",
        sportEmoji: convo.sportEmoji,
        isOrganizerChat: convo.isOrganizerChat ? "true" : "",
        eventId: convo.eventId ?? "",
      },
    });
  };

  const openGroupChat = (convo: StoredGroupChatConversation) => {
    closeAllSwipeables();
    router.push({
      pathname: "/event-group-chat",
      params: {
        eventId: convo.eventId,
        eventTitle: convo.eventTitle,
        sportEmoji: convo.sportEmoji,
        organizer: convo.organizer ?? "Organizer",
      },
    });
  };

  const handleMute = useCallback(async (id: string) => {
    swipeableRefs.current[id]?.close();
    setMutedIds((prev) => {
      const isCurrentlyMuted = prev.includes(id);
      const next = isCurrentlyMuted
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      void AsyncStorage.setItem(MUTED_CONVERSATIONS_KEY, JSON.stringify(next));
      if (!isCurrentlyMuted) {
        setConversations((current) =>
          current.map((c) => (c.id === id ? { ...c, unread: false } : c))
        );
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback((convo: StoredConversation) => {
    swipeableRefs.current[convo.id]?.close();
    Alert.alert(
      "Delete this conversation?",
      "This will remove the chat from your list",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await removeConversation(convo.id);
              setConversations((prev) => prev.filter((c) => c.id !== convo.id));
              delete swipeableRefs.current[convo.id];
            })();
          },
        },
      ]
    );
  }, []);

  const handleMuteGroupChat = useCallback(async (eventId: string) => {
    swipeableRefs.current[`group-${eventId}`]?.close();
    setMutedGroupIds((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      void AsyncStorage.setItem(MUTED_GROUP_CHATS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDeleteGroupChat = useCallback((eventId: string) => {
    swipeableRefs.current[`group-${eventId}`]?.close();
    Alert.alert(
      "Delete Group Chat",
      "This will remove the group chat from your list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setGroupChats((prev) => {
                const updated = prev.filter((g) => g.eventId !== eventId);
                void AsyncStorage.setItem(
                  GROUP_CHAT_CONVERSATIONS_KEY,
                  JSON.stringify(updated)
                );
                return updated;
              });
              delete swipeableRefs.current[`group-${eventId}`];
            })();
          },
        },
      ]
    );
  }, []);

  const renderGroupChatRightActions = useCallback(
    (eventId: string) => () => {
      const isMuted = mutedGroupIds.includes(eventId);

      return (
        <View style={styles.actionsRow}>
          <Pressable
            style={isMuted ? styles.unmuteAction : styles.muteAction}
            onPress={() => void handleMuteGroupChat(eventId)}
          >
            <Ionicons
              name={
                isMuted ? "notifications-outline" : "notifications-off-outline"
              }
              size={22}
              color="#ffffff"
            />
            <Text style={styles.actionLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
          </Pressable>
          <Pressable
            style={styles.deleteAction}
            onPress={() => handleDeleteGroupChat(eventId)}
          >
            <Ionicons name="trash-outline" size={22} color="#ffffff" />
            <Text style={styles.actionLabel}>Delete</Text>
          </Pressable>
        </View>
      );
    },
    [handleDeleteGroupChat, handleMuteGroupChat, mutedGroupIds]
  );

  const renderRightActions = useCallback(
    (convo: StoredConversation) => () => {
      const isMuted = mutedIds.includes(convo.id);

      return (
        <View style={styles.actionsRow}>
          <Pressable
            style={isMuted ? styles.unmuteAction : styles.muteAction}
            onPress={() => void handleMute(convo.id)}
          >
            <Ionicons
              name={
                isMuted ? "notifications-outline" : "notifications-off-outline"
              }
              size={22}
              color="#ffffff"
            />
            <Text style={styles.actionLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
          </Pressable>
          <Pressable
            style={styles.deleteAction}
            onPress={() => handleDelete(convo)}
          >
            <Ionicons name="trash-outline" size={22} color="#ffffff" />
            <Text style={styles.actionLabel}>Delete</Text>
          </Pressable>
        </View>
      );
    },
    [handleDelete, handleMute, mutedIds]
  );

  return (
    <GestureHandlerRootView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeAllSwipeables}
      >
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>
          Message your matches and lock in a game.
        </Text>

        <View style={styles.titleUnderline} />

        <View style={styles.subTabRow}>
          {(
            [
              { key: "private" as const, label: "Private" },
              { key: "group" as const, label: "Group" },
            ] as const
          ).map((tab) => {
            const active = subTab === tab.key;
            const badge = tab.key === "private" ? privateBadge : groupBadge;
            return (
              <Pressable
                key={tab.key}
                onPress={() => void switchSubTab(tab.key)}
                style={styles.subTabBtn}
              >
                <View style={styles.subTabLabelRow}>
                  <Text
                    style={[styles.subTabText, active && styles.subTabTextActive]}
                  >
                    {tab.label}
                  </Text>
                  {badge > 0 ? (
                    <View style={styles.subTabBadge}>
                      <Text style={styles.subTabBadgeText}>{badge}</Text>
                    </View>
                  ) : null}
                </View>
                {active ? <View style={styles.subTabUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.tabBody}>
          {subTab === "private" ? (
            conversations.length === 0 ? (
              <>
                <View style={styles.card}>
                  <View style={styles.cardStripe} />
                  <Text style={styles.cardHeading}>No conversations yet</Text>
                  <Text style={styles.cardBody}>
                    Tap Match to find players and start a direct message, or
                    message an event organizer from Event Plaza.
                  </Text>
                </View>
                <View style={styles.hintPill}>
                  <Text style={styles.hintText}>
                    Tip: confirm time & court in chat
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.list}>
                {conversations.map((convo) => (
                  <ConversationRow
                    key={convo.id}
                    convo={convo}
                    isMuted={mutedIds.includes(convo.id)}
                    swipeableRef={(ref) => {
                      swipeableRefs.current[convo.id] = ref;
                    }}
                    onSwipeableWillOpen={() => closeOtherSwipeables(convo.id)}
                    renderRightActions={renderRightActions(convo)}
                    onPress={() => openConversation(convo)}
                  />
                ))}
              </View>
            )
          ) : groupChats.length === 0 ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardStripe} />
                <Text style={styles.cardHeading}>No group chats yet</Text>
                <Text style={styles.cardBody}>
                  Join or host an event to chat with your group in Event Plaza.
                </Text>
              </View>
              <View style={styles.hintPill}>
                <Text style={styles.hintText}>
                  Tip: coordinate meetups in your event group chat
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.list}>
              {groupChats.map((convo) => (
                <GroupChatRow
                  key={convo.eventId}
                  convo={convo}
                  isMuted={mutedGroupIds.includes(convo.eventId)}
                  swipeableRef={(ref) => {
                    swipeableRefs.current[`group-${convo.eventId}`] = ref;
                  }}
                  onSwipeableWillOpen={() =>
                    closeOtherSwipeables(`group-${convo.eventId}`)
                  }
                  renderRightActions={renderGroupChatRightActions(convo.eventId)}
                  onPress={() => openGroupChat(convo)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: TEXT,
    alignSelf: "flex-start",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "600",
    color: ACCENT_DARK,
    lineHeight: 24,
    alignSelf: "stretch",
    textAlign: "center",
  },
  titleUnderline: {
    alignSelf: "flex-start",
    marginTop: 20,
    height: 4,
    width: 48,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  subTabRow: {
    alignSelf: "stretch",
    width: "100%",
    flexDirection: "row",
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  subTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  subTabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subTabBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  subTabBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  subTabText: {
    fontSize: 15,
    fontWeight: "600",
    color: MUTED,
  },
  subTabTextActive: {
    color: ACCENT_DARK,
    fontWeight: "800",
  },
  subTabUnderline: {
    marginTop: 8,
    height: 3,
    width: "70%",
    borderRadius: 2,
    backgroundColor: ACCENT_DARK,
  },
  tabBody: {
    alignSelf: "stretch",
    width: "100%",
    marginTop: 8,
  },
  card: {
    marginTop: 28,
    width: "100%",
    maxWidth: 400,
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  cardStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ACCENT_DARK,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 10,
    paddingLeft: 8,
  },
  cardBody: {
    fontSize: 15,
    fontWeight: "600",
    color: MUTED,
    lineHeight: 22,
    paddingLeft: 8,
  },
  hintPill: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: ACCENT,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  list: {
    marginTop: 16,
    alignSelf: "stretch",
    width: "100%",
  },
  groupChatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  groupChatAvatarEmoji: {
    fontSize: 24,
  },
  swipeRow: {
    marginVertical: 6,
    alignSelf: "stretch",
  },
  actionsRow: {
    flexDirection: "row",
    width: SWIPE_ACTIONS_WIDTH,
  },
  muteAction: {
    width: ACTION_WIDTH,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  unmuteAction: {
    width: ACTION_WIDTH,
    backgroundColor: "#64748b",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  deleteAction: {
    width: ACTION_WIDTH,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  convoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 30,
    alignSelf: "stretch",
    borderLeftWidth: 4,
    borderLeftColor: ACCENT_DARK,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  convoBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  convoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  nameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  convoName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
  },
  nameSportEmoji: {
    fontSize: 18,
  },
  timeCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  convoTime: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
  },
  convoPreview: {
    fontSize: 15,
    fontWeight: "600",
    color: MUTED,
  },
  convoMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: ACCENT_DARK,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_DARK,
  },
});
