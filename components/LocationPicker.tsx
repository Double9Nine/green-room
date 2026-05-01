import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type RegionGroup = "New York City" | "New Jersey";

const REGIONS: RegionGroup[] = ["New York City", "New Jersey"];

const AREAS_BY_REGION: Record<RegionGroup, string[]> = {
  "New York City": ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island", "Long Island"],
  "New Jersey": ["Jersey City", "Hoboken", "Newark", "Bayonne", "Union City", "Weehawken", "Edgewater", "Fort Lee"],
};

function formatAutoLabel(place: Location.LocationGeocodedAddress): string {
  const neighborhood = place.district || place.subregion || "";
  const city = place.city || place.region || "";

  if (neighborhood && city && neighborhood !== city) {
    return `${neighborhood}, ${city}`;
  }

  return neighborhood || city || "";
}

function parseManualLabel(label: string): { region: RegionGroup; area: string } | null {
  const match = label.match(/^(.*) \((New York City|New Jersey)\)\s*$/);
  if (!match) {
    return null;
  }

  const area = match[1]?.trim();
  const region = match[2] as RegionGroup;
  if (!area || (region !== "New York City" && region !== "New Jersey")) {
    return null;
  }

  return { region, area };
}

export function LocationPicker() {
  const [mode, setMode] = useState<"none" | "auto" | "manual">("none");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [tempRegion, setTempRegion] = useState<RegionGroup>("New York City");
  const [tempArea, setTempArea] = useState<string>(AREAS_BY_REGION["New York City"][0] ?? "Manhattan");

  const areaItems = useMemo(() => AREAS_BY_REGION[tempRegion] ?? [], [tempRegion]);

  useEffect(() => {
    if (!areaItems.includes(tempArea)) {
      setTempArea(areaItems[0] ?? "");
    }
  }, [areaItems, tempArea]);

  const openManualPicker = () => {
    setError("");

    if (mode === "manual") {
      const parsed = parseManualLabel(label);
      if (parsed) {
        setTempRegion(parsed.region);
        setTempArea(parsed.area);
        setManualOpen(true);
        return;
      }
    }

    setTempRegion("New York City");
    setTempArea(AREAS_BY_REGION["New York City"][0] ?? "Manhattan");
    setManualOpen(true);
  };

  const closeManualPicker = () => {
    setManualOpen(false);
  };

  const confirmManualSelection = () => {
    if (!tempArea) {
      return;
    }

    setError("");
    setMode("manual");
    setLabel(`${tempArea} (${tempRegion})`);
    setManualOpen(false);
  };

  const detectLocation = async () => {
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location access needed",
          "To detect location, go to Settings > Green Room > Location and enable access",
        );
        return;
      }

      setIsDetecting(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const places = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const place = places[0];
      if (!place) {
        setError("Could not determine your neighborhood");
        return;
      }

      const nextLabel = formatAutoLabel(place);
      if (!nextLabel) {
        setError("Could not determine your neighborhood");
        return;
      }

      setLabel(nextLabel);
      setMode("auto");
    } catch {
      setError("Unable to fetch location right now");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.questionLabelRow}>
        <Ionicons name="location-sharp" size={18} color="#14532d" />
        <Text style={styles.questionLabel}>Where are you located?</Text>
      </View>

      <View style={styles.card}>
        <Pressable
          onPress={detectLocation}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Detect my location"
        >
          <View style={styles.optionLeft}>
            <Ionicons name="navigate" size={20} color="#166534" />
            <Text style={styles.optionTitle}>Detect My Location</Text>
          </View>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={openManualPicker}
          style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Enter location manually"
        >
          <View style={styles.optionLeft}>
            <Ionicons name="pencil" size={20} color="#166534" />
            <Text style={styles.optionTitle}>Enter Manually</Text>
          </View>
        </Pressable>

        {isDetecting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#14532d" />
            <Text style={styles.loadingText}>Detecting...</Text>
          </View>
        ) : null}

        {label ? (
          <>
            <View style={styles.divider} />
            <View style={styles.selectedRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <View style={styles.selectedTextWrap}>
                <Text style={styles.selectedLabel}>{mode === "manual" ? "Selected location" : "Detected location"}</Text>
                <Text style={styles.selectedValue}>{label}</Text>
              </View>
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.helperText}>Used to find players near you</Text>
      </View>

      <Modal visible={manualOpen} transparent animationType="slide" onRequestClose={closeManualPicker}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropTap} onPress={closeManualPicker} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Select your area</Text>
                <Text style={styles.modalSubtitle}>Spin to choose, then confirm.</Text>
              </View>
              <Pressable
                onPress={closeManualPicker}
                hitSlop={10}
                style={({ pressed }) => [styles.modalClose, pressed && styles.optionRowPressed]}
              >
                <Ionicons name="close" size={22} color="#14532d" />
              </Pressable>
            </View>

            <View style={styles.wheelsCard}>
              <View style={styles.wheelColumn}>
                <Text style={styles.wheelLabel}>Region</Text>
                <Picker
                  selectedValue={tempRegion}
                  onValueChange={(value) => setTempRegion(value as RegionGroup)}
                  style={styles.wheel}
                  itemStyle={styles.wheelItemIOS}
                >
                  {REGIONS.map((region) => (
                    <Picker.Item key={region} label={region} value={region} />
                  ))}
                </Picker>
              </View>

              <View style={styles.wheelColumn}>
                <Text style={styles.wheelLabel}>Area</Text>
                <Picker
                  selectedValue={tempArea}
                  onValueChange={(value) => setTempArea(String(value))}
                  style={styles.wheel}
                  itemStyle={styles.wheelItemIOS}
                >
                  {areaItems.map((area) => (
                    <Picker.Item key={area} label={area} value={area} />
                  ))}
                </Picker>
              </View>
            </View>

            <Pressable
              onPress={confirmManualSelection}
              disabled={!tempArea}
              style={({ pressed }) => [
                styles.confirmButton,
                !tempArea && styles.confirmButtonDisabled,
                pressed && tempArea && styles.optionRowPressed,
              ]}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  questionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#14532d",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
    padding: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(20,83,45,0.14)",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  optionTitle: {
    color: "#052e16",
    fontSize: 16,
    fontWeight: "900",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#14532d",
    fontWeight: "800",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  selectedTextWrap: {
    flex: 1,
    gap: 4,
  },
  selectedLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  selectedValue: {
    color: "#052e16",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  errorText: {
    color: "#7f1d1d",
    fontSize: 13,
    fontWeight: "700",
  },
  helperText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(2, 44, 34, 0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalClose: {
    padding: 6,
    borderRadius: 999,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#052e16",
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  wheelsCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 4,
  },
  wheelColumn: {
    flex: 1,
  },
  wheelLabel: {
    textAlign: "center",
    color: "#14532d",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  wheel: {
    height: 180,
  },
  wheelItemIOS: {
    color: "#052e16",
    fontSize: 18,
    height: 180,
  },
  confirmButton: {
    borderRadius: 999,
    backgroundColor: "#15803d",
    borderWidth: 2,
    borderColor: "#14532d",
    paddingVertical: 14,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
});
