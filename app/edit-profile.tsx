import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { LocationPicker } from "@/components/LocationPicker";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT_DARK = "#15803d";

function showToast(message: string) {
  Alert.alert("Error", message);
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const existing = await AsyncStorage.getItem("userProfile");
        const profile = existing ? JSON.parse(existing) : {};
        if (cancelled) return;
        setName(profile.name || profile.fullName || "");
        setPhoto(profile.photo ?? profile.photoUri ?? null);
        setLocation(profile.location || profile.locationLabel || "");
      } catch {
        if (!cancelled) showToast("Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pickPhoto = useCallback(async () => {
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
        setPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Something went wrong", "Could not open your photo library.");
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const existing = await AsyncStorage.getItem("userProfile");
      const profile = existing ? JSON.parse(existing) : {};
      const updated = {
        ...profile,
        name: name.trim(),
        photo,
        location: location.trim(),
      };
      await AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      router.back();
    } catch {
      showToast("Could not save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT_DARK} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBack}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={ACCENT_DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Profile Photo</Text>
          <View style={styles.photoSection}>
            <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={48} color={ACCENT_DARK} />
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={WHITE} />
              </View>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Full Name</Text>
          <View style={styles.inputCard}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={MUTED}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.sectionLabel}>Location</Text>
          <LocationPicker
            initialLabel={location}
            onLabelChange={setLocation}
          />
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.saveBtn}>
            <Pressable
              onPress={() => void handleSave()}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.saveBtnPressable,
                (pressed || isSaving) && styles.saveBtnPressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginRight: 40,
  },
  headerSpacer: { width: 0 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT_DARK,
    marginTop: 20,
    marginBottom: 10,
  },
  photoSection: { alignItems: "center", marginTop: 4 },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: ACCENT_DARK,
    backgroundColor: WHITE,
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
  inputCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
    paddingVertical: 12,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "center",
    backgroundColor: BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  saveBtn: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 24,
    overflow: "hidden",
    paddingVertical: 20,
    paddingHorizontal: 40,
    minHeight: 64,
  },
  saveBtnPressable: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT_DARK,
  },
  saveBtnPressed: { opacity: 0.88 },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
});
