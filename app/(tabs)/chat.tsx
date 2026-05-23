import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
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

const MUTED_CONVERSATIONS_KEY = "mutedConversations";

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
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
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
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  useFocusEffect(
    useCallback(() => {
      const loadConversations = async () => {
        const convos = await loadStoredConversations();
        setConversations(convos);
      };
      void loadConversations();

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
    }, [])
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

        {conversations.length === 0 ? (
          <>
            <View style={styles.card}>
              <View style={styles.cardStripe} />
              <Text style={styles.cardHeading}>No conversations yet</Text>
              <Text style={styles.cardBody}>
                When you match with players, your threads will show up here. Tap
                Match to set your preferences and find people at your level.
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
        )}
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
    marginTop: 24,
    alignSelf: "stretch",
    width: "100%",
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
