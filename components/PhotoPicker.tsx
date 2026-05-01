import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PhotoPickerProps = {
  value: string | null;
  onChange: (uri: string | null) => void;
  size?: number;
};

export function PhotoPicker({ value, onChange, size = 120 }: PhotoPickerProps) {
  const [isBusy, setIsBusy] = useState(false);

  const openLibrary = async () => {
    setIsBusy(true);
    try {
      const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
      const permission = existing.granted
        ? existing
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Photos access needed",
          "To add a photo, go to Settings > Green Room > Photos and enable access",
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
        onChange(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Something went wrong", "We couldn't open your photo library. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Pressable
      onPress={openLibrary}
      accessibilityRole="button"
      accessibilityLabel="Choose profile photo"
      style={({ pressed }) => [styles.hitArea, pressed && styles.hitAreaPressed]}
    >
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        {value ? (
          <Image source={{ uri: value }} style={[styles.image, { borderRadius: size / 2 }]} />
        ) : (
          <View style={[styles.placeholder, { borderRadius: size / 2 }]}>
            <Text style={styles.placeholderText}>Tap to add</Text>
          </View>
        )}

        <View style={styles.editBadge}>
          {isBusy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="pencil" size={16} color="#ffffff" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignSelf: "center",
  },
  hitAreaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  circle: {
    borderWidth: 2,
    borderColor: "rgba(20,83,45,0.35)",
    backgroundColor: "#f0fdf4",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#f0fdf4",
  },
  placeholderText: {
    color: "#14532d",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },
  editBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#166534",
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
});
