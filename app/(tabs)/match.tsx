import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const H_PADDING = 20;
const ROW_GAP = 18;

const CARD_WIDTH = 145;
const CARD_HEIGHT = 178;
const COLUMN_GAP = 32;
const GRID_WIDTH = CARD_WIDTH * 2 + COLUMN_GAP;

const SPORTS = [
  { id: "tennis", label: "Tennis", emoji: "🎾", levels: 8 },
  { id: "basketball", label: "Basketball", emoji: "🏀", levels: 5 },
  { id: "soccer", label: "Soccer", emoji: "⚽", levels: 5 },
  { id: "badminton", label: "Badminton", emoji: "🏸", levels: 4 },
  { id: "table_tennis", label: "Table Tennis", emoji: "🏓", levels: 4 },
  { id: "volleyball", label: "Volleyball", emoji: "🏐", levels: 5 },
  { id: "squash", label: "Squash", emoji: "🎯", levels: 4 },
  { id: "golf", label: "Golf", emoji: "⛳", levels: 5 },
] as const;

const ROWS = [
  [SPORTS[0], SPORTS[1]],
  [SPORTS[2], SPORTS[3]],
  [SPORTS[4], SPORTS[5]],
  [SPORTS[6], SPORTS[7]],
] as const;

const SPORT_BORDER_COLORS: Record<(typeof SPORTS)[number]["id"], string> = {
  tennis: "#86efac",
  basketball: "#fdba74",
  soccer: "#6ee7b7",
  badminton: "#93c5fd",
  table_tennis: "#f9a8d4",
  volleyball: "#fde68a",
  squash: "#c4b5fd",
  golf: "#86efac",
};

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function MatchScreen() {
  const router = useRouter();
  const emojiAnims = useRef(
    SPORTS.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    emojiAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
        delay: index * 100,
      }).start();
    });
  }, [emojiAnims]);

  return (
    <LinearGradient
      colors={["#bbf7d0", "#86efac", "#f0fdf4"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome back ✨</Text>
          <Text style={styles.title}>Find Your Match</Text>
          <Text style={styles.subtitle}>Pick a sport and meet players nearby</Text>
        </View>

        <View style={styles.grid}>
          {ROWS.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.row, rowIndex === ROWS.length - 1 && styles.lastRow]}
            >
              {row.map((sport, colIndex) => {
                const flatIndex = rowIndex * 2 + colIndex;
                const borderColor = SPORT_BORDER_COLORS[sport.id];
                const tintColor = hexToRgba(borderColor, 0.1);
                return (
                  <Pressable
                    key={sport.id}
                    onPress={() =>
                      router.push({
                        pathname: "/match-filter",
                        params: {
                          sportId: sport.id,
                          sportName: sport.label,
                          sportEmoji: sport.emoji,
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.card,
                      {
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        marginRight: colIndex === 0 ? COLUMN_GAP / 2 : 0,
                        marginLeft: colIndex === 1 ? COLUMN_GAP / 2 : 0,
                        borderColor,
                        backgroundColor: tintColor,
                      },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.emojiBubble,
                        {
                          transform: [
                            {
                              scale: emojiAnims[flatIndex].interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.7, 1],
                              }),
                            },
                            {
                              translateY: emojiAnims[flatIndex].interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={styles.emoji}>{sport.emoji}</Text>
                    </Animated.View>
                    <Text style={styles.label}>{sport.label}</Text>
                    <Text style={styles.levels}>{sport.levels} skill levels</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    width: "100%",
    paddingTop: 42,
    paddingHorizontal: H_PADDING,
    marginBottom: 26,
  },
  welcome: {
    fontSize: 18,
    color: "#7c3aed",
    fontWeight: "800",
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: "#6b7280",
    lineHeight: 24,
    fontWeight: "600",
  },
  grid: {
    flex: 1,
    width: GRID_WIDTH,
    alignSelf: "center",
    paddingBottom: 24,
    justifyContent: "space-evenly",
  },
  row: {
    width: GRID_WIDTH,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: ROW_GAP,
  },
  lastRow: {
    marginBottom: 0,
  },
  card: {
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderWidth: 1,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.98 }],
  },
  emojiBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emoji: {
    fontSize: 46,
    textAlign: "center",
  },
  label: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  levels: {
    fontSize: 14,
    color: "#16A34A",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "700",
    opacity: 0.75,
  },
});
