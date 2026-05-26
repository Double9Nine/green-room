import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const DARK_GREEN = "#052e16";
const ACCENT_GREEN = "#15803d";
const GOLD = "#d4af37";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TIMES = ["Mor", "Aft", "Eve"];

const EVENT_CONTEXT_DEFAULT_AGE = "28";
const EVENT_CONTEXT_DEFAULT_PURPOSE = "Level Up My Game 🏆";
const EVENT_CONTEXT_DEFAULT_TAGS = ["Low-key competitive", "Won't flake"];

function mockAvailabilitySlots(playerId: string): Set<string> {
  const id = parseInt(playerId, 10) || 1;
  const slots = new Set<string>();
  for (let day = 0; day < 7; day++) {
    for (let time = 0; time < 3; time++) {
      if ((day + time + id) % 2 === 0) {
        slots.add(`${day}-${time}`);
      }
    }
  }
  return slots;
}

function parseTagsParam(raw: string | undefined): string[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return null;
  }
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    playerId?: string;
    playerName?: string;
    playerAge?: string;
    playerLocation?: string;
    playerSkill?: string;
    playerPurpose?: string;
    playerTags?: string;
    playerPhoto?: string;
    playerGamesPlayed?: string;
    sportEmoji?: string;
    hideLocation?: string;
    hideAvailability?: string;
    isOrganizer?: string;
  }>();

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const playerName = params.playerName ?? "Player";

  useEffect(() => {
    AsyncStorage.getItem("userProfile").then((raw) => {
      const profile = raw ? JSON.parse(raw) : {};
      if (profile.name && profile.name === playerName) {
        setGamesPlayed(profile.gamesPlayed ?? 0);
      } else {
        setGamesPlayed(Number(params.playerGamesPlayed) || 0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const playerPhoto = params.playerPhoto?.trim() || null;
  const hideLocation = params.hideLocation === "true";
  const hideAvailability = params.hideAvailability === "true";
  const isOrganizer = params.isOrganizer === "true";
  const playerLocation = hideLocation ? "" : (params.playerLocation ?? "");
  const playerSkill = params.playerSkill ?? "";
  const sportEmoji = params.sportEmoji ?? "🎾";
  const playerId = params.playerId ?? "1";

  const displayAge =
    params.playerAge?.trim() ||
    (hideAvailability ? EVENT_CONTEXT_DEFAULT_AGE : "");
  const displayPurpose =
    params.playerPurpose?.trim() ||
    (hideAvailability ? EVENT_CONTEXT_DEFAULT_PURPOSE : "");
  const displayTags = useMemo(() => {
    const fromParam = parseTagsParam(params.playerTags);
    if (fromParam && fromParam.length > 0) return fromParam;
    if (hideAvailability) return [...EVENT_CONTEXT_DEFAULT_TAGS];
    return [];
  }, [params.playerTags, hideAvailability]);

  const availability = useMemo(
    () => mockAvailabilitySlots(playerId),
    [playerId]
  );

  const handleFooterPress = () => {
    if (isOrganizer) {
      router.push({
        pathname: "/chat-conversation",
        params: {
          playerId: `organizer-${playerName}`,
          playerName,
          sportEmoji,
        },
      });
      return;
    }
    router.back();
  };

  const footerLabel = isOrganizer ? "Message Organizer" : "Message & Plan";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#052e16" }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBack}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={GOLD} />
            <Text style={styles.headerBackText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={{ flex: 1, backgroundColor: "#f0fdf4" }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => setShowPhotoModal(true)}>
            <View style={styles.avatarLarge}>
              {playerPhoto ? (
                <Image
                  source={{ uri: playerPhoto }}
                  style={{ width: "100%", height: "100%", borderRadius: 999 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={56} color={GOLD} />
              )}
            </View>
          </Pressable>

          <Text style={styles.name}>{playerName}</Text>

          <Text style={styles.sportSkill}>
            {sportEmoji}
            {playerSkill ? ` ${playerSkill}` : ""}
          </Text>

          {playerLocation ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color={ACCENT_GREEN} />
              <Text style={styles.locationText}>{playerLocation}</Text>
            </View>
          ) : null}

          {displayAge ? (
            <Text style={styles.age}>Age {displayAge}</Text>
          ) : null}

          {displayPurpose ? (
            <View style={styles.purposeBadge}>
              <Text style={styles.purposeText}>{displayPurpose}</Text>
            </View>
          ) : null}

          {displayTags.length > 0 ? (
            <View style={styles.tagsRow}>
              {displayTags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.gamesPlayedRow}>
            <Ionicons name="trophy-outline" size={18} color="#64748b" />
            <Text style={styles.gamesPlayedText}>
              {gamesPlayed} games played
            </Text>
          </View>

          {!hideAvailability ? (
            <>
              <Text style={styles.sectionLabel}>Availability</Text>
              <View style={styles.availabilityCard}>
                <View style={styles.availabilityHeaderRow}>
                  <View style={styles.timeLabelSpacer} />
                  {DAYS.map((day, dayIndex) => (
                    <Text key={`h-${dayIndex}`} style={styles.dayLabel}>
                      {day}
                    </Text>
                  ))}
                </View>
                {[0, 1, 2].map((time) => (
                  <View key={time} style={styles.availabilityRow}>
                    <Text style={styles.timeLabel}>{TIMES[time]}</Text>
                    {DAYS.map((_, dayIndex) => {
                      const key = `${dayIndex}-${time}`;
                      const selected = availability.has(key);
                      return (
                        <View
                          key={key}
                          style={[
                            styles.availabilityCell,
                            selected
                              ? styles.availabilityCellOn
                              : styles.availabilityCellOff,
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        {!hideAvailability ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <Pressable
              onPress={handleFooterPress}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaText}>{footerLabel}</Text>
            </Pressable>
          </View>
        ) : null}
        </View>
      </SafeAreaView>

      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setShowPhotoModal(false)}
        >
          {playerPhoto ? (
            <Image
              source={{ uri: playerPhoto }}
              style={{
                width: "85%",
                aspectRatio: 1,
                borderRadius: 16,
              }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: "#15803d",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#d4af37",
              }}
            >
              <Ionicons name="person" size={100} color="#ffffff" />
            </View>
          )}
          <Pressable
            onPress={() => setShowPhotoModal(false)}
            style={{
              position: "absolute",
              top: 56,
              right: 20,
              padding: 8,
            }}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: "#052e16",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.25)",
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 72,
  },
  headerBackText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  headerSpacer: {
    minWidth: 72,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#065f46",
    borderWidth: 3,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  sportSkill: {
    fontSize: 17,
    fontWeight: "700",
    color: ACCENT_GREEN,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "600",
  },
  age: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 16,
  },
  purposeBadge: {
    backgroundColor: ACCENT_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 12,
  },
  purposeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
    alignSelf: "stretch",
  },
  tagPill: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT_GREEN,
  },
  gamesPlayedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  gamesPlayedText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
  sectionLabel: {
    alignSelf: "stretch",
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_GREEN,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  availabilityCard: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  availabilityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeLabelSpacer: {
    width: 36,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  timeLabel: {
    width: 36,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
  },
  availabilityCell: {
    flex: 1,
    height: 32,
    marginHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  availabilityCellOn: {
    backgroundColor: ACCENT_GREEN,
    borderColor: ACCENT_GREEN,
  },
  availabilityCellOff: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  cta: {
    backgroundColor: ACCENT_GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
});
