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

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[BG, '#ecfdf5', '#dcfce7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>
          Discover players and venues near you
        </Text>

        <View style={styles.titleUnderline} />

        <Text style={styles.sectionTitle}>Nearby players</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {[1, 2, 3].map((i) => (
            <View key={`p-${i}`} style={styles.playerCard}>
              <View style={styles.avatarPlaceholder} />
              <View style={styles.playerCardCornerDecor} />
              <Text style={styles.cardTitle}>Player {i}</Text>
              <Text style={styles.cardMeta}>Open to play · 2 mi</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Venues</Text>
        {[1, 2].map((i) => (
          <View key={`v-${i}`} style={styles.venueCard}>
            <View style={styles.venueSideStripe} />
            <View style={styles.venueBody}>
              <Text style={styles.venueName}>Court & Field {i}</Text>
              <Text style={styles.venueMeta}>Public courts · lights until 10pm</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
    marginBottom: 8,
    height: 4,
    width: 48,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: ACCENT_DARK,
    textTransform: "uppercase",
  },
  horizontalRow: {
    flexDirection: "row",
    gap: 14,
    paddingRight: 8,
  },
  playerCard: {
    width: 156,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BG,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  playerCardCornerDecor: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 12,
    backgroundColor: ACCENT,
    opacity: 0.15,
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT_DARK,
  },
  venueCard: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
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
  venueSideStripe: {
    width: 5,
    backgroundColor: ACCENT,
  },
  venueBody: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  venueName: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
  },
  venueMeta: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: MUTED,
  },
});
