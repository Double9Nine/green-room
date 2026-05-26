import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
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
import { USER_PROFILE_KEY, type UserProfile } from "../lib/profileStorage";

const DARK_GREEN = "#052e16";
const ACCENT_GREEN = "#15803d";
const GOLD = "#d4af37";
const BG = "#f0fdf4";

export default function MyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_PROFILE_KEY).then((raw) => {
      if (raw) setProfile(JSON.parse(raw));
    });
  }, []);

  const sport = PROFILE_SPORTS.find((s) => s.id === profile?.sport) ?? PROFILE_SPORTS[0];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: DARK_GREEN }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBack}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={GOLD} />
            <Text style={styles.headerBackText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={{ flex: 1, backgroundColor: BG }}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={styles.avatarWrap}
              onPress={() => setShowPhotoModal(true)}
            >
              <View style={styles.avatar}>
                {profile?.photo ? (
                  <Image
                    source={{ uri: profile.photo }}
                    style={{ width: "100%", height: "100%", borderRadius: 999 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={56} color={GOLD} />
                )}
              </View>
            </Pressable>

            <Text style={styles.name}>{profile?.name || "—"}</Text>

            {profile?.skillLevel ? (
              <Text style={styles.sportSkill}>
                {sport.emoji} {profile.skillLevel}
              </Text>
            ) : null}

            {profile?.location ? (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={ACCENT_GREEN}
                />
                <Text style={styles.locationText}>{profile.location}</Text>
              </View>
            ) : null}

            {profile?.purpose ? (
              <View style={styles.purposeBadge}>
                <Text style={styles.purposeText}>{profile.purpose}</Text>
              </View>
            ) : null}

            {profile?.tags && profile.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {profile.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {typeof profile?.gamesPlayed === "number" ? (
              <View style={styles.statRow}>
                <Ionicons
                  name="trophy-outline"
                  size={18}
                  color={ACCENT_GREEN}
                />
                <Text style={styles.statText}>
                  {profile.gamesPlayed} games played
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>

      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            {profile?.photo ? (
              <Image
                source={{ uri: profile.photo }}
                style={styles.modalPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.modalPhotoPlaceholder}>
                <Ionicons name="person" size={100} color={GOLD} />
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: DARK_GREEN,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.25)",
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 72,
  },
  headerBackText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    minWidth: 72,
  },
  content: {
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#d1fae5",
    borderWidth: 3,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    textAlign: "center",
  },
  sportSkill: {
    fontSize: 16,
    color: ACCENT_GREEN,
    fontWeight: "600",
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: "#475569",
  },
  purposeBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  purposeText: {
    fontSize: 13,
    color: ACCENT_GREEN,
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tagPillText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statText: {
    fontSize: 14,
    color: "#475569",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalPhoto: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: GOLD,
  },
  modalPhotoPlaceholder: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: GOLD,
    backgroundColor: "#1e3a2f",
    alignItems: "center",
    justifyContent: "center",
  },
});
