import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setError("");
    router.replace("/(tabs)/match");
  };

  return (
    <LinearGradient
      colors={["#22c55e", "#16a34a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Log In</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError("");
            }}
            placeholder="Enter your email"
            placeholderTextColor="#6b7280"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
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
              placeholder="Enter your password"
              placeholderTextColor="#6b7280"
              style={styles.passwordInput}
              secureTextEntry={!showPassword}
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
        </View>

        <Pressable
          onPress={() => router.push("/(auth)/forgot-password")}
          style={styles.forgotLink}
        >
          <Text style={styles.forgotLinkText}>Forgot Password?</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={handleLogin}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Log In</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/signup")}
          style={styles.footerLink}
        >
          <Text style={styles.footerLinkText}>
            Don&apos;t have an account?{" "}
            <Text style={styles.footerLinkBold}>Sign Up</Text>
          </Text>
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
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
  },
  forgotLink: {
    alignSelf: "flex-end",
  },
  forgotLinkText: {
    color: "#052e16",
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
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
