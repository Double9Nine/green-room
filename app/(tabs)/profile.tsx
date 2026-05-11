import { LinearGradient } from "expo-linear-gradient";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BG = '#f0fdf4';
const WHITE = '#ffffff';
const TEXT = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const ACCENT = '#22c55e';
const ACCENT_DARK = '#15803d';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your sports, skill level, and preferences.
        </Text>

        <View style={styles.titleUnderline} />

        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName}>Your name</Text>
            <Text style={styles.heroMeta}>Complete your profile to stand out</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.statCard, styles.statCardLeft]}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Sports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listHeading}>Quick actions</Text>
          {["Edit sports & level", "Availability", "Notifications"].map((label) => (
            <View key={label} style={styles.listRow}>
              <View style={styles.listDot} />
              <Text style={styles.listLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: TEXT,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "600",
    color: ACCENT_DARK,
    lineHeight: 24,
  },
  titleUnderline: {
    marginTop: 20,
    height: 4,
    width: 48,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  heroCard: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#bbf7d0",
  },
  heroText: {
    flex: 1,
    marginLeft: 16,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT,
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT_DARK,
  },
  row: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statCardLeft: {},
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listCard: {
    marginTop: 16,
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  listHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 14,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginRight: 12,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: '#334155',
  },
});
