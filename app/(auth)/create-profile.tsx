import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";

import { mergeUserProfile } from "@/lib/profileStorage";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type GenderOption = "Male" | "Female" | "Prefer not to say";

const GENDER_OPTIONS: GenderOption[] = ["Male", "Female", "Prefer not to say"];

function getMaxAllowedDob(): Date {
  const now = new Date();
  const max = new Date(now);
  max.setFullYear(now.getFullYear() - 18);
  return max;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CreateProfileScreen() {
  const maxAllowedDob = useMemo(() => getMaxAllowedDob(), []);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<Date>(maxAllowedDob);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === "ios");
  const [formError, setFormError] = useState("");
  const [dobError, setDobError] = useState("");

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    const nextDate = selectedDate > maxAllowedDob ? maxAllowedDob : selectedDate;
    setDateOfBirth(nextDate);

    if (nextDate > maxAllowedDob) {
      setDobError("You must be at least 18 years old");
    } else {
      setDobError("");
    }
  };

  const handleContinue = () => {
    const isUnder18 = dateOfBirth > maxAllowedDob;

    if (!fullName.trim() || !gender || !dateOfBirth) {
      setFormError("Please complete all fields");
      if (isUnder18) {
        setDobError("You must be at least 18 years old");
      }
      return;
    }

    if (isUnder18) {
      setFormError("");
      setDobError("You must be at least 18 years old");
      return;
    }

    setFormError("");
    setDobError("");
    void mergeUserProfile({
      name: fullName.trim(),
    });
    router.push("/(auth)/additional-info" as never);
  };

  return (
    <LinearGradient colors={["#22c55e", "#16a34a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Your Profile</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (formError) {
                setFormError("");
              }
            }}
            placeholder="Enter your full name"
            placeholderTextColor="#6b7280"
            style={styles.input}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => {
              const selected = gender === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setGender(option);
                    if (formError) {
                      setFormError("");
                    }
                  }}
                  style={[styles.genderOption, selected && styles.genderOptionSelected]}
                >
                  <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          {Platform.OS === "android" && (
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text style={styles.dateText}>{formatDate(dateOfBirth)}</Text>
            </Pressable>
          )}

          {showDatePicker && (
            <View style={styles.datePickerCard}>
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={maxAllowedDob}
                onChange={onDateChange}
                themeVariant="light"
                textColor="#111827"
                style={styles.datePicker}
              />
            </View>
          )}

          {dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Pressable onPress={handleContinue} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Continue</Text>
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
    paddingTop: 72,
    paddingBottom: 28,
    gap: 18,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: "#052e16",
    textAlign: "center",
    marginBottom: 8,
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
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  genderOption: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  genderOptionSelected: {
    backgroundColor: "#166534",
    borderColor: "#14532d",
  },
  genderOptionText: {
    color: "#14532d",
    fontWeight: "700",
    fontSize: 14,
  },
  genderOptionTextSelected: {
    color: "#ffffff",
  },
  datePickerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20,83,45,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  datePicker: {
    height: 180,
    alignSelf: "stretch",
  },
  dateText: {
    color: "#111827",
    fontSize: 16,
  },
  errorText: {
    color: "#7f1d1d",
    fontSize: 14,
    fontWeight: "700",
  },
  button: {
    marginTop: "auto",
    borderRadius: 999,
    backgroundColor: "#15803d",
    borderWidth: 2,
    borderColor: "#14532d",
    paddingVertical: 16,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
});
