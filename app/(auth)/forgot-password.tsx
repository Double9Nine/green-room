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

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    // TODO: Replace with Supabase:
    // const { error } = await supabase.auth.resetPasswordForEmail(email)
    // if (error) setError('No account found with this email')
    // else setSuccess(true)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);
    setSuccess(true);
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
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link.
        </Text>

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

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={{ fontSize: 24 }}>📧</Text>
            <Text style={styles.successTitle}>Check your email!</Text>
            <Text style={styles.successBody}>
              We sent a password reset link to {email}
            </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.successLink}>Back to Log In →</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={handleSendReset}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Sending..." : "Send Reset Link"}
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
    marginBottom: 4,
  },
  subtitle: {
    textAlign: "center",
    color: "#14532d",
    fontSize: 16,
    fontWeight: "700",
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
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  errorText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  successBox: {
    backgroundColor: "rgba(21,128,61,0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#15803d",
    alignItems: "center",
    gap: 8,
  },
  successTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  successBody: {
    color: "#ffffff",
    fontSize: 13,
    textAlign: "center",
    opacity: 0.8,
  },
  successLink: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  button: {
    borderRadius: 30,
    backgroundColor: "#15803d",
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#86efac",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
});
