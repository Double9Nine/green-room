import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatAutoLabel, mapPlaceToRegionArea } from "@/constants/locationRegions";
import {
  getFacilityLabel,
  getVenuesForSport,
  venueToSharePayload,
  type NearbyVenue,
  type VenueSharePayload,
} from "@/constants/nearbyVenues";

const ACCENT_GREEN = "#15803d";

const getAreasForRegion = (region: string) => {
  if (region === "New York City") {
    return [
      "Manhattan",
      "Brooklyn",
      "Queens",
      "The Bronx",
      "Staten Island",
      "Long Island",
    ];
  }
  return [
    "Jersey City",
    "Hoboken",
    "Newark",
    "Bayonne",
    "Union City",
    "Weehawken",
    "Edgewater",
    "Fort Lee",
  ];
};

type Props = {
  visible: boolean;
  sportEmoji: string;
  sportId: string;
  playerName: string;
  onClose: () => void;
  onShareVenue: (venue: VenueSharePayload) => void;
};

export function ChatVenueFinderModal({
  visible,
  sportEmoji,
  sportId,
  playerName,
  onClose,
  onShareVenue,
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedArea, setSelectedArea] = useState("Manhattan");
  const [tempRegion, setTempRegion] = useState("New York City");
  const [tempArea, setTempArea] = useState("Manhattan");
  const [detectedLocation, setDetectedLocation] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    const areas = getAreasForRegion(tempRegion);
    setTempArea(areas[0] ?? "Manhattan");
  }, [tempRegion]);

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setDetectedLocation("");
      setLocationError("");
      setIsDetecting(false);
      setSelectedArea("Manhattan");
      setTempRegion("New York City");
      setTempArea("Manhattan");
    }
  }, [visible]);

  const venues = useMemo(
    () => (step === 2 ? getVenuesForSport(sportId, selectedArea) : []),
    [sportId, selectedArea, step]
  );

  const facilityLabel = getFacilityLabel(sportId);

  const goToResults = (area: string) => {
    setSelectedArea(area);
    setStep(2);
  };

  const detectCurrentLocation = async () => {
    setLocationError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location access needed",
          "To find nearby venues, enable location access in Settings."
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
        setLocationError("Could not determine your location");
        return;
      }

      const label = formatAutoLabel(place);
      if (!label) {
        setLocationError("Could not determine your neighborhood");
        return;
      }

      const { region, area } = mapPlaceToRegionArea(place);
      setDetectedLocation(area);
      setTempRegion(region);
      setTempArea(area);
    } catch {
      setLocationError("Unable to fetch location right now");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSearch = () => {
    const area = detectedLocation || tempArea;
    if (!area) return;
    goToResults(area);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {step === 1 ? (
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              { maxHeight: "85%", paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <ScrollView
              style={styles.stepScroll}
              contentContainerStyle={styles.stepBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>Find Nearby Courts & Venues</Text>
              <Text style={styles.subtitle}>
                Choose your location to find places to play
              </Text>

              <View style={styles.locationCard}>
                <Pressable
                  onPress={() => void detectCurrentLocation()}
                  disabled={isDetecting}
                  accessibilityRole="button"
                  accessibilityLabel="Detect my location"
                  style={({ pressed }) => [
                    styles.detectRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.detectRowLeft}>
                    <Ionicons name="navigate" size={22} color={ACCENT_GREEN} />
                    <View style={styles.detectTextBlock}>
                      <Text style={styles.detectTitle}>Detect My Location</Text>
                      <Text style={styles.detectSubtitle}>
                        Use your current GPS location
                      </Text>
                    </View>
                  </View>
                  {isDetecting ? (
                    <ActivityIndicator size="small" color={ACCENT_GREEN} />
                  ) : detectedLocation ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={ACCENT_GREEN}
                    />
                  ) : null}
                </Pressable>

                {detectedLocation ? (
                  <Text style={styles.detectedAreaText}>{detectedLocation}</Text>
                ) : null}

                {locationError ? (
                  <Text style={styles.errorText}>{locationError}</Text>
                ) : null}

                <View style={styles.cardDivider} />

                <Text style={styles.manualHeading}>
                  Choose the location Manually
                </Text>

              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Region</Text>
                  <Picker
                    selectedValue={tempRegion}
                    onValueChange={(value) => setTempRegion(value)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="New York City" value="New York City" />
                    <Picker.Item label="New Jersey" value="New Jersey" />
                  </Picker>
                </View>
                <View style={styles.pickerCol}>
                  <Text style={styles.pickerLabel}>Area</Text>
                  <Picker
                    selectedValue={tempArea}
                    onValueChange={(value) => setTempArea(value)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {getAreasForRegion(tempRegion).map((area) => (
                      <Picker.Item key={area} label={area} value={area} />
                    ))}
                  </Picker>
                </View>
              </View>
              </View>

              <Pressable
                onPress={handleSearch}
                style={{
                  backgroundColor: "#15803d",
                  borderRadius: 16,
                  paddingVertical: 16,
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  Search
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "90%",
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View style={styles.resultsHeader}>
              <Pressable
                onPress={() => setStep(1)}
                style={styles.backBtn}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={24} color={ACCENT_GREEN} />
              </Pressable>
              <Text style={styles.resultsTitle} numberOfLines={2}>
                {sportEmoji} Courts Near {selectedArea}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
              style={{ marginTop: 12 }}
            >
              {venues.map((venue) => (
                <VenueCard
                  key={venue.name}
                  venue={venue}
                  facilityLabel={facilityLabel}
                  playerName={playerName}
                  onBook={() => void Linking.openURL(venue.bookUrl)}
                    onShare={() => {
                      onShareVenue(venueToSharePayload(venue));
                      onClose();
                    }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

function VenueCard({
  venue,
  facilityLabel,
  playerName,
  onBook,
  onShare,
}: {
  venue: NearbyVenue;
  facilityLabel: string;
  playerName: string;
  onBook: () => void;
  onShare: () => void;
}) {
  return (
    <View style={styles.venueCard}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <Text style={styles.venueArea}>{venue.area}</Text>
      <Text style={styles.venueMeta}>
        {facilityLabel}: {venue.courts}
      </Text>
      <Text style={styles.venueAccent}>
        {venue.price} · {venue.rating}
      </Text>
      <Text style={styles.venueAvailable}>Available: {venue.available}</Text>
      <View style={styles.venueActions}>
        <Pressable
          style={({ pressed }) => [styles.bookBtn, pressed && styles.pressed]}
          onPress={onBook}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
          onPress={onShare}
        >
          <Text style={styles.shareBtnText}>Share with {playerName}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
    zIndex: 2,
    elevation: 12,
  },
  stepScroll: { flexGrow: 0, flexShrink: 1 },
  stepBody: { gap: 14, paddingBottom: 8 },
  locationCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    overflow: "hidden",
    zIndex: 2,
  },
  detectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 72,
    width: "100%",
  },
  detectRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  detectTextBlock: { flex: 1, minWidth: 0 },
  detectTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#052e16",
  },
  detectSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  detectedAreaText: {
    fontSize: 15,
    fontWeight: "700",
    color: ACCENT_GREEN,
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 4,
  },
  manualHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  pickerRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dcfce7",
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 6,
    paddingVertical: 8,
    overflow: "hidden",
  },
  pickerCol: { flex: 1 },
  pickerLabel: {
    textAlign: "center",
    color: ACCENT_GREEN,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  picker: { height: 180 },
  pickerItem: { color: "#052e16", fontSize: 16, height: 180 },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pressed: { opacity: 0.88 },
  resultsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { padding: 4 },
  resultsTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#0f172a" },
  venueCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
  },
  venueName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  venueArea: { fontSize: 14, fontWeight: "700", color: ACCENT_GREEN, marginBottom: 4 },
  venueMeta: { fontSize: 14, color: "#475569" },
  venueAccent: { fontSize: 14, fontWeight: "700", color: ACCENT_GREEN },
  venueAvailable: { fontSize: 13, color: "#64748b", marginBottom: 10 },
  venueActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  bookBtn: {
    flex: 1,
    backgroundColor: ACCENT_GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  bookBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  shareBtn: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  shareBtnText: { color: "#334155", fontSize: 13, fontWeight: "700", textAlign: "center" },
});
