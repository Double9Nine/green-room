import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function parseJsonArray(raw: string | undefined, fallback: string[] = []): string[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : fallback;
  } catch {
    return fallback;
  }
}

export default function MatchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    sport?: string;
    sportLabel?: string;
    skillLevels?: string;
    availability?: string;
    ageRange?: string;
    genderPreference?: string;
    purpose?: string;
  }>();

  const filters = useMemo(
    () => ({
      sport: params.sport ?? "",
      sportLabel: params.sportLabel ?? params.sport ?? "",
      skillLevels: parseJsonArray(params.skillLevels),
      availability: parseJsonArray(params.availability),
      ageRange: parseJsonArray(params.ageRange),
      genderPreference: parseJsonArray(params.genderPreference),
      purpose: parseJsonArray(params.purpose),
    }),
    [params]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#15803d" />
              <Text style={{ color: "#15803d", fontSize: 16 }}>Back</Text>
            </Pressable>
          ),
          title: "Match Results",
          headerStyle: { backgroundColor: "#f0fdf4" },
          headerTitleStyle: { color: "#0f172a", fontWeight: "700" },
        }}
      />
      <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Your match preferences</Text>
        <Text style={styles.sub}>Sport: {filters.sportLabel || filters.sport}</Text>

        <Section title="Skill level" items={filters.skillLevels} />
        <Section title="Availability" items={filters.availability} />
        <Section title="Age range" items={filters.ageRange} />
        <Section title="Gender preference" items={filters.genderPreference} />
        <Section title="Purpose" items={filters.purpose} />

        <Text style={styles.hint}>
          Matching logic can plug in here using these selections.
        </Text>
      </ScrollView>
    </View>
    </>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>None selected</Text>
      ) : (
        items.map((line) => (
          <Text key={line} style={styles.bullet}>
            • {line}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    paddingHorizontal: 20,
  },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  sub: {
    fontSize: 16,
    fontWeight: "600",
    color: "#14532d",
    marginBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    color: "#0f172a",
    lineHeight: 22,
  },
  empty: {
    fontSize: 15,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
});
