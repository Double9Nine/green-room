import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  RUNNING_SKILL_LEVELS_KM,
  RUNNING_SKILL_LEVELS_MI,
  SKILL_LEVEL_REFERENCE_URLS,
  SKILL_LEVELS,
  SPORTS,
} from "@/constants/skillLevels";
import { mergeUserProfile } from "@/lib/profileStorage";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const BORDER = "#e2e8f0";
const ACCENT_DARK = "#15803d";
const BORDER_SOFT = "#bbf7d0";
const BORDER_CARD = "#dcfce7";
const CONTENT_TEXT = "#0f172a";

const GENDER_OPTIONS = [
  "Everyone Welcome 🤝",
  "Prefer Men",
  "Prefer Women",
  "Mixed groups only",
] as const;

const PURPOSE_OPTIONS = [
  "Level Up My Game 🏆",
  "Here for the Vibes 😎",
  "Ride or Die Partner 🤝",
  "Keeping It Moving 🏃",
  "Something Else ✨",
] as const;

const MATCH_LEVEL_OPTIONS = [
  "Same level",
  "±1 level",
  "Any level",
] as const;

const MATCH_LEVEL_SPORT_IDS = ["tennis", "badminton", "pickleball", "golf"] as const;

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TIMES = ["Mor", "Aft", "Eve"];

const GOLF_SCENE_LABELS: Record<string, string> = {
  driving_range: "Driving range only",
  "9_hole": "9-hole round",
  "18_hole": "18-hole round",
  either: "Either",
};

const RUNNING_SCENE_LABELS: Record<string, string> = {
  easy: "Easy Runs",
  "5k_10k": "5K / 10K",
  half_full: "Half Marathon / Marathon",
};

type SportItem = (typeof SPORTS)[number];

function paramString(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return String(value[0]);
  return undefined;
}

const DISTANCE_TICKS = [1, 10, 25, 50] as const;
const AGE_TICKS = [18, 30, 45, 60] as const;

const TRACK_CLEAR =
  Platform.OS === "android" ? "#00000000" : "transparent";

type SliderWithScaleProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  tickValues: readonly number[];
  formatTick?: (n: number) => string;
};

function SliderWithScale({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  tickValues,
  formatTick = (n) => String(n),
}: SliderWithScaleProps) {
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / span) * 100));

  return (
    <View style={styles.sliderScaleBlock}>
      <View style={styles.sliderShell}>
        <View style={styles.sliderTrackWrapOuter} pointerEvents="none">
          <View style={styles.sliderTrackWrap}>
            <View style={[styles.sliderTrackFillInner, { width: `${pct}%` }]} />
          </View>
        </View>
        <Slider
          style={styles.sliderOverlay}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor={TRACK_CLEAR}
          maximumTrackTintColor={TRACK_CLEAR}
          thumbTintColor={ACCENT_DARK}
        />
      </View>
      <View style={styles.tickRow}>
        {tickValues.map((t) => (
          <View key={t} style={styles.tickColumn}>
            <View style={styles.tickMark} />
            <Text style={styles.tickLabel}>{formatTick(t)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MatchFilterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sport, sportLabel, sportEmoji, sportId, sportName } =
    useLocalSearchParams<{
      sport?: string;
      sportLabel?: string;
      sportEmoji?: string;
      sportId?: string;
      sportName?: string;
    }>();

  const [selectedSport, setSelectedSport] = useState<SportItem>(() => {
    const routeSportId = paramString(sport) ?? paramString(sportId);
    const byId = routeSportId
      ? SPORTS.find((s) => s.id === routeSportId)
      : undefined;
    if (byId) return byId;
    const emoji = paramString(sportEmoji);
    if (emoji) {
      const byEmoji = SPORTS.find((s) => s.emoji === emoji);
      if (byEmoji) return byEmoji;
    }
    const name = paramString(sportLabel) ?? paramString(sportName);
    if (name) {
      const byName = SPORTS.find(
        (s) => s.label.toLowerCase() === name.toLowerCase()
      );
      if (byName) return byName;
    }
    return SPORTS[0];
  });

  const scaleValues = useRef(
    SPORTS.reduce(
      (acc, sport) => {
        acc[sport.id] = new Animated.Value(
          sport.id === selectedSport.id ? 1.12 : 1
        );
        return acc;
      },
      {} as Record<string, Animated.Value>
    )
  ).current;

  const selectSport = useCallback(
    (sport: SportItem) => {
      const prevId = selectedSport.id;
      if (prevId === sport.id) return;

      Animated.spring(scaleValues[prevId], {
        toValue: 1.0,
        useNativeDriver: true,
        tension: 120,
        friction: 6,
      }).start();

      Animated.spring(scaleValues[sport.id], {
        toValue: 1.12,
        useNativeDriver: true,
        tension: 120,
        friction: 6,
      }).start();

      setSelectedSport(sport);
    },
    [selectedSport.id, scaleValues]
  );

  const isGolf = selectedSport.id === "golf";
  const isRunning = selectedSport.id === "running";
  const showMatchLevel = (
    MATCH_LEVEL_SPORT_IDS as readonly string[]
  ).includes(selectedSport.id);

  const [golfScene, setGolfScene] = useState("driving_range");
  const [runningScene, setRunningScene] = useState("easy");
  const [runningUnit, setRunningUnit] = useState<"mi" | "km">("mi");

  const skillOptions = useMemo(() => {
    if (isRunning) {
      return runningUnit === "mi"
        ? [...RUNNING_SKILL_LEVELS_MI]
        : [...RUNNING_SKILL_LEVELS_KM];
    }
    return SKILL_LEVELS[selectedSport.id] ?? SKILL_LEVELS.tennis;
  }, [isRunning, runningUnit, selectedSport.id]);

  const [skillLevel, setSkillLevel] = useState<string>(
    () => SKILL_LEVELS.tennis[0] ?? ""
  );

  useEffect(() => {
    setGolfScene("driving_range");
    setRunningScene("easy");
    setRunningUnit("mi");
    setPurpose(
      (MATCH_LEVEL_SPORT_IDS as readonly string[]).includes(selectedSport.id)
        ? MATCH_LEVEL_OPTIONS[0]
        : PURPOSE_OPTIONS[0]
    );
  }, [selectedSport.id]);

  useEffect(() => {
    setSkillLevel((prev) =>
      skillOptions.includes(prev) ? prev : (skillOptions[0] ?? "")
    );
  }, [skillOptions]);

  const referenceUrl = SKILL_LEVEL_REFERENCE_URLS[selectedSport.id] ?? null;

  const showSkillSection =
    (!isGolf || Boolean(golfScene)) && (!isRunning || Boolean(runningScene));

  const [distance, setDistance] = useState(10);
  const [minAge, setMinAge] = useState(25);
  const [maxAge, setMaxAge] = useState(45);
  const [availability, setAvailability] = useState<Set<string>>(new Set());
  const [gender, setGender] = useState<string>(GENDER_OPTIONS[0]);
  const [purpose, setPurpose] = useState<string>(PURPOSE_OPTIONS[0]);

  const allFilled = useMemo(
    () =>
      Boolean(skillLevel?.trim()) &&
      availability.size >= 1 &&
      Boolean(gender?.trim()) &&
      Boolean(purpose?.trim()) &&
      (!isGolf || Boolean(golfScene)) &&
      (!isRunning || Boolean(runningScene)),
    [
      skillLevel,
      availability,
      gender,
      purpose,
      isGolf,
      golfScene,
      isRunning,
      runningScene,
    ]
  );

  useEffect(() => {
    console.log("[match-filter] allFilled", allFilled);
  }, [allFilled]);

  const toggleCell = (day: number, time: number) => {
    const key = `${day}-${time}`;
    setAvailability((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onBack = useCallback(() => {
    router.back();
  }, [router]);

  const onStartMatching = useCallback(() => {
    const sportLabel = `${selectedSport.label} ${selectedSport.emoji}`;
    const availabilityList = [...availability].sort();
    const sceneLabel = isGolf
      ? GOLF_SCENE_LABELS[golfScene]
      : isRunning
        ? RUNNING_SCENE_LABELS[runningScene]
        : null;
    const profileSkillLevel =
      sceneLabel && skillLevel ? `${sceneLabel} · ${skillLevel}` : skillLevel;

    void mergeUserProfile({
      sport: selectedSport.id,
      skillLevel: profileSkillLevel,
      availability: availabilityList,
    });

    router.push({
      pathname: "/match-results",
      params: {
        sport: selectedSport.id,
        sportLabel,
        sportScene: sceneLabel ?? "",
        skillLevels: JSON.stringify(skillLevel ? [skillLevel] : []),
        availability: JSON.stringify(availabilityList),
        ageRange: JSON.stringify([`${minAge}-${maxAge}`]),
        genderPreference: JSON.stringify(gender ? [gender] : []),
        purpose: JSON.stringify(purpose ? [purpose] : []),
      },
    });
  }, [
    router,
    selectedSport,
    skillLevel,
    availability,
    minAge,
    maxAge,
    gender,
    purpose,
    isGolf,
    golfScene,
    isRunning,
    runningScene,
  ]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pillPressed]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color={ACCENT_DARK} />
          </Pressable>
          <View style={styles.titleTextCol}>
            <Text style={styles.screenTitle}>
              {selectedSport.emoji} {selectedSport.label}
            </Text>
            <Text style={styles.screenSubtitle}>Set your match filters</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sport</Text>
        <View style={styles.sectionCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportChipRow}
          >
            {SPORTS.map((s) => {
              const selected = s.id === selectedSport.id;
              return (
                <Animated.View
                  key={s.id}
                  style={{ transform: [{ scale: scaleValues[s.id] }] }}
                >
                  <Pressable
                    onPress={() => selectSport(s)}
                    style={({ pressed }) => [
                      styles.sportChip,
                      selected
                        ? styles.sportChipSelected
                        : styles.sportChipUnselected,
                      selected && styles.sportChipSelectedContent,
                      pressed && styles.pillPressed,
                    ]}
                  >
                    <Text style={{ fontSize: selected ? 28 : 20 }}>{s.emoji}</Text>
                    {!selected ? (
                      <Text
                        style={{
                          color: "#15803d",
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {s.label}
                      </Text>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {isGolf ? (
          <>
            <Text style={styles.sectionTitle}>Choose your scene</Text>
            <View style={styles.scenePickerCard}>
              <Picker
                selectedValue={golfScene}
                onValueChange={(v) => setGolfScene(String(v))}
                style={styles.scenePickerWheel}
                itemStyle={styles.scenePickerItem}
              >
                <Picker.Item
                  label="Driving range only"
                  value="driving_range"
                />
                <Picker.Item label="9-hole round" value="9_hole" />
                <Picker.Item label="18-hole round" value="18_hole" />
                <Picker.Item label="Either" value="either" />
              </Picker>
            </View>
          </>
        ) : null}

        {isRunning ? (
          <>
            <Text style={styles.sectionTitle}>Choose your scene</Text>
            <View style={styles.scenePickerCard}>
              <Picker
                selectedValue={runningScene}
                onValueChange={(v) => setRunningScene(String(v))}
                style={styles.scenePickerWheel}
                itemStyle={styles.scenePickerItem}
              >
                <Picker.Item label="Easy Runs" value="easy" />
                <Picker.Item label="5K / 10K" value="5k_10k" />
                <Picker.Item
                  label="Half Marathon / Marathon"
                  value="half_full"
                />
              </Picker>
            </View>
          </>
        ) : null}

        {showSkillSection ? (
          <>
            <View style={styles.skillSectionHeader}>
              <Text style={styles.sectionTitle}>
                {isRunning ? "Pace" : "Skill Level"}
              </Text>
              {isRunning ? (
                <View style={styles.unitToggleRow}>
                  <Pressable
                    onPress={() => setRunningUnit("mi")}
                    style={[
                      styles.unitToggleBtn,
                      runningUnit === "mi" && styles.unitToggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitToggleText,
                        runningUnit === "mi" && styles.unitToggleTextActive,
                      ]}
                    >
                      mi
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRunningUnit("km")}
                    style={[
                      styles.unitToggleBtn,
                      runningUnit === "km" && styles.unitToggleBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitToggleText,
                        runningUnit === "km" && styles.unitToggleTextActive,
                      ]}
                    >
                      km
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <View style={styles.sectionCard}>
              <Picker
                selectedValue={skillLevel}
                onValueChange={(value) => setSkillLevel(String(value))}
                style={styles.wheelPicker}
                itemStyle={styles.wheelPickerItem}
              >
                {skillOptions.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
              </Picker>
              {referenceUrl ? (
                <Pressable
                  onPress={() => void Linking.openURL(referenceUrl)}
                  hitSlop={8}
                >
                  <Text style={styles.referenceLink}>
                    Not sure about your level? Check here →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Distance: {Math.round(distance)} miles</Text>
        <View style={styles.sectionCard}>
          <SliderWithScale
            value={distance}
            min={1}
            max={50}
            step={1}
            onValueChange={setDistance}
            tickValues={DISTANCE_TICKS}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Age: {minAge} - {maxAge}
        </Text>
        <View style={styles.sectionCard}>
          <Text style={styles.sliderLabel}>Min Age</Text>
          <SliderWithScale
            value={minAge}
            min={18}
            max={60}
            step={1}
            onValueChange={(v) => setMinAge(Math.min(v, maxAge))}
            tickValues={AGE_TICKS}
          />
          <Text style={[styles.sliderLabel, styles.sliderLabelTop]}>Max Age</Text>
          <SliderWithScale
            value={maxAge}
            min={18}
            max={60}
            step={1}
            onValueChange={(v) => setMaxAge(Math.max(v, minAge))}
            tickValues={AGE_TICKS}
          />
        </View>

        <Text style={styles.sectionTitle}>Availability</Text>
        <View
          style={{
            backgroundColor: "#ffffff",
            padding: 16,
            borderRadius: 20,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 36 }} />
            {DAYS.map((day, dayIndex) => (
              <Text
                key={`h-${dayIndex}`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {day}
              </Text>
            ))}
          </View>
          {[0, 1, 2].map((time) => (
            <View
              key={time}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ width: 36, fontSize: 12, color: "#64748b" }}>
                {TIMES[time]}
              </Text>
              {DAYS.map((_, dayIndex) => {
                const key = `${dayIndex}-${time}`;
                const selected = availability.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggleCell(dayIndex, time)}
                    style={{
                      flex: 1,
                      height: 36,
                      marginHorizontal: 2,
                      borderRadius: 6,
                      backgroundColor: selected ? "#15803d" : "#f1f5f9",
                      borderWidth: 1,
                      borderColor: selected ? "#15803d" : "#e2e8f0",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Gender Preference</Text>
        <View style={styles.sectionCard}>
          <Picker
            selectedValue={gender}
            onValueChange={(value) => setGender(String(value))}
            style={styles.wheelPicker}
            itemStyle={styles.wheelPickerItem}
          >
            {GENDER_OPTIONS.map((opt) => (
              <Picker.Item key={opt} label={opt} value={opt} />
            ))}
          </Picker>
        </View>

        {showMatchLevel ? (
          <Text style={styles.sectionQuestion}>
            What level would you like to play with?
          </Text>
        ) : (
          <Text style={styles.sectionTitle}>Purpose</Text>
        )}
        <View style={styles.sectionCard}>
          <Picker
            selectedValue={purpose}
            onValueChange={(value) => setPurpose(String(value))}
            style={styles.wheelPicker}
            itemStyle={styles.wheelPickerItem}
          >
            {showMatchLevel
              ? MATCH_LEVEL_OPTIONS.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))
              : PURPOSE_OPTIONS.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
          </Picker>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            paddingTop: 12,
          },
        ]}
      >
        <Pressable
          onPress={allFilled ? onStartMatching : undefined}
          style={({ pressed }) => ({
            backgroundColor: allFilled ? "#15803d" : "#e2e8f0",
            borderWidth: 2,
            borderColor: allFilled ? "#15803d" : "#cbd5e1",
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            overflow: "hidden",
            transform: [
              { scale: allFilled && pressed ? 0.98 : 1 },
            ],
          })}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: allFilled ? "#15803d" : "#94a3b8",
            }}
          >
            {selectedSport.emoji} Start Matching
          </Text>
        </Pressable>
        {!allFilled ? (
          <Text
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Please fill in all preferences to continue
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    marginLeft: -4,
    marginRight: 8,
    padding: 4,
  },
  titleTextCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: TEXT,
  },
  screenSubtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    color: ACCENT_DARK,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionQuestion: {
    marginTop: 0,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: CONTENT_TEXT,
  },
  sectionCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_CARD,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sportChipRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sportChipSelected: {
    backgroundColor: ACCENT_DARK,
    borderColor: ACCENT_DARK,
  },
  sportChipSelectedContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  sportChipUnselected: {
    backgroundColor: WHITE,
    borderColor: BORDER_SOFT,
  },
  wheelPicker: {
    width: "100%",
    height: 170,
  },
  wheelPickerItem: {
    fontSize: 15,
    fontWeight: "600",
    color: CONTENT_TEXT,
  },
  slider: {
    width: "100%",
    height: 36,
  },
  sliderScaleBlock: {
    marginTop: 4,
  },
  sliderShell: {
    height: 48,
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  sliderTrackWrapOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 20,
    paddingHorizontal: 10,
  },
  sliderTrackWrap: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: BORDER,
  },
  sliderTrackFillInner: {
    height: "100%",
    backgroundColor: ACCENT_DARK,
    borderRadius: 999,
  },
  sliderOverlay: {
    width: "100%",
    height: 48,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 2,
  },
  tickColumn: {
    flex: 1,
    alignItems: "center",
  },
  tickMark: {
    width: 2,
    height: 6,
    borderRadius: 1,
    backgroundColor: "#94a3b8",
  },
  tickLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  sliderLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "700",
  },
  sliderLabelTop: {
    marginTop: 8,
  },
  pillPressed: {
    opacity: 0.88,
  },
  skillSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  unitToggleRow: {
    flexDirection: "row",
    gap: 6,
  },
  unitToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BORDER_SOFT,
    backgroundColor: WHITE,
  },
  unitToggleBtnActive: {
    backgroundColor: ACCENT_DARK,
    borderColor: ACCENT_DARK,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  unitToggleTextActive: {
    color: WHITE,
  },
  scenePickerCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_CARD,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  scenePickerWheel: {
    height: 180,
    width: "100%",
  },
  scenePickerItem: {
    color: "#052e16",
    fontSize: 18,
    height: 180,
  },
  referenceLink: {
    fontSize: 13,
    color: "#15803d",
    textDecorationLine: "underline",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingHorizontal: 20,
  },
});
