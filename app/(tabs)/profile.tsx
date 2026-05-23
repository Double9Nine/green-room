import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LocationPicker } from "@/components/LocationPicker";
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_TIMES,
  PROFILE_SPORTS,
  SKILL_LEVELS,
} from "@/constants/skillLevels";
import {
  loadUserProfile,
  saveUserProfile,
  type ProfileNotifications,
  type UserProfile,
} from "@/lib/profileStorage";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#22c55e";
const ACCENT_DARK = "#15803d";

const PURPOSE_OPTIONS = [
  "Trying to level up 🏆",
  "Just here to meet people 😎",
  "Looking for my go-to partner 🤝",
  "Just trying to stay active 🏃",
  "Other ✨",
] as const;

const TAG_OPTIONS = [
  "Low-key competitive",
  "Chill vibes only",
  "Chatty",
  "Beginner-friendly",
  "Won't flake",
  "Social cardio",
  "Good banter",
  "No pressure",
  "Shows up",
  "Down for a challenge",
  "Other",
] as const;

const MAX_TAGS = 3;

type ModalKind =
  | "name"
  | "sport"
  | "availability"
  | "notifications"
  | "purpose"
  | "tags"
  | "location"
  | null;

function getSportMeta(sportId: string) {
  return PROFILE_SPORTS.find((s) => s.id === sportId) ?? PROFILE_SPORTS[0];
}

function SheetModal({
  visible,
  title,
  onClose,
  onSave,
  showFooterSave = true,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  showFooterSave?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={TEXT} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetScroll}
          >
            {children}
          </ScrollView>
          {showFooterSave ? (
            <Pressable
              onPress={onSave}
              style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function AvailabilityEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const set = useMemo(() => new Set(value), [value]);

  const toggle = (day: number, time: number) => {
    const key = `${day}-${time}`;
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  return (
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeaderRow}>
        <View style={styles.timeLabelSpacer} />
        {AVAILABILITY_DAYS.map((day, dayIndex) => (
          <Text key={`h-${dayIndex}`} style={styles.dayLabel}>
            {day}
          </Text>
        ))}
      </View>
      {[0, 1, 2].map((time) => (
        <View key={time} style={styles.availabilityRow}>
          <Text style={styles.timeLabel}>{AVAILABILITY_TIMES[time]}</Text>
          {AVAILABILITY_DAYS.map((_, dayIndex) => {
            const key = `${dayIndex}-${time}`;
            const selected = set.has(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggle(dayIndex, time)}
                style={[
                  styles.availabilityCell,
                  selected
                    ? styles.availabilityCellOn
                    : styles.availabilityCellOff,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKind>(null);

  const [draftName, setDraftName] = useState("");
  const [draftSport, setDraftSport] = useState("tennis");
  const [draftSkill, setDraftSkill] = useState("");
  const [draftAvailability, setDraftAvailability] = useState<string[]>([]);
  const [draftNotifications, setDraftNotifications] =
    useState<ProfileNotifications>({
      newMatches: true,
      newMessages: true,
      gameReminders: true,
    });
  const [draftPurpose, setDraftPurpose] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftLocation, setDraftLocation] = useState("");
  const [tagError, setTagError] = useState("");

  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem("userProfile").then((val) => {
        if (val) {
          const p = JSON.parse(val) as {
            name?: string;
            photo?: string | null;
            location?: string;
          };
          setName(p.name || "");
          setPhoto(p.photo ?? null);
          setLocation(p.location || "");
        }
      });
      void loadUserProfile().then(setProfile);
    }, [])
  );

  const persist = async (patch: Partial<UserProfile>) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    if (patch.name !== undefined) setName(patch.name);
    if (patch.photo !== undefined) setPhoto(patch.photo);
    if (patch.location !== undefined) setLocation(patch.location);
    await saveUserProfile(next);
  };

  const pickPhoto = async () => {
    if (!profile) return;
    try {
      const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
      const permission = existing.granted
        ? existing
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photos access needed",
          "Enable photo access in Settings to update your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await persist({ photo: result.assets[0].uri });
      }
    } catch {
      Alert.alert("Something went wrong", "Could not open your photo library.");
    }
  };

  const openModal = (kind: ModalKind) => {
    if (!profile) return;
    if (kind === "name") setDraftName(profile.name);
    if (kind === "sport") {
      setDraftSport(profile.sport);
      setDraftSkill(profile.skillLevel);
    }
    if (kind === "availability") setDraftAvailability([...profile.availability]);
    if (kind === "notifications") setDraftNotifications({ ...profile.notifications });
    if (kind === "purpose") {
      setDraftPurpose(profile.purpose);
    }
    if (kind === "tags") {
      setDraftTags([...profile.tags]);
      setTagError("");
    }
    if (kind === "location") setDraftLocation(profile.location);
    setActiveModal(kind);
  };

  const closeModal = () => setActiveModal(null);

  const skillOptions = useMemo(
    () => SKILL_LEVELS[draftSport] ?? SKILL_LEVELS.tennis,
    [draftSport]
  );

  const saveName = async () => {
    await persist({ name: draftName.trim() });
    closeModal();
  };

  const saveSport = async () => {
    const level = skillOptions.includes(draftSkill)
      ? draftSkill
      : (skillOptions[0] ?? "");
    await persist({ sport: draftSport, skillLevel: level });
    closeModal();
  };

  const saveAvailability = async () => {
    await persist({ availability: [...draftAvailability].sort() });
    closeModal();
  };

  const saveNotifications = async () => {
    await persist({ notifications: { ...draftNotifications } });
    closeModal();
  };

  const toggleTag = (tag: string) => {
    setDraftTags((prev) => {
      if (prev.includes(tag)) {
        setTagError("");
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= MAX_TAGS) {
        setTagError("You can only pick up to 3 tags");
        return prev;
      }
      setTagError("");
      return [...prev, tag];
    });
  };

  const savePurpose = async () => {
    await persist({ purpose: draftPurpose });
    closeModal();
  };

  const saveTags = async () => {
    if (draftTags.length > MAX_TAGS) {
      setTagError("You can only pick up to 3 tags");
      return;
    }
    await persist({ tags: draftTags });
    closeModal();
  };

  const saveLocation = async () => {
    await persist({ location: draftLocation });
    closeModal();
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sport = getSportMeta(profile.sport);
  const displayName = name.trim() || "Your name";
  const heroMeta = profile.skillLevel.trim()
    ? `${sport.emoji} ${profile.skillLevel}`
    : `${sport.emoji} Add your skill level`;
  const locationText = location.trim() || "Add your location";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your sports, skill level, and preferences.
        </Text>
        <View style={styles.titleUnderline} />

        <View style={styles.heroCard}>
          <View style={styles.heroCardRow}>
          <View style={styles.heroAvatarColumn}>
            <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={40} color={ACCENT_DARK} />
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={WHITE} />
              </View>
            </Pressable>
          </View>

          <View style={styles.heroText}>
            <Pressable onPress={() => openModal("name")}>
              <Text style={styles.heroName}>{displayName}</Text>
            </Pressable>

            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={14} color={ACCENT_DARK} />
              <Text style={styles.heroLocation} numberOfLines={2}>
                {locationText}
              </Text>
            </View>

            <Text style={styles.heroMeta}>{heroMeta}</Text>

            {profile.purpose ? (
              <View style={styles.purposePill}>
                <Text style={styles.purposePillText}>{profile.purpose}</Text>
              </View>
            ) : null}

            {profile.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {profile.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          </View>

          <View style={styles.heroEditBtnWrap} pointerEvents="box-none">
            <Pressable
              onPress={() => router.push("/edit-profile")}
              style={({ pressed }) => [
                styles.heroEditBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.heroEditBtnText}>✏️ Edit</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </View>
        </View>

        <Pressable
          onPress={() => openModal("sport")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🎾</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
            Edit Sports & Level
          </Text>
        </Pressable>

        <Pressable
          onPress={() => openModal("purpose")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🎯</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
            Purpose
          </Text>
        </Pressable>

        <Pressable
          onPress={() => openModal("tags")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🏷️</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
            Tags
          </Text>
        </Pressable>

        <Pressable
          onPress={() => openModal("notifications")}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🔔</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
            Notifications
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/my-player-card")}
          style={{
            alignSelf: "center",
            marginTop: 32,
            marginBottom: 24,
            backgroundColor: "#052e16",
            borderWidth: 2.5,
            borderColor: "#d4af37",
            borderRadius: 50,
            paddingVertical: 18,
            paddingHorizontal: 40,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 20 }}>🌟</Text>
          <Text
            style={{
              color: "#d4af37",
              fontSize: 17,
              fontWeight: "900",
              letterSpacing: 0.5,
            }}
          >
            Reveal My All-Star Card
          </Text>
          <Text style={{ fontSize: 20 }}>🌟</Text>
        </Pressable>
      </ScrollView>

      <SheetModal
        visible={activeModal === "name"}
        title="Edit name"
        onClose={closeModal}
        onSave={() => void saveName()}
      >
        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Your name"
          placeholderTextColor={MUTED}
          style={styles.input}
          autoCapitalize="words"
        />
      </SheetModal>

      <SheetModal
        visible={activeModal === "sport"}
        title="Edit sports & level"
        onClose={closeModal}
        onSave={() => void saveSport()}
        showFooterSave={false}
      >
        <Text style={styles.fieldLabel}>Sport</Text>
        <View style={styles.sportPillWrap}>
          {PROFILE_SPORTS.map((item) => {
            const selected = draftSport === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setDraftSport(item.id);
                  const levels = SKILL_LEVELS[item.id] ?? [];
                  if (!levels.includes(draftSkill)) {
                    setDraftSkill(levels[0] ?? "");
                  }
                }}
                style={[styles.sportPill, selected && styles.sportPillOn]}
              >
                <Text style={styles.sportPillEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.sportPillLabel,
                    selected && styles.sportPillLabelOn,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.fieldLabel}>Skill level</Text>
        <View style={styles.pickerCard}>
          <Picker
            selectedValue={
              skillOptions.includes(draftSkill)
                ? draftSkill
                : (skillOptions[0] ?? "")
            }
            onValueChange={(v) => setDraftSkill(String(v))}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {skillOptions.map((level) => (
              <Picker.Item key={level} label={level} value={level} />
            ))}
          </Picker>
        </View>
        <ModalConfirm onPress={() => void saveSport()} />
      </SheetModal>

      <SheetModal
        visible={activeModal === "availability"}
        title="Availability"
        onClose={closeModal}
        onSave={() => void saveAvailability()}
        showFooterSave={false}
      >
        <AvailabilityEditor
          value={draftAvailability}
          onChange={setDraftAvailability}
        />
        <ModalConfirm onPress={() => void saveAvailability()} />
      </SheetModal>

      <SheetModal
        visible={activeModal === "notifications"}
        title="Notifications"
        onClose={closeModal}
        onSave={() => void saveNotifications()}
        showFooterSave={false}
      >
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>New matches</Text>
          <Switch
            value={draftNotifications.newMatches}
            onValueChange={(v) =>
              setDraftNotifications((n) => ({ ...n, newMatches: v }))
            }
            trackColor={{ false: BORDER, true: ACCENT }}
            thumbColor={WHITE}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>New messages</Text>
          <Switch
            value={draftNotifications.newMessages}
            onValueChange={(v) =>
              setDraftNotifications((n) => ({ ...n, newMessages: v }))
            }
            trackColor={{ false: BORDER, true: ACCENT }}
            thumbColor={WHITE}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Game reminders</Text>
          <Switch
            value={draftNotifications.gameReminders}
            onValueChange={(v) =>
              setDraftNotifications((n) => ({ ...n, gameReminders: v }))
            }
            trackColor={{ false: BORDER, true: ACCENT }}
            thumbColor={WHITE}
          />
        </View>
        <ModalConfirm onPress={() => void saveNotifications()} />
      </SheetModal>

      <SheetModal
        visible={activeModal === "purpose"}
        title="Purpose"
        onClose={closeModal}
        onSave={() => void savePurpose()}
        showFooterSave={false}
      >
        <Text style={styles.fieldLabel}>What brings you here?</Text>
        <View style={styles.pillWrap}>
          {PURPOSE_OPTIONS.map((option) => {
            const selected = draftPurpose === option;
            return (
              <Pressable
                key={option}
                onPress={() => setDraftPurpose(option)}
                style={[styles.pill, selected && styles.pillOn]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextOn]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <ModalConfirm onPress={() => void savePurpose()} />
      </SheetModal>

      <SheetModal
        visible={activeModal === "tags"}
        title="Tags"
        onClose={closeModal}
        onSave={() => void saveTags()}
        showFooterSave={false}
      >
        <Text style={styles.fieldLabel}>Pick up to 3 tags</Text>
        <View style={styles.pillWrap}>
          {TAG_OPTIONS.map((tag) => {
            const selected = draftTags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[styles.pill, selected && styles.pillOn]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextOn]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {tagError ? <Text style={styles.errorText}>{tagError}</Text> : null}
        <ModalConfirm onPress={() => void saveTags()} />
      </SheetModal>

      <SheetModal
        visible={activeModal === "location"}
        title="Edit location"
        onClose={closeModal}
        onSave={() => void saveLocation()}
      >
        <LocationPicker
          initialLabel={draftLocation}
          onLabelChange={setDraftLocation}
        />
      </SheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 15, fontWeight: "600", color: MUTED },
  content: { paddingHorizontal: 20 },
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
    position: "relative",
    overflow: "visible",
    marginTop: 24,
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
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
  heroCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroAvatarColumn: {
    alignItems: "flex-start",
    marginRight: 12,
    paddingRight: 4,
  },
  avatarWrap: { marginRight: 0 },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: ACCENT_DARK,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 100, height: 100 },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT_DARK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
  },
  heroText: { flex: 1, marginLeft: 14, paddingRight: 72, paddingBottom: 36, gap: 6 },
  heroName: { fontSize: 20, fontWeight: "800", color: TEXT },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroLocation: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: ACCENT_DARK,
  },
  heroMeta: { fontSize: 14, fontWeight: "700", color: ACCENT_DARK },
  purposePill: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: ACCENT,
    marginTop: 2,
  },
  purposePillText: { fontSize: 12, fontWeight: "700", color: ACCENT_DARK },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tagPill: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagPillText: { fontSize: 11, fontWeight: "600", color: MUTED },
  heroEditBtnWrap: {
    position: "absolute",
    bottom: 12,
    right: 12,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 10 },
      default: {},
    }),
  },
  heroEditBtn: {
    borderWidth: 1.5,
    borderColor: ACCENT_DARK,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: WHITE,
  },
  heroEditBtnText: {
    color: ACCENT_DARK,
    fontSize: 15,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  actionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  pressed: { opacity: 0.88 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: TEXT },
  sheetScroll: { paddingBottom: 16, gap: 12 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  fieldLabelSpaced: { marginTop: 8 },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: ACCENT_DARK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: "800" },
  sportPillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: WHITE,
  },
  sportPillOn: { backgroundColor: "#dcfce7", borderColor: ACCENT_DARK },
  sportPillEmoji: { fontSize: 14 },
  sportPillLabel: { fontSize: 12, fontWeight: "700", color: TEXT },
  sportPillLabelOn: { color: ACCENT_DARK },
  pickerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  picker: { height: Platform.OS === "ios" ? 180 : 48 },
  pickerItem: { fontSize: 16, color: TEXT },
  availabilityCard: { marginTop: 4 },
  availabilityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timeLabelSpacer: { width: 36 },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  timeLabel: { width: 36, fontSize: 12, fontWeight: "600", color: MUTED },
  availabilityCell: {
    flex: 1,
    height: 36,
    marginHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  availabilityCellOn: {
    backgroundColor: ACCENT_DARK,
    borderColor: ACCENT_DARK,
  },
  availabilityCellOff: {
    backgroundColor: "#f1f5f9",
    borderColor: BORDER,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  switchLabel: { fontSize: 16, fontWeight: "600", color: TEXT },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: WHITE,
  },
  pillOn: { backgroundColor: ACCENT_DARK, borderColor: ACCENT_DARK },
  pillText: { fontSize: 13, fontWeight: "700", color: ACCENT_DARK },
  pillTextOn: { color: WHITE },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  modalConfirmText: {
    color: "#15803d",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
  },
});

function ModalConfirm({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.modalConfirmText}>Confirm</Text>
    </Pressable>
  );
}
