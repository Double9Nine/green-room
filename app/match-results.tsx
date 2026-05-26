import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMatchSport } from "@/constants/matchSports";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.71;
const CARD_HEIGHT = height * 0.59;
const CARD_MARGIN = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Player>);

const GOLD = "#d4af37";
const DARK_GREEN = "#052e16";

const TABS = [
  { name: "Match", icon: "tennisball-outline", route: "/(tabs)/match" },
  { name: "Explore", icon: "compass-outline", route: "/(tabs)/explore" },
  { name: "Chat", icon: "chatbubble-outline", route: "/(tabs)/chat" },
  { name: "Profile", icon: "person-outline", route: "/(tabs)/profile" },
] as const;
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
  tags: string[];
  photo: string | null;
  gamesPlayed: number;
};

const DUMMY_PLAYERS: Player[] = [
  {
    id: 1,
    name: "Alex J.",
    age: 28,
    location: "Jersey City, NJ",
    skill: "3.5 (Intermediate)",
    availability: "Weekends/Eves",
    purpose: "Trying to level up 🏆",
    tags: ["Low-key competitive", "Won't flake"],
    photo: null,
    gamesPlayed: 12,
  },
  {
    id: 2,
    name: "Sarah M.",
    age: 31,
    location: "Manhattan, NY",
    skill: "3.0 (Advanced Beginner)",
    availability: "Weekday Eves",
    purpose: "Looking for my go-to partner 🤝",
    tags: ["Chill vibes only", "Good banter"],
    photo: null,
    gamesPlayed: 8,
  },
  {
    id: 3,
    name: "Maria L.",
    age: 26,
    location: "Hoboken, NJ",
    skill: "4.0 (Intermediate+)",
    availability: "Weekends",
    purpose: "Just here to meet people 😎",
    tags: ["Social cardio", "Shows up"],
    photo: null,
    gamesPlayed: 21,
  },
  {
    id: 4,
    name: "James K.",
    age: 33,
    location: "Brooklyn, NY",
    skill: "2.5 (Beginner+)",
    availability: "Mornings",
    purpose: "Just trying to stay active 🏃",
    tags: ["Beginner-friendly", "No pressure"],
    photo: null,
    gamesPlayed: 5,
  },
  {
    id: 5,
    name: "Lisa C.",
    age: 29,
    location: "Queens, NY",
    skill: "3.5 (Intermediate)",
    availability: "Flexible",
    purpose: "Trying to level up 🏆",
    tags: ["Down for a challenge", "Chatty", "Won't flake"],
    photo: null,
    gamesPlayed: 17,
  },
  {
    id: 6,
    name: "David W.",
    age: 35,
    location: "Weehawken, NJ",
    skill: "4.5 (Advanced)",
    availability: "Weekends",
    purpose: "Looking for my go-to partner 🤝",
    tags: ["Low-key competitive", "Shows up"],
    photo: null,
    gamesPlayed: 34,
  },
  {
    id: 7,
    name: "Emma R.",
    age: 24,
    location: "Union City, NJ",
    skill: "2.0 (Beginner)",
    availability: "Evenings",
    purpose: "Just here to meet people 😎",
    tags: ["Chill vibes only", "Beginner-friendly"],
    photo: null,
    gamesPlayed: 3,
  },
  {
    id: 8,
    name: "Chris T.",
    age: 30,
    location: "Fort Lee, NJ",
    skill: "3.0 (Advanced Beginner)",
    availability: "Weekends/Eves",
    purpose: "Other ✨",
    tags: ["Good banter", "No pressure", "Social cardio"],
    photo: null,
    gamesPlayed: 9,
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
  const levelLabel = getLevelLabel(player.skill);

  return (
    <View
      style={[
        styles.cardOuter,
        { width: CARD_WIDTH, height: CARD_HEIGHT },
        featured && styles.cardOuterFeatured,
      ]}
    >
      <View
        style={[
          styles.cardGoldFrame,
          { width: CARD_WIDTH, height: CARD_HEIGHT },
        ]}
      >
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
                <PlayerPurposeAndTags player={player} />
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

function formatTagsLine(tags: string[]) {
  if (tags.length === 0) return "—";
  const visible = tags.slice(0, 2);
  const line = visible.join(" • ");
  if (tags.length > 2) {
    return `${line} • +${tags.length - 2} more`;
  }
  return line;
}

function PlayerPurposeAndTags({ player }: { player: Player }) {
  const visibleTags = player.tags.slice(0, 2);
  const extraTagCount = Math.max(0, player.tags.length - visibleTags.length);

  return (
    <View style={styles.profileFieldsSection}>
      <Text style={styles.fieldHeading}>Purpose</Text>
      <View style={styles.purposePill}>
        <Text style={styles.purposePillText} numberOfLines={2}>
          {player.purpose || "—"}
        </Text>
      </View>

      <Text style={styles.fieldHeading}>Vibe</Text>
      {visibleTags.length > 0 ? (
        <View style={styles.tagsRow}>
          {visibleTags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagPillText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
          {extraTagCount > 0 ? (
            <Text style={styles.moreTagsText}>+{extraTagCount} more</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.statLine}>
          <Text style={styles.statValue}>{formatTagsLine(player.tags)}</Text>
        </Text>
      )}
    </View>
  );
}

type AnimatedPlayerCardProps = Omit<PlayerCardProps, "onSkip"> & {
  index: number;
  scrollX: Animated.Value;
  onRemoveComplete: (id: number) => void;
};

function AnimatedPlayerCard({
  index,
  scrollX,
  onRemoveComplete,
  ...cardProps
}: AnimatedPlayerCardProps) {
  const { player } = cardProps;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const skipScale = useRef(new Animated.Value(1)).current;

  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const carouselScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.82, 1.08, 0.82],
    extrapolate: "clamp",
  });

  const scale = Animated.multiply(carouselScale, skipScale);

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
      Animated.timing(skipScale, {
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
        width: CARD_WIDTH,
        transform: [{ translateX }, { translateY }],
        opacity,
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <PlayerCard {...cardProps} onSkip={handleSkip} />
      </Animated.View>
    </Animated.View>
  );
}

export default function MatchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    sport?: string;
    sportLabel?: string;
  }>();

  const [players, setPlayers] = useState<Player[]>(DUMMY_PLAYERS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPurpose, setUserPurpose] = useState("");
  const [userTags, setUserTags] = useState<string[]>([]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Player>>(null);

  useEffect(() => {
    void AsyncStorage.getItem("userProfile").then((val) => {
      if (val) {
        const p = JSON.parse(val) as { purpose?: string; tags?: string[] };
        setUserPurpose(p.purpose || "");
        setUserTags(Array.isArray(p.tags) ? p.tags : []);
      }
    });
  }, []);

  const snapOffsets = useMemo(
    () => players.map((_, i) => i * SNAP_INTERVAL),
    [players.length]
  );

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
          playerGamesPlayed: String(player.gamesPlayed),
          sportEmoji: selectedSportEmoji,
        },
      });
    },
    [router, selectedSportEmoji]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / SNAP_INTERVAL);
      const clamped = Math.max(0, Math.min(index, players.length - 1));
      if (clamped !== activeIndex) setActiveIndex(clamped);
    },
    [activeIndex, players.length]
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: handleScroll,
      }),
    [scrollX, handleScroll]
  );

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
            <View style={styles.carouselWrap}>
              <AnimatedFlatList
                ref={listRef}
                data={players}
                keyExtractor={(item) => String(item.id)}
                extraData={activeIndex}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToOffsets={snapOffsets}
                decelerationRate="fast"
                disableIntervalMomentum
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={{ width }}
                contentContainerStyle={{
                  paddingHorizontal: SIDE_PADDING,
                  paddingVertical: 20,
                  paddingBottom: 120,
                  alignItems: "center",
                }}
                ItemSeparatorComponent={() => (
                  <View style={{ width: CARD_MARGIN }} />
                )}
                renderItem={({ item, index }) => (
                  <AnimatedPlayerCard
                    index={index}
                    scrollX={scrollX}
                    player={item}
                    sportName={sportDisplay.name}
                    sportEmoji={sportDisplay.emoji}
                    featured={index === activeIndex}
                    onMessageAndPlan={() => openChat(item)}
                    onRemoveComplete={removePlayer}
                  />
                )}
              />
            </View>
          )}
        </View>

        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.name}
              onPress={() => router.push(tab.route)}
              style={styles.tabBarItem}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={GOLD}
              />
              <Text style={styles.tabBarLabel}>{tab.name}</Text>
            </Pressable>
          ))}
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
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DARK_GREEN,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(212,175,55,0.3)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabBarItem: {
    alignItems: "center",
    gap: 4,
  },
  tabBarLabel: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "600",
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
  carouselWrap: {
    width,
    alignSelf: "center",
    marginTop: 40,
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
    minHeight: CARD_HEIGHT,
  },
  cardInnerBorder: {
    flex: 1,
    margin: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#86efac",
    overflow: "hidden",
    minHeight: CARD_HEIGHT - 4,
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
  profileFieldsSection: {
    gap: 6,
    marginTop: 2,
  },
  fieldHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: GOLD,
  },
  purposePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.22)",
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  purposePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: GOLD,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  tagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.55)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "48%",
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  moreTagsText: {
    fontSize: 10,
    fontWeight: "700",
    color: GOLD,
    fontStyle: "italic",
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
