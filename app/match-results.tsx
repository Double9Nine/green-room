import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getMatchSport } from "@/constants/matchSports";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 14;
const CARD_WIDTH = 272;
const CARD_WIDTH_SIDE = 232;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

const GOLD = "#d4af37";
const DARK_GREEN = "#052e16";
const BG_GRADIENT = ["#052e16", "#14532d", "#166534"] as const;
const CARD_GRADIENT = ["#064e3b", "#065f46", "#047857"] as const;

const SPARKLE_POSITIONS = [
  { left: "8%", top: "6%", size: 5, baseOpacity: 0.25 },
  { left: "78%", top: "10%", size: 4, baseOpacity: 0.18 },
  { left: "42%", top: "14%", size: 3, baseOpacity: 0.3 },
  { left: "18%", top: "28%", size: 4, baseOpacity: 0.15 },
  { left: "88%", top: "32%", size: 5, baseOpacity: 0.22 },
  { left: "55%", top: "42%", size: 3, baseOpacity: 0.2 },
  { left: "6%", top: "52%", size: 4, baseOpacity: 0.28 },
  { left: "72%", top: "58%", size: 3, baseOpacity: 0.16 },
  { left: "32%", top: "68%", size: 5, baseOpacity: 0.24 },
  { left: "92%", top: "72%", size: 4, baseOpacity: 0.19 },
];

type Player = {
  id: number;
  name: string;
  age: number;
  location: string;
  skill: string;
  availability: string;
  purpose: string;
  photo: string | null;
};

const DUMMY_PLAYERS: Player[] = [
  {
    id: 1,
    name: "Alex J.",
    age: 28,
    location: "Jersey City, NJ",
    skill: "3.5 - Intermediate+",
    availability: "Weekends/Eves",
    purpose: "Level Up My Game 🏆",
    photo: null,
  },
  {
    id: 2,
    name: "Sarah M.",
    age: 31,
    location: "Manhattan, NY",
    skill: "3.0 - Intermediate",
    availability: "Weekday Eves",
    purpose: "Ride or Die Partner 🤝",
    photo: null,
  },
  {
    id: 3,
    name: "Maria L.",
    age: 26,
    location: "Hoboken, NJ",
    skill: "4.0 - Advanced",
    availability: "Weekends",
    purpose: "Here for the Vibes 😎",
    photo: null,
  },
  {
    id: 4,
    name: "James K.",
    age: 33,
    location: "Brooklyn, NY",
    skill: "2.5 - Beginner+",
    availability: "Mornings",
    purpose: "Keeping It Moving 🏃",
    photo: null,
  },
  {
    id: 5,
    name: "Lisa C.",
    age: 29,
    location: "Queens, NY",
    skill: "3.5 - Intermediate+",
    availability: "Flexible",
    purpose: "Level Up My Game 🏆",
    photo: null,
  },
  {
    id: 6,
    name: "David W.",
    age: 35,
    location: "Weehawken, NJ",
    skill: "4.5 - Advanced+",
    availability: "Weekends",
    purpose: "Ride or Die Partner 🤝",
    photo: null,
  },
  {
    id: 7,
    name: "Emma R.",
    age: 24,
    location: "Union City, NJ",
    skill: "2.0 - Beginner",
    availability: "Evenings",
    purpose: "Here for the Vibes 😎",
    photo: null,
  },
  {
    id: 8,
    name: "Chris T.",
    age: 30,
    location: "Fort Lee, NJ",
    skill: "3.0 - Intermediate",
    availability: "Weekends/Eves",
    purpose: "Keeping It Moving 🏃",
    photo: null,
  },
];

function getLevelLabel(skill: string) {
  const s = skill.toLowerCase();
  if (s.includes("expert") || s.includes("scratch") || s.includes("semi-pro")) {
    return "EXPERT";
  }
  if (s.includes("advanced")) return "ADVANCED";
  if (s.includes("intermediate") || s.includes("recreational")) {
    return "INTERMEDIATE";
  }
  return "BEGINNER";
}

function parseSportDisplay(sportLabel: string, sportId: string) {
  const emojiMatch = sportLabel.match(/([\u{1F300}-\u{1FAFF}])/u);
  const namePart = sportLabel.replace(/([\u{1F300}-\u{1FAFF}])/gu, "").trim();
  if (emojiMatch && namePart) {
    return { name: namePart, emoji: emojiMatch[1] };
  }
  const fromId = getMatchSport(sportId);
  if (fromId) {
    return { name: fromId.name, emoji: fromId.emoji };
  }
  return { name: sportLabel || "Sport", emoji: "🎯" };
}

function SparkleDot({
  left,
  top,
  size,
  baseOpacity,
  delay,
}: {
  left: string;
  top: string;
  size: number;
  baseOpacity: number;
  delay: number;
}) {
  const twinkle = useRef(new Animated.Value(baseOpacity)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(twinkle, {
          toValue: Math.min(baseOpacity + 0.15, 0.45),
          duration: 900 + delay,
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: baseOpacity * 0.6,
          duration: 900 + delay,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [baseOpacity, delay, twinkle]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ffffff",
        opacity: twinkle,
      }}
    />
  );
}

function SparkleBackground({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[...BG_GRADIENT]}
      style={styles.gradientRoot}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {SPARKLE_POSITIONS.map((s, i) => (
        <SparkleDot key={i} {...s} delay={i * 120} />
      ))}
      {children}
    </LinearGradient>
  );
}

function DiagonalStripeOverlay() {
  return (
    <View style={styles.stripeOverlay} pointerEvents="none">
      {Array.from({ length: 24 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripeLine,
            { top: i * 14 - 40 },
          ]}
        />
      ))}
    </View>
  );
}

function CornerDiamond({ style }: { style: object }) {
  return <View style={[styles.cornerDiamond, style]} />;
}

type PlayerCardProps = {
  player: Player;
  sportName: string;
  sportEmoji: string;
  featured: boolean;
  onMessageAndPlan: () => void;
  onSkip: () => void;
};

function PlayerCard({
  player,
  sportName,
  sportEmoji,
  featured,
  onMessageAndPlan,
  onSkip,
}: PlayerCardProps) {
  const cardWidth = featured ? CARD_WIDTH : CARD_WIDTH_SIDE;
  const levelLabel = getLevelLabel(player.skill);

  return (
    <View
      style={[
        styles.cardOuter,
        { width: cardWidth },
        featured && styles.cardOuterFeatured,
      ]}
    >
      <View style={[styles.cardGoldFrame, { width: cardWidth }]}>
        <LinearGradient
          colors={[...CARD_GRADIENT]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardInnerBorder}>
            <DiagonalStripeOverlay />
            <CornerDiamond style={styles.diamondTL} />
            <CornerDiamond style={styles.diamondTR} />
            <CornerDiamond style={styles.diamondBL} />
            <CornerDiamond style={styles.diamondBR} />

            <View style={styles.cardBanner}>
              <Text style={styles.cardBannerText}>GREEN ROOM PLAYER CARD</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.sportHeaderRow}>
                <Text style={styles.sportTitle} numberOfLines={2}>
                  {sportEmoji} {sportName.toUpperCase()}
                </Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{levelLabel}</Text>
                </View>
              </View>
              <View style={styles.goldDivider} />

              <View style={styles.photoSection}>
                <View style={styles.photoCircle}>
                  <Ionicons name="person" size={40} color={GOLD} />
                </View>
                <Text style={styles.playerName}>{player.name.toUpperCase()}</Text>
                <Text style={styles.playerMeta}>
                  {player.age} | {player.location}
                </Text>
              </View>

              <View style={styles.goldDivider} />

              <View style={styles.statsSection}>
                <StatRow icon="🎯" label="Skill" value={player.skill} />
                <StatRow icon="📅" label="Avail" value={player.availability} />
                <StatRow icon="🎪" label="Vibe" value={player.purpose} />
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  style={[styles.actionBtn, styles.messagePlanBtn]}
                  onPress={onMessageAndPlan}
                >
                  <Text style={styles.messagePlanBtnText}>Message & Plan</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.skipBtn]}
                  onPress={onSkip}
                >
                  <Text style={styles.skipBtnText}>SKIP</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <Text style={styles.statLine} numberOfLines={2}>
      <Text style={styles.statLabel}>
        {icon} {label}:{" "}
      </Text>
      <Text style={styles.statValue}>{value}</Text>
    </Text>
  );
}

type AnimatedPlayerCardProps = Omit<PlayerCardProps, "onSkip"> & {
  index: number;
  onRemoveComplete: (id: number) => void;
};

function AnimatedPlayerCard({
  index,
  onRemoveComplete,
  ...cardProps
}: AnimatedPlayerCardProps) {
  const { player, featured } = cardProps;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay: index * 90,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        delay: index * 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const handleSkip = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -140,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onRemoveComplete(player.id);
    });
  };

  return (
    <Animated.View
      style={{
        marginRight: CARD_GAP,
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
      }}
    >
      <View style={{ transform: [{ scale: featured ? 1.05 : 0.94 }] }}>
        <PlayerCard {...cardProps} onSkip={handleSkip} />
      </View>
    </Animated.View>
  );
}

export default function MatchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sport?: string;
    sportLabel?: string;
  }>();

  const [players, setPlayers] = useState<Player[]>(DUMMY_PLAYERS);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const sportDisplay = useMemo(
    () =>
      parseSportDisplay(
        params.sportLabel ?? "",
        typeof params.sport === "string" ? params.sport : ""
      ),
    [params.sportLabel, params.sport]
  );

  const selectedSportEmoji = sportDisplay.emoji;

  const openChat = useCallback(
    (player: Player) => {
      router.push({
        pathname: "/chat-conversation",
        params: {
          playerId: String(player.id),
          playerName: player.name,
          playerAge: String(player.age),
          playerLocation: player.location,
          playerSkill: player.skill,
          playerPurpose: player.purpose,
          sportEmoji: selectedSportEmoji,
        },
      });
    },
    [router, selectedSportEmoji]
  );

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP_INTERVAL);
    const clamped = Math.max(0, Math.min(index, players.length - 1));
    if (clamped !== activeIndex) setActiveIndex(clamped);
  };

  const removePlayer = (id: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    if (players.length === 0) return;
    if (activeIndex >= players.length) {
      setActiveIndex(Math.max(0, players.length - 1));
    }
  }, [players.length, activeIndex]);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBack}
            >
              <Ionicons name="chevron-back" size={24} color={GOLD} />
              <Text style={styles.headerBackText}>Back</Text>
            </Pressable>
          ),
          title: "",
          headerTitle: () => null,
          headerTintColor: GOLD,
          headerStyle: { backgroundColor: DARK_GREEN },
        }}
      />
      <SparkleBackground>
        <View style={styles.screenInner}>
          <View style={styles.topBar}>
            <Text style={styles.pageTitle}>MY MATCHES</Text>
            <Text style={styles.matchCount}>
              {players.length} Players Matched
            </Text>
          </View>

          {players.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No players left to show</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {players.map((player, index) => (
                <AnimatedPlayerCard
                  key={player.id}
                  index={index}
                  player={player}
                  sportName={sportDisplay.name}
                  sportEmoji={sportDisplay.emoji}
                  featured={index === activeIndex}
                  onMessageAndPlan={() => openChat(player)}
                  onRemoveComplete={removePlayer}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </SparkleBackground>
    </>
  );
}

const styles = StyleSheet.create({
  gradientRoot: {
    flex: 1,
  },
  screenInner: {
    flex: 1,
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBackText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "600",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 72,
  },
  pageTitle: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    color: GOLD,
    marginTop: 4,
  },
  matchCount: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: GOLD,
    marginTop: 6,
  },
  carouselContent: {
    paddingHorizontal: SIDE_PADDING,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#bbf7d0",
    fontSize: 16,
  },
  cardOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardOuterFeatured: {
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  cardGoldFrame: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GOLD,
    overflow: "hidden",
  },
  cardGradient: {
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 500,
  },
  cardInnerBorder: {
    flex: 1,
    margin: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#86efac",
    overflow: "hidden",
    minHeight: 496,
  },
  stripeOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    opacity: 1,
  },
  stripeLine: {
    position: "absolute",
    left: -80,
    width: 420,
    height: 1,
    backgroundColor: "#ffffff",
    opacity: 0.05,
    transform: [{ rotate: "-42deg" }],
  },
  cornerDiamond: {
    position: "absolute",
    width: 8,
    height: 8,
    backgroundColor: GOLD,
    transform: [{ rotate: "45deg" }],
    zIndex: 3,
  },
  diamondTL: { top: 36, left: 10 },
  diamondTR: { top: 36, right: 10 },
  diamondBL: { bottom: 12, left: 10 },
  diamondBR: { bottom: 12, right: 10 },
  cardBanner: {
    backgroundColor: DARK_GREEN,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    zIndex: 2,
  },
  cardBannerText: {
    fontSize: 8,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardBody: {
    flex: 1,
    padding: 14,
    paddingTop: 12,
    justifyContent: "space-between",
  },
  sportHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  sportTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 2,
  },
  levelBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: DARK_GREEN,
    letterSpacing: 0.3,
  },
  goldDivider: {
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.65,
    marginVertical: 10,
  },
  photoSection: {
    alignItems: "center",
  },
  photoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#065f46",
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  playerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
    textShadowColor: GOLD,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  playerMeta: {
    fontSize: 12,
    fontStyle: "italic",
    color: GOLD,
    textAlign: "center",
  },
  statsSection: {
    gap: 6,
    marginBottom: 12,
  },
  statLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  statLabel: {
    color: GOLD,
    fontWeight: "700",
  },
  statValue: {
    color: "#ffffff",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  messagePlanBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  messagePlanBtnText: {
    color: DARK_GREEN,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderColor: "#dc2626",
  },
  skipBtnText: {
    color: "#dc2626",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
