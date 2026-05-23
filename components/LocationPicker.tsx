import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const commaParts = label.split(",").map((part) => part.trim());
  if (commaParts.length === 2) {
    const area = commaParts[0];
    const region = commaParts[1] as RegionGroup;
    if (area && (region === "New York City" || region === "New Jersey")) {
      return { region, area };
    }
  }

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

type LocationPickerProps = {
  initialLabel?: string;
  onLabelChange?: (label: string) => void;
};

export function LocationPicker({
  initialLabel,
  onLabelChange,
}: LocationPickerProps) {
  const [mode, setMode] = useState<"none" | "auto" | "manual">(
    initialLabel ? "manual" : "none"
  );
  const [label, setLabel] = useState(initialLabel || "");

  useEffect(() => {
    onLabelChange?.(label);
  }, [label, onLabelChange]);

  useEffect(() => {
    setLabel(initialLabel || "");
    if (initialLabel) {
      setMode("manual");
    }
  }, [initialLabel]);
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

  const confirmManualSelection = () => {
    if (!tempArea) {
      return;
    }

    const nextLabel = `${tempArea}, ${tempRegion}`;
    setError("");
    setMode("manual");
    setLabel(nextLabel);
    onLabelChange?.(nextLabel);
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
      onLabelChange?.(nextLabel);
      setMode("auto");
      setManualOpen(false);
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

        {manualOpen ? (
          <>
            <View style={styles.divider} />
            <View style={styles.wheelsCard}>
              <View style={styles.wheelsRow}>
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
                  !tempArea && styles.confirmButtonDisabled,
                  pressed && tempArea && styles.optionRowPressed,
                ]}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.helperText}>Used to find players near you</Text>
      </View>
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
  wheelsCard: {
    gap: 0,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 12,
  },
  wheelsRow: {
    flexDirection: "row",
    gap: 10,
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
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: "#15803d",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
});
