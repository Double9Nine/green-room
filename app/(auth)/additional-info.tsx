import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LocationPicker } from "@/components/LocationPicker";
import { PhotoPicker } from "@/components/PhotoPicker";
import { mergeUserProfile } from "@/lib/profileStorage";

export default function AdditionalInfoScreen() {
  const insets = useSafeAreaInsets();
  const [occupation, setOccupation] = useState("");
  const [university, setUniversity] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [photoError, setPhotoError] = useState(false);

  const handleContinue = () => {
    if (!photoUri) {
      setPhotoError(true);
      Alert.alert(
        "Photo Required",
        "Please upload a profile photo to continue.",
        [{ text: "OK" }]
      );
      return;
    }
    void mergeUserProfile({
      work: occupation.trim(),
      university: university.trim(),
      photo: photoUri,
      location: locationLabel,
    });
    void AsyncStorage.removeItem("tempProfile");
    router.replace("/(tabs)/match");
  };

  return (
    <LinearGradient colors={["#22c55e", "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
      <Pressable
        onPress={async () => {
          await AsyncStorage.setItem("fromAdditionalInfo", "true");
          router.back();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 8,
        }}
      >
        <Ionicons name="chevron-back" size={24} color="#15803d" />
        <Text style={{ color: "#15803d", fontSize: 16, fontWeight: "600" }}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Additional Information</Text>
        <Text style={styles.subtitle}>Help others get to know you better (optional)</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What do you do for work?</Text>
          <TextInput
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Your occupation"
            placeholderTextColor="#6b7280"
            style={styles.input}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Which university did you attend?</Text>
          <TextInput
            value={university}
            onChangeText={setUniversity}
            placeholder="University name"
            placeholderTextColor="#6b7280"
            style={styles.input}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.label}>Profile Photo</Text>
            <Text style={{ color: "#dc2626", fontSize: 16, fontWeight: "800" }}>*</Text>
          </View>
          <Text style={{ color: "#64748b", fontSize: 13, marginTop: -4 }}>
            Required - help others recognize you!
          </Text>
          <View
            style={[
              styles.card,
              {
                borderColor: photoError ? "#dc2626" : "rgba(20,83,45,0.18)",
                borderWidth: photoError ? 2 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📷</Text>
              <Text style={styles.cardTitle}>Profile Photo</Text>
            </View>

            <PhotoPicker
              value={photoUri}
              onChange={(uri) => {
                setPhotoUri(uri);
                if (uri) setPhotoError(false);
              }}
            />

            <Text style={styles.helperText}>Upload a photo to help others recognize you</Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <LocationPicker onLabelChange={setLocationLabel} />
        </View>

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [styles.completeButton, pressed && styles.actionButtonPressed]}
        >
          <Text style={styles.completeButtonText}>Complete Profile</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#052e16",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#14532d",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
    color: "#14532d",
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "800",
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  helperText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
  },
  completeButton: {
    marginTop: "auto",
    borderRadius: 999,
    backgroundColor: "#15803d",
    borderWidth: 2,
    borderColor: "#14532d",
    paddingVertical: 16,
  },
  completeButtonText: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
});
