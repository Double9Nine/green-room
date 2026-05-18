import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  loadStoredConversations,
  type StoredConversation,
} from "@/lib/conversationsStorage";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#22c55e";
const ACCENT_DARK = "#15803d";

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

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [conversations, setConversations] = useState<StoredConversation[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadConversations = async () => {
        const convos = await loadStoredConversations();
        setConversations(convos);
      };
      void loadConversations();
    }, [])
  );

  const openConversation = (convo: StoredConversation) => {
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

  return (
    <LinearGradient
      colors={[BG, "#ecfdf5"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
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
              <Pressable
                key={convo.id}
                onPress={() => openConversation(convo)}
                style={({ pressed }) => [
                  styles.convoRow,
                  pressed && styles.convoRowPressed,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>{convo.sportEmoji}</Text>
                </View>
                <View style={styles.convoBody}>
                  <View style={styles.convoTop}>
                    <Text style={styles.convoName} numberOfLines={1}>
                      {convo.playerName}
                    </Text>
                    <Text style={styles.convoTime}>
                      {formatConversationTime(convo.lastMessageTime)}
                    </Text>
                  </View>
                  <View style={styles.convoBottom}>
                    <Text style={styles.convoPreview} numberOfLines={1}>
                      {convo.lastMessage}
                    </Text>
                    {convo.unread ? <View style={styles.unreadDot} /> : null}
                  </View>
                  {convo.playerLocation || convo.playerSkill ? (
                    <Text style={styles.convoMeta} numberOfLines={1}>
                      {[convo.playerSkill, convo.playerLocation]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={MUTED} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
    width: "100%",
    maxWidth: 400,
    gap: 10,
  },
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  convoRowPressed: {
    opacity: 0.9,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 22,
  },
  convoBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  convoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  convoName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  convoTime: {
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
  },
  convoBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  convoPreview: {
    flex: 1,
    fontSize: 14,
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
