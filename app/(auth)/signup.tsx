import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

const isValidEduEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.edu$/.test(trimmed);
};

const PASSWORD_CHECK_ITEMS = [
  { key: "length" as const, label: "8-16 characters" },
  { key: "uppercase" as const, label: "One uppercase letter" },
  { key: "lowercase" as const, label: "One lowercase letter" },
  { key: "number" as const, label: "One number" },
  { key: "special" as const, label: "One special character (!@#$%...)" },
];

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailExists, setEmailExists] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8 && password.length <= 16,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }),
    [password]
  );

  const handleSignUp = () => {
    setEmailExists(false);
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!isValidEduEmail(email)) {
      setError(
        "We currently only accept .edu email addresses during our trial period"
      );
      return;
    }
    if (!passwordChecks.length) {
      setError("Password must be 8-16 characters");
      return;
    }
    if (!passwordChecks.uppercase) {
      setError("Password must contain at least one uppercase letter");
      return;
    }
    if (!passwordChecks.lowercase) {
      setError("Password must contain at least one lowercase letter");
      return;
    }
    if (!passwordChecks.number) {
      setError("Password must contain at least one number");
      return;
    }
    if (!passwordChecks.special) {
      setError("Password must contain at least one special character");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    router.replace({
      pathname: "/(auth)/onboarding",
      params: { startSlide: "1" },
    });
  };

  return (
    <LinearGradient
      colors={["#22c55e", "#16a34a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create Account</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError("");
                if (emailExists) setEmailExists(false);
              }}
              placeholder="Your .edu email address"
              placeholderTextColor="#6b7280"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={{ color: "#ffffff", fontSize: 12, marginTop: 4, opacity: 0.8 }}>
              Currently accepting .edu emails only
            </Text>
            {emailExists && (
              <View style={{
                backgroundColor: "rgba(220,38,38,0.15)",
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#dc2626",
              }}>
                <Text style={{
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: "600",
                  textAlign: "center",
                }}>
                  This email is already registered.
                </Text>
                <Pressable onPress={() => router.push("/(auth)/login")}>
                  <Text style={{
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: "800",
                    textAlign: "center",
                    textDecorationLine: "underline",
                    marginTop: 4,
                  }}>
                    Log in instead →
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError("");
                }}
                placeholder="Create a password"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#94a3b8"
                />
              </Pressable>
            </View>

            <View style={styles.passwordChecklist}>
              {PASSWORD_CHECK_ITEMS.map(({ key, label }) => {
                const passed = passwordChecks[key];
                return (
                  <View key={key} style={styles.passwordCheckRow}>
                    <Text
                      style={[
                        styles.passwordCheckIcon,
                        passed ? styles.passwordCheckMet : styles.passwordCheckUnmet,
                      ]}
                    >
                      {passed ? "✅" : "❌"}
                    </Text>
                    <Text
                      style={[
                        styles.passwordCheckLabel,
                        passed ? styles.passwordCheckMet : styles.passwordCheckUnmet,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError("");
                }}
                placeholder="Confirm your password"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showConfirmPassword}
                style={styles.passwordInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#94a3b8"
                />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable onPress={handleSignUp} style={styles.createAccountBtn}>
            <Text style={styles.createAccountBtnText}>Create Account</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>
              Already have an account?{" "}
              <Text style={styles.footerLinkBold}>Log In</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 72,
    paddingBottom: 40,
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
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
  },
  passwordChecklist: {
    marginTop: 8,
    gap: 4,
  },
  passwordCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passwordCheckIcon: {
    fontSize: 13,
  },
  passwordCheckLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  passwordCheckMet: {
    color: "#15803d",
  },
  passwordCheckUnmet: {
    color: "#ffffff",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  createAccountBtn: {
    backgroundColor: "#15803d",
    borderRadius: 30,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createAccountBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footerLink: {
    marginTop: 8,
    alignItems: "center",
  },
  footerLinkText: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  footerLinkBold: {
    fontWeight: "900",
    color: "#052e16",
  },
});
