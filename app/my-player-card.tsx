import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
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

import { PROFILE_SPORTS } from "@/constants/skillLevels";
import {
    loadUserProfile,
    type UserProfile,
} from "@/lib/profileStorage";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.88;
const CARD_MIN_HEIGHT = height * 0.58;
const CARD_HEIGHT = CARD_MIN_HEIGHT;

const GOLD = "#d4af37";
const DARK_GREEN = "#052e16";
const BG_GRADIENT = ["#052e16", "#14532d", "#166534"] as const;
const CARD_GRADIENT = ["#064e3b", "#065f46", "#047857"] as const;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const TIME_NAMES = ["Mornings", "Afternoons", "Evenings"] as const;

const TILT_X = "8deg";

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

function getSportMeta(sportId: string) {
  return PROFILE_SPORTS.find((s) => s.id === sportId) ?? PROFILE_SPORTS[0];
}

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

function formatAvailabilitySummary(slots: string[]): string {
  if (slots.length === 0) return "Not set";

  const byTime: string[][] = [[], [], []];
  for (const key of slots) {
    const [dayStr, timeStr] = key.split("-");
    const day = Number(dayStr);
    const time = Number(timeStr);
    if (
      Number.isNaN(day) ||
      Number.isNaN(time) ||
      day < 0 ||
      day > 6 ||
      time < 0 ||
      time > 2
    ) {
      continue;
    }
    const dayName = DAY_NAMES[day];
    if (!byTime[time].includes(dayName)) {
      byTime[time].push(dayName);
    }
  }

  const parts: string[] = [];
  for (let t = 0; t < 3; t += 1) {
    if (byTime[t].length > 0) {
      parts.push(`${byTime[t].join(", ")} · ${TIME_NAMES[t]}`);
    }
  }

  return parts.length > 0 ? parts.join("  |  ") : "Not set";
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

function DiagonalStripeOverlay() {
  return (
    <View style={styles.stripeOverlay} pointerEvents="none">
      {Array.from({ length: 24 }).map((_, i) => (
        <View key={i} style={[styles.stripeLine, { top: i * 14 - 40 }]} />
      ))}
    </View>
  );
}

function CornerDiamond({ style }: { style: object }) {
  return <View style={[styles.cornerDiamond, style]} />;
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
    <Text style={styles.statLine} numberOfLines={3}>
      <Text style={styles.statLabel}>
        {icon} {label}:{" "}
      </Text>
      <Text style={styles.statValue}>{value}</Text>
    </Text>
  );
}

type FlippableAllStarCardProps = {
  profile: UserProfile;
};

function FlippableAllStarCard({ profile }: FlippableAllStarCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.timing(flipAnim, {
      toValue,
      duration: 1100,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-180deg", "0deg"],
  });

  const flipTransform = (rotateY: Animated.AnimatedInterpolation<string>) => [
    { perspective: 600 },
    { rotateY },
    { rotateX: TILT_X },
  ];

  return (
    <View style={styles.flipStage}>
      <Pressable onPress={handleFlip}>
        <View
          style={[
            styles.flipCardContainer,
            { width: CARD_WIDTH, height: CARD_HEIGHT },
          ]}
        >
          <Animated.View
            style={[
              styles.flipFaceFront,
              { transform: flipTransform(frontRotate) },
            ]}
          >
            <AllStarCard profile={profile} />
          </Animated.View>

          <Animated.View
            style={[
              styles.flipFaceBack,
              { transform: flipTransform(backRotate) },
            ]}
          >
            <View style={[styles.backCorner, styles.backCornerTL]} />
            <View style={[styles.backCorner, styles.backCornerTR]} />
            <View style={[styles.backCorner, styles.backCornerBL]} />
            <View style={[styles.backCorner, styles.backCornerBR]} />
            <Text style={styles.backStar}>⭐</Text>
            <Text style={styles.backTitle}>GREEN ROOM</Text>
            <Text style={styles.backSubtitle}>ALL-STAR PLAYER</Text>
          </Animated.View>
        </View>
      </Pressable>

      <Text style={styles.flipHint}>Tap to flip</Text>
    </View>
  );
}

function AllStarCard({ profile }: { profile: UserProfile }) {
  const sport = getSportMeta(profile.sport);
  const levelLabel = getLevelLabel(profile.skillLevel || "");
  const displayName = profile.name.trim() || "Your Name";
  const locationText = profile.location.trim() || "Add your location";
  const skillText = profile.skillLevel.trim() || "Add your skill level";
  const availabilityText = formatAvailabilitySummary(profile.availability);

  return (
    <View style={[styles.cardOuter, { width: CARD_WIDTH }]}>
      <View style={[styles.cardGoldFrame, { width: CARD_WIDTH }]}>
        <LinearGradient
          colors={[...CARD_GRADIENT]}
          style={[styles.cardGradient, { minHeight: CARD_MIN_HEIGHT }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.cardInnerBorder, { minHeight: CARD_MIN_HEIGHT - 4 }]}>
            <DiagonalStripeOverlay />
            <CornerDiamond style={styles.diamondTL} />
            <CornerDiamond style={styles.diamondTR} />
            <CornerDiamond style={styles.diamondBL} />
            <CornerDiamond style={styles.diamondBR} />

            <View style={styles.cardBanner}>
              <Text style={styles.cardBannerText}>GREEN ROOM ALL-STAR CARD</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.sportHeaderRow}>
                <Text style={styles.sportTitle} numberOfLines={2}>
                  {sport.emoji} {sport.label.toUpperCase()}
                </Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{levelLabel}</Text>
                </View>
              </View>
              <View style={styles.goldDivider} />

              <View style={styles.photoSection}>
                <View style={styles.photoCircle}>
                  {profile.photo ? (
                    <Image
                      source={{ uri: profile.photo }}
                      style={styles.photoImage}
                    />
                  ) : (
                    <Ionicons name="person" size={40} color={GOLD} />
                  )}
                </View>
                <Text style={styles.playerName}>{displayName.toUpperCase()}</Text>
                <Text style={styles.playerMeta}>{locationText}</Text>
              </View>

              <View style={styles.goldDivider} />

              <View style={styles.statsSection}>
                <StatRow icon="🎯" label="Skill" value={skillText} />
                <StatRow icon="📅" label="Avail" value={availabilityText} />

                <View style={styles.profileFieldsSection}>
                  <Text style={styles.fieldHeading}>Purpose</Text>
                  <View style={styles.purposePill}>
                    <Text style={styles.purposePillText} numberOfLines={2}>
                      {profile.purpose.trim() || "—"}
                    </Text>
                  </View>

                  <Text style={styles.fieldHeading}>Vibe</Text>
                  {profile.tags.length > 0 ? (
                    <View style={styles.tagsRow}>
                      {profile.tags.map((tag) => (
                        <View key={tag} style={styles.tagPill}>
                          <Text style={styles.tagPillText} numberOfLines={1}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.statLine}>
                      <Text style={styles.statValue}>—</Text>
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

export default function MyPlayerCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadUserProfile().then(setProfile);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast("");
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[...BG_GRADIENT]}
        style={styles.gradientRoot}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {SPARKLE_POSITIONS.map((s, i) => (
          <SparkleDot key={i} {...s} delay={i * 120} />
        ))}

        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.headerBtn}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={GOLD} />
              <Text style={styles.headerBtnText}>Back</Text>
            </Pressable>

            <Pressable
              onPress={() => showToast("Share coming soon!")}
              style={styles.headerBtn}
              hitSlop={12}
            >
              <Ionicons name="share-outline" size={22} color={GOLD} />
              <Text style={styles.headerBtnText}>Share</Text>
            </Pressable>
          </View>

          <Text style={styles.pageTitle}>MY ALL-STAR CARD ⭐</Text>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {profile ? <FlippableAllStarCard profile={profile} /> : null}
          </ScrollView>

          {toast ? (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradientRoot: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 72,
  },
  headerBtnText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "600",
  },
  pageTitle: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    color: GOLD,
    letterSpacing: 0.5,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  flipStage: {
    alignItems: "center",
    justifyContent: "center",
  },
  flipCardContainer: {
    position: "relative",
  },
  flipFaceFront: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
  },
  flipFaceBack: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    backgroundColor: DARK_GREEN,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: -8, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
  },
  backCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: GOLD,
  },
  backCornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  backCornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  backCornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  backCornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  backStar: {
    fontSize: 60,
  },
  backTitle: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: 16,
  },
  backSubtitle: {
    color: "#86efac",
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 8,
  },
  flipHint: {
    color: GOLD,
    fontSize: 13,
    opacity: 0.7,
    marginTop: 40,
    letterSpacing: 1,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 12,
    zIndex: 9999,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  cardOuter: {
    alignItems: "center",
    justifyContent: "center",
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
  },
  cardInnerBorder: {
    flex: 1,
    margin: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#86efac",
    overflow: "hidden",
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
    paddingBottom: 18,
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
    overflow: "hidden",
  },
  photoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
    marginTop: 4,
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
    maxWidth: "100%",
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
});
