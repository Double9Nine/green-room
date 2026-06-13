import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRO_SESSION_KEY = "lastProPackSession";
const MESSAGED_KEY = "messagedPlayers";
const SKIPPED_KEY = "skippedPlayers";

const { width, height } = Dimensions.get("window");
const BASE_CARD_W = width * 0.71;
const BASE_CARD_H = height * 0.59;
const CARD_W = BASE_CARD_W * 1.08;
const CARD_H = BASE_CARD_H * 1.08;
const GOLD = "#d4af37";
const DARK_GREEN = "#052e16";
const CARD_MARGIN = 16;
const SNAP_INTERVAL = CARD_W + CARD_MARGIN;
const SIDE_PADDING = (width - CARD_W) / 2;
const PACK_W = CARD_W;
const PACK_H = CARD_H;
const FLAP_H = PACK_H * 0.28;

const PRO_PLAYERS = [
  { id: 901, name: "Carlos A.", title: "ATP Pro · World #12", sport: "tennis", sportDisplay: "Tennis", sportEmoji: "🎾", initial: "C", age: 26, location: "Manhattan, NY", skill: "4.5 (Expert)", availability: "Weekends/Eves", purpose: "Trying to level up 🏆", tags: ["Competitive", "Won't flake"], matchScore: 94, matchReasons: ["🎯 Same level", "📍 Nearby", "🕐 Schedule match"] },
  { id: 902, name: "Serena J.", title: "Grand Slam Champion", sport: "tennis", sportDisplay: "Tennis", sportEmoji: "🎾", initial: "S", age: 28, location: "Brooklyn, NY", skill: "5.0 (Pro)", availability: "Weekday Eves", purpose: "Looking for a go-to partner 🤝", tags: ["Low-key competitive", "Consistent"], matchScore: 98, matchReasons: ["🎯 Same level", "💪 Same goal"] },
  { id: 903, name: "Ben J.", title: "US Open Finalist", sport: "tennis", sportDisplay: "Tennis", sportEmoji: "🎾", initial: "B", age: 30, location: "Hoboken, NJ", skill: "5.0 (Pro)", availability: "Weekday Mornings", purpose: "Just here to vibe 😎", tags: ["Chill", "Good banter"], matchScore: 91, matchReasons: ["💪 Same goal", "📍 Nearby"] },
  { id: 904, name: "Andy M.", title: "Wimbledon Champion", sport: "tennis", sportDisplay: "Tennis", sportEmoji: "🎾", initial: "A", age: 35, location: "Manhattan, NY", skill: "5.0 (Pro)", availability: "Weekends", purpose: "Trying to level up 🏆", tags: ["Competitive", "Reliable"], matchScore: 96, matchReasons: ["🎯 Same level", "🕐 Schedule match"] },
  { id: 905, name: "Maria S.", title: "French Open Champion", sport: "tennis", sportDisplay: "Tennis", sportEmoji: "🎾", initial: "M", age: 29, location: "Jersey City, NJ", skill: "5.0 (Pro)", availability: "Weekday Eves", purpose: "Looking for a go-to partner 🤝", tags: ["Serious", "Motivated"], matchScore: 95, matchReasons: ["📍 Nearby", "💪 Same goal"] },
  { id: 906, name: "Maya R.", title: "Olympic Gold 2024", sport: "badminton", sportDisplay: "Badminton", sportEmoji: "🏸", initial: "M", age: 24, location: "Jersey City, NJ", skill: "A Level (Elite)", availability: "Weekends", purpose: "Trying to level up 🏆", tags: ["Serious", "Motivated"], matchScore: 96, matchReasons: ["🕐 Schedule match", "📍 Nearby"] },
  { id: 907, name: "Kevin L.", title: "BWF World #3", sport: "badminton", sportDisplay: "Badminton", sportEmoji: "🏸", initial: "K", age: 27, location: "Flushing, NY", skill: "A Level (Elite)", availability: "Weekends/Eves", purpose: "Trying to level up 🏆", tags: ["Elite", "Focused"], matchScore: 93, matchReasons: ["🎯 Same level", "🕐 Schedule match"] },
  { id: 908, name: "Taufik H.", title: "Olympic Gold Sydney", sport: "badminton", sportDisplay: "Badminton", sportEmoji: "🏸", initial: "T", age: 38, location: "Manhattan, NY", skill: "A Level (Elite)", availability: "Weekday Eves", purpose: "Just here to vibe 😎", tags: ["Legendary", "Chill"], matchScore: 97, matchReasons: ["🎯 Same level", "💪 Same goal"] },
  { id: 909, name: "Viktor A.", title: "BWF World #1", sport: "badminton", sportDisplay: "Badminton", sportEmoji: "🏸", initial: "V", age: 28, location: "Brooklyn, NY", skill: "A Level (Elite)", availability: "Weekends", purpose: "Trying to level up 🏆", tags: ["Elite", "Won't flake"], matchScore: 99, matchReasons: ["🎯 Same level", "📍 Nearby"] },
  { id: 910, name: "Ben J.", title: "PPA Tour Champion", sport: "pickleball", sportDisplay: "Pickleball", sportEmoji: "🥒", initial: "B", age: 31, location: "Manhattan, NY", skill: "5.0 (Pro)", availability: "Weekends/Eves", purpose: "Trying to level up 🏆", tags: ["Competitive", "Consistent"], matchScore: 92, matchReasons: ["🎯 Same level", "📍 Nearby"] },
  { id: 911, name: "Anna B.", title: "APP Tour #1", sport: "pickleball", sportDisplay: "Pickleball", sportEmoji: "🥒", initial: "A", age: 26, location: "Brooklyn, NY", skill: "5.0 (Pro)", availability: "Weekday Eves", purpose: "Looking for a go-to partner 🤝", tags: ["Elite", "Motivated"], matchScore: 95, matchReasons: ["💪 Same goal", "🕐 Schedule match"] },
  { id: 912, name: "Tyson M.", title: "PPA World Champion", sport: "pickleball", sportDisplay: "Pickleball", sportEmoji: "🥒", initial: "T", age: 33, location: "Jersey City, NJ", skill: "5.0 (Pro)", availability: "Weekends", purpose: "Trying to level up 🏆", tags: ["Competitive", "Won't flake"], matchScore: 97, matchReasons: ["🎯 Same level", "📍 Nearby"] },
  { id: 913, name: "Adam O.", title: "IFSC World Champion", sport: "bouldering", sportDisplay: "Bouldering", sportEmoji: "🧗", initial: "A", age: 25, location: "Brooklyn, NY", skill: "V10+ (Elite)", availability: "Weekday Eves", purpose: "Trying to level up 🏆", tags: ["Elite", "Motivated"], matchScore: 96, matchReasons: ["🎯 Same level", "🕐 Schedule match"] },
  { id: 914, name: "Janja G.", title: "Olympic Gold 2024", sport: "bouldering", sportDisplay: "Bouldering", sportEmoji: "🧗", initial: "J", age: 27, location: "Manhattan, NY", skill: "V10+ (Elite)", availability: "Weekends", purpose: "Looking for a go-to partner 🤝", tags: ["Legendary", "Consistent"], matchScore: 98, matchReasons: ["💪 Same goal", "📍 Nearby"] },
  { id: 915, name: "Brooke R.", title: "IFSC Boulder #2", sport: "bouldering", sportDisplay: "Bouldering", sportEmoji: "🧗", initial: "B", age: 24, location: "Hoboken, NJ", skill: "V10+ (Elite)", availability: "Weekday Eves", purpose: "Trying to level up 🏆", tags: ["Elite", "Won't flake"], matchScore: 94, matchReasons: ["🎯 Same level", "📍 Nearby"] },
  { id: 916, name: "Rory M.", title: "PGA World #1", sport: "golf", sportDisplay: "Golf", sportEmoji: "⛳", initial: "R", age: 33, location: "Manhattan, NY", skill: "+4 (Tour Pro)", availability: "Weekday Mornings", purpose: "Trying to level up 🏆", tags: ["Elite", "Serious"], matchScore: 97, matchReasons: ["🎯 Same level", "🕐 Schedule match"] },
  { id: 917, name: "Tiger W.", title: "Masters Champion", sport: "golf", sportDisplay: "Golf", sportEmoji: "⛳", initial: "T", age: 47, location: "Manhattan, NY", skill: "+5 (Tour Pro)", availability: "Weekends", purpose: "Just here to vibe 😎", tags: ["Legendary", "Focused"], matchScore: 99, matchReasons: ["💪 Same goal", "📍 Nearby"] },
  { id: 918, name: "Nelly K.", title: "LPGA World #1", sport: "golf", sportDisplay: "Golf", sportEmoji: "⛳", initial: "N", age: 24, location: "Jersey City, NJ", skill: "+3 (Tour Pro)", availability: "Weekday Eves", purpose: "Looking for a go-to partner 🤝", tags: ["Elite", "Consistent"], matchScore: 95, matchReasons: ["🎯 Same level", "📍 Nearby"] },
  { id: 919, name: "Eliud K.", title: "Marathon World Record", sport: "running", sportDisplay: "Running", sportEmoji: "🏃", initial: "E", age: 38, location: "Manhattan, NY", skill: "4:35/mi (Elite)", availability: "Weekday Mornings", purpose: "Trying to level up 🏆", tags: ["Legendary", "Motivated"], matchScore: 98, matchReasons: ["🎯 Same level", "🕐 Schedule match"] },
  { id: 920, name: "Sifan H.", title: "Olympic Triple Gold", sport: "running", sportDisplay: "Running", sportEmoji: "🏃", initial: "S", age: 30, location: "Brooklyn, NY", skill: "4:50/mi (Elite)", availability: "Weekends", purpose: "Keeping it moving 🏃", tags: ["Elite", "Consistent"], matchScore: 96, matchReasons: ["💪 Same goal", "📍 Nearby"] },
  { id: 921, name: "Sha'Carri R.", title: "World Sprint Champion", sport: "running", sportDisplay: "Running", sportEmoji: "🏃", initial: "S", age: 23, location: "Manhattan, NY", skill: "Sprint Elite", availability: "Weekday Eves", purpose: "Trying to level up 🏆", tags: ["Electric", "Won't flake"], matchScore: 97, matchReasons: ["🎯 Same level", "📍 Nearby"] },
];

export default function ProPackOpening() {
  const router = useRouter();
  const { sport } = useLocalSearchParams<{ sport: string }>();
  const [stage, setStage] = useState<"pack" | "cards" | "gallery">("pack");
  const [activated, setActivated] = useState(false);
  const [selectedPros, setSelectedPros] = useState<typeof PRO_PLAYERS>([]);
  const [curCard, setCurCard] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [galIdx, setGalIdx] = useState(0);

  const flapAnim = useRef(new Animated.Value(0)).current;
  const scissorX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(40)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const navOpacity = useRef(new Animated.Value(0)).current;
  const openedRef = useRef(false);
  const galScrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadSession = async () => {
      const raw = await AsyncStorage.getItem(PRO_SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw) as { selectedPros: typeof PRO_PLAYERS };
      setSelectedPros(session.selectedPros);
      setStage("gallery");
    };
    void loadSession();
  }, []);

  const handleBack = async () => {
    await AsyncStorage.removeItem(PRO_SESSION_KEY);
    router.back();
  };

  const handleProMessage = async (pro: (typeof PRO_PLAYERS)[0]) => {
    const raw = await AsyncStorage.getItem(MESSAGED_KEY);
    const messaged = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    messaged[pro.id] = Date.now();
    await AsyncStorage.setItem(MESSAGED_KEY, JSON.stringify(messaged));
    router.push({
      pathname: "/chat-conversation",
      params: {
        playerId: String(pro.id),
        playerName: pro.name,
        playerAge: String(pro.age),
        playerLocation: pro.location,
        playerSkill: pro.skill,
        playerPurpose: pro.purpose,
        playerGamesPlayed: "0",
        sportEmoji: pro.sportEmoji,
        isProPlayer: "true",
        playerTitle: pro.title,
      },
    });
  };

  const handleProSkip = async (pro: (typeof PRO_PLAYERS)[0]) => {
    const raw = await AsyncStorage.getItem(SKIPPED_KEY);
    const skipped = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    skipped[pro.id] = Date.now();
    await AsyncStorage.setItem(SKIPPED_KEY, JSON.stringify(skipped));
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const triggerOpen = useCallback(() => {
    if (openedRef.current) return;
    openedRef.current = true;

    Animated.timing(flapAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      const sportKey = typeof sport === "string" ? sport : "tennis";
      const filtered = PRO_PLAYERS.filter((p) => p.sport === sportKey);
      const pool = filtered.length >= 3 ? filtered : PRO_PLAYERS;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      setSelectedPros(shuffled.slice(0, 3));
      setCurCard(0);
      setCardFlipped(false);
      flipAnim.setValue(0);
      navOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardTranslate.setValue(40);
      setTimeout(() => {
        setStage("cards");
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(cardTranslate, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }, 300);
    });
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 1,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, g) => {
      if (!activated) setActivated(true);
      if (g.dx > 0) {
        const p = Math.max(0, Math.min(1, g.dx / 100));
        flapAnim.setValue(p);
        scissorX.setValue(p * PACK_W);
        if (p > 0.5 && !openedRef.current) triggerOpen();
      }
    },
    onPanResponderRelease: (_, g) => {
      if (!openedRef.current && g.dx / 100 < 0.5) {
        Animated.spring(flapAnim, { toValue: 0, useNativeDriver: true }).start();
        Animated.spring(scissorX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const flapRotate = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-115deg"],
  });
  const flapOpacity = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  const flipCard = () => {
    if (cardFlipped) return;
    setCardFlipped(true);
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(navOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const nextCard = () => {
    if (curCard < 2) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslate, {
          toValue: -30,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurCard((c) => c + 1);
        setCardFlipped(false);
        flipAnim.setValue(0);
        navOpacity.setValue(0);
        cardTranslate.setValue(40);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(cardTranslate, {
            toValue: 0,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      void AsyncStorage.setItem(
        PRO_SESSION_KEY,
        JSON.stringify({
          sport: typeof sport === "string" ? sport : "tennis",
          selectedPros,
          timestamp: Date.now(),
        })
      );
      setStage("gallery");
      setGalIdx(0);
    }
  };

  const renderCardInner = (
    pro: (typeof PRO_PLAYERS)[0],
    showActions: boolean
  ) => (
    <View
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: GOLD,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={["#6b4900", "#c8980a", "#8a6400", "#d4af37"]}
        style={{ flex: 1, borderRadius: 18, overflow: "hidden", minHeight: CARD_H }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View
          style={{
            flex: 1,
            margin: 2,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(255,243,192,0.5)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(26,10,0,0.6)",
              paddingVertical: 6,
              paddingHorizontal: 8,
              alignItems: "center",
              zIndex: 2,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "800",
                color: GOLD,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              ★ GREEN ROOM PRO CARD ★
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              padding: 14,
              paddingTop: 12,
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(212,175,55,0.2)",
                borderWidth: 0.5,
                borderColor: GOLD,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 3,
                alignSelf: "center",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: GOLD,
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                }}
              >
                ⭐ GREAT MATCH
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 22,
                  fontWeight: "800",
                  color: "#ffffff",
                  letterSpacing: 0.5,
                }}
              >
                {pro.sportEmoji} {pro.sportDisplay.toUpperCase()}
              </Text>
              <View
                style={{
                  backgroundColor: GOLD,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "800",
                    color: "#052e16",
                    letterSpacing: 0.3,
                  }}
                >
                  PRO
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: GOLD,
                opacity: 0.65,
                marginVertical: 10,
              }}
            />

            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(61,42,0,0.5)",
                  borderWidth: 2,
                  borderColor: GOLD,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: GOLD, fontSize: 36, fontWeight: "800" }}>
                  {pro.initial}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: showActions ? 18 : 20,
                  fontWeight: "800",
                  color: "#ffffff",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {pro.name}
              </Text>
              <Text
                style={{
                  fontSize: showActions ? 12 : 13,
                  fontStyle: "italic",
                  color: GOLD,
                  textAlign: "center",
                }}
              >
                {pro.title}
              </Text>
              <Text
                style={{
                  fontSize: showActions ? 12 : 13,
                  fontStyle: "italic",
                  color: GOLD,
                  textAlign: "center",
                }}
              >
                {pro.age} | {pro.location}
              </Text>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: GOLD,
                opacity: 0.65,
                marginVertical: 10,
              }}
            />

            <View style={{ gap: 6, marginBottom: showActions ? 12 : 0 }}>
              <Text style={{ fontSize: showActions ? 13 : 14, color: "#d4af37" }}>
                🎯{" "}
                <Text style={{ fontWeight: "700", color: GOLD }}>Skill: </Text>
                <Text style={{ color: "#ffffff" }}>{pro.skill}</Text>
              </Text>
              <Text style={{ fontSize: showActions ? 13 : 14, color: "#d4af37" }}>
                📅{" "}
                <Text style={{ fontWeight: "700", color: GOLD }}>Avail: </Text>
                <Text style={{ color: "#ffffff" }}>{pro.availability}</Text>
              </Text>
              <View
                style={{
                  backgroundColor: "rgba(212,175,55,0.15)",
                  borderWidth: 0.5,
                  borderColor: GOLD,
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  alignSelf: "flex-start",
                }}
              >
                <Text
                  style={{
                    color: GOLD,
                    fontSize: showActions ? 12 : 13,
                    fontWeight: "700",
                  }}
                >
                  {pro.purpose}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {pro.tags.map((t, i) => (
                  <View
                    key={i}
                    style={{
                      borderWidth: 1,
                      borderColor: GOLD,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: GOLD, fontSize: showActions ? 10 : 11 }}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 4,
                marginBottom: showActions ? 8 : 0,
              }}
            >
              {pro.matchReasons.map((r, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: "rgba(61,42,0,0.4)",
                    borderWidth: 0.5,
                    borderColor: "rgba(212,175,55,0.4)",
                    borderRadius: 10,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: GOLD,
                      fontSize: showActions ? 9 : 10,
                      fontWeight: "600",
                    }}
                  >
                    {r}
                  </Text>
                </View>
              ))}
            </View>

            {showActions && (
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  onPress={() => void handleProMessage(pro)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: GOLD,
                  }}
                >
                  <Text
                    style={{
                      color: "#052e16",
                      fontSize: 9,
                      fontWeight: "800",
                      letterSpacing: 0.3,
                    }}
                  >
                    Message & Plan
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleProSkip(pro)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: "#dc2626",
                  }}
                >
                  <Text
                    style={{
                      color: "#dc2626",
                      fontSize: 8,
                      fontWeight: "800",
                      letterSpacing: 0.3,
                    }}
                  >
                    SKIP
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderProCard = (pro: (typeof PRO_PLAYERS)[0]) =>
    renderCardInner(pro, false);

  const renderProCardWithActions = (pro: (typeof PRO_PLAYERS)[0]) =>
    renderCardInner(pro, true);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => void handleBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={GOLD} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      {stage === "pack" && (
        <View style={styles.packStage}>
          <Text style={styles.stageTitle}>PRO PACK</Text>
          <Text style={styles.stageSub}>3 exclusive player cards inside</Text>

          <View style={styles.packScene}>
            <View style={styles.packGroup} {...panResponder.panHandlers}>
              <LinearGradient
                colors={["#2d1a00", "#1a0a00", "#0a0400"]}
                style={styles.packBody}
              >
                <View style={styles.packBodyContent}>
                  <Text style={styles.packStar}>★</Text>
                  <Text style={styles.packBrand}>GREEN ROOM</Text>
                  <Text style={styles.packEdition}>PRO EDITION</Text>
                  <View style={styles.packDivider} />
                  <Text style={styles.packCards}>3 CARDS</Text>
                </View>
              </LinearGradient>

              <Animated.View
                style={[
                  styles.packFlap,
                  {
                    transform: [
                      { perspective: 800 },
                      { rotateY: flapRotate },
                    ],
                    opacity: flapOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={["#3d2000", "#2d1500", "#1a0900"]}
                  style={styles.packFlapInner}
                >
                  <Text style={styles.packPullText}>PULL TO OPEN ↓</Text>
                </LinearGradient>
              </Animated.View>

              <View
                style={styles.tearLineRow}
                pointerEvents="none"
              >
                <Animated.View
                  style={[
                    styles.scissorIcon,
                    { transform: [{ translateX: scissorX }] },
                  ]}
                >
                  <Ionicons name="cut" size={26} color={GOLD} />
                </Animated.View>
              </View>
            </View>
          </View>

          <Text style={styles.swipeHint}>Swipe right to open ✂️</Text>

          <Pressable
            style={styles.openBtn}
            onPress={() => setActivated(true)}
          >
            <Text style={styles.openBtnText}>Open Pro Pack</Text>
          </Pressable>
        </View>
      )}

      {stage === "cards" && selectedPros.length > 0 && (
        <View style={styles.cardStage}>
          <Text style={styles.stageTitle}>Card {curCard + 1} of 3</Text>
          <Text style={styles.stageSub}>
            {cardFlipped ? selectedPros[curCard].title : "Tap to reveal"}
          </Text>

          <Pressable onPress={flipCard} activeOpacity={0.95}>
            <Animated.View
              style={[
                styles.cardShell,
                {
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslate }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.cardFace,
                  styles.cardBack,
                  {
                    transform: [
                      { perspective: 900 },
                      { rotateY: backInterpolate },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["#2d1a00", "#1a0a00"]}
                  style={styles.cardBackGradient}
                >
                  <Text style={{ fontSize: 44, color: GOLD, lineHeight: 52 }}>★</Text>
                  <Text style={styles.packBrand}>GREEN ROOM</Text>
                  <Text style={styles.packEdition}>PRO CARD</Text>
                  <Text style={[styles.packEdition, { marginTop: 16 }]}>
                    TAP TO REVEAL
                  </Text>
                </LinearGradient>
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardFace,
                  {
                    transform: [
                      { perspective: 900 },
                      { rotateY: frontInterpolate },
                    ],
                  },
                ]}
              >
                {renderProCard(selectedPros[curCard])}
              </Animated.View>
            </Animated.View>
          </Pressable>

          <Animated.View style={[styles.navRow, { opacity: navOpacity }]}>
            <Pressable style={styles.nextBtn} onPress={nextCard}>
              <Text style={styles.nextBtnText}>
                {curCard < 2 ? "Next Card" : "See All Cards"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {stage === "gallery" && (
        <View style={styles.galleryStage}>
          <View style={{ position: "absolute", top: 0, alignItems: "center" }}>
            <Text style={styles.stageTitle}>YOUR PRO MATCHES</Text>
            <Text style={styles.stageSub}>Swipe to browse</Text>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_W + CARD_MARGIN * 2}
            contentContainerStyle={{
              paddingHorizontal: SIDE_PADDING,
              paddingVertical: 20,
              alignItems: "center",
              gap: CARD_MARGIN,
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: galScrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / (CARD_W + CARD_MARGIN)
              );
              setGalIdx(Math.max(0, Math.min(selectedPros.length - 1, idx)));
            }}
            style={{ width }}
          >
            {selectedPros.map((pro, index) => {
              const inputRange = [
                (index - 1) * (CARD_W + CARD_MARGIN),
                index * (CARD_W + CARD_MARGIN),
                (index + 1) * (CARD_W + CARD_MARGIN),
              ];
              const scale = galScrollX.interpolate({
                inputRange,
                outputRange: [0.82, 1.08, 0.82],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={index}
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    transform: [{ scale }],
                  }}
                >
                  {renderProCardWithActions(pro)}
                </Animated.View>
              );
            })}
          </ScrollView>

          <View style={styles.dotsRow}>
            {selectedPros.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === galIdx ? 20 : 8,
                    backgroundColor:
                      i === galIdx ? GOLD : "rgba(212,175,55,0.3)",
                  },
                ]}
              />
            ))}
          </View>

          <Pressable
            style={[styles.openBtn, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.openBtnText}>View My Matches</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DARK_GREEN },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: GOLD, fontSize: 16, fontWeight: "600" },
  packStage: { flex: 1, alignItems: "center", paddingTop: 12 },
  cardStage: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 20 },
  galleryStage: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 30 },
  stageTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 4,
  },
  stageSub: {
    color: "rgba(134,239,172,0.7)",
    fontSize: 11,
    marginBottom: 24,
  },
  packScene: { alignItems: "center", marginBottom: 16 },
  packGroup: { width: PACK_W, height: PACK_H, position: "relative" },
  packBody: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: PACK_W,
    height: PACK_H - FLAP_H + 10,
    borderWidth: 2,
    borderColor: GOLD,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  packBodyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  packStar: { color: GOLD, fontSize: 40, lineHeight: 44 },
  packBrand: { color: GOLD, fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  packEdition: { color: "rgba(212,175,55,0.45)", fontSize: 9, letterSpacing: 1 },
  packDivider: {
    width: 50,
    height: 0.5,
    backgroundColor: GOLD,
    opacity: 0.4,
    marginVertical: 2,
  },
  packCards: { color: "rgba(212,175,55,0.35)", fontSize: 9 },
  packFlap: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PACK_W,
    height: FLAP_H,
    zIndex: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  packFlapInner: {
    flex: 1,
    borderWidth: 2,
    borderColor: GOLD,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  packPullText: {
    color: "rgba(212,175,55,0.45)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  tearLineRow: {
    position: "absolute",
    top: FLAP_H - 7,
    left: 0,
    right: 0,
    height: 14,
    borderTopWidth: 1.5,
    borderColor: "rgba(212,175,55,0.35)",
    borderStyle: "dashed",
    zIndex: 20,
  },
  scissorIcon: { position: "absolute", top: -14, left: 0 },
  swipeHint: {
    color: "rgba(212,175,55,0.65)",
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  openBtn: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  openBtnText: { color: DARK_GREEN, fontSize: 14, fontWeight: "700" },
  cardShell: { width: CARD_W, height: CARD_H, position: "relative" },
  cardFace: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CARD_W,
    height: CARD_H,
    backfaceVisibility: "hidden",
    borderRadius: 20,
    overflow: "hidden",
  },
  cardBack: { zIndex: 1, overflow: "visible" },
  cardBackGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "visible",
  },
  navRow: { marginTop: 16 },
  nextBtn: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  nextBtnText: { color: DARK_GREEN, fontSize: 13, fontWeight: "700" },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: -8,
    marginBottom: 0,
  },
  dot: { height: 8, borderRadius: 4 },
});
