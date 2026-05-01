import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { LocationPicker } from "@/components/LocationPicker";
import { PhotoPicker } from "@/components/PhotoPicker";

export default function AdditionalInfoScreen() {
  const [occupation, setOccupation] = useState("");
  const [university, setUniversity] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  return (
    <LinearGradient colors={["#22c55e", "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
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
          <Text style={styles.label}>Add a photo (optional)</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📷</Text>
              <Text style={styles.cardTitle}>Profile Photo</Text>
            </View>

            <PhotoPicker value={photoUri} onChange={setPhotoUri} />

            <Text style={styles.helperText}>Upload a photo to help others recognize you</Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <LocationPicker />
        </View>

        <Pressable
          onPress={() => router.replace("/(tabs)/explore")}
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
