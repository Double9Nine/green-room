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

export default function ChatScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[BG, '#ecfdf5']}
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

        <View style={styles.card}>
          <View style={styles.cardStripe} />
          <Text style={styles.cardHeading}>No conversations yet</Text>
          <Text style={styles.cardBody}>
            When you match with players, your threads will show up here. Tap
            Match to set your preferences and find people at your level.
          </Text>
        </View>

        <View style={styles.hintPill}>
          <Text style={styles.hintText}>Tip: confirm time & court in chat</Text>
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
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
});
