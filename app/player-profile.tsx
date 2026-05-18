import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
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
    sportEmoji?: string;
  }>();

  const playerName = params.playerName ?? "Player";
  const playerAge = params.playerAge ?? "";
  const playerLocation = params.playerLocation ?? "";
  const playerSkill = params.playerSkill ?? "";
  const playerPurpose = params.playerPurpose ?? "";
  const sportEmoji = params.sportEmoji ?? "🎾";
  const playerId = params.playerId ?? "1";

  const availability = useMemo(
    () => mockAvailabilitySlots(playerId),
    [playerId]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={56} color={GOLD} />
          </View>

          <Text style={styles.name}>{playerName}</Text>

          <Text style={styles.sportSkill}>
            {sportEmoji} {playerSkill}
          </Text>

          {playerLocation ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color={ACCENT_GREEN} />
              <Text style={styles.locationText}>{playerLocation}</Text>
            </View>
          ) : null}

          {playerAge ? (
            <Text style={styles.age}>Age {playerAge}</Text>
          ) : null}

          {playerPurpose ? (
            <View style={styles.purposeBadge}>
              <Text style={styles.purposeText}>{playerPurpose}</Text>
            </View>
          ) : null}

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
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaText}>Message & Plan</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
    paddingVertical: 8,
    backgroundColor: DARK_GREEN,
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
    marginBottom: 24,
  },
  purposeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
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
