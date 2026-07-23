import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { supabase } from '@/lib/supabase';
import { saveUserProfile } from '@/lib/profileStorage';
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
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (!password) {
      setError("Please enter your password")
      return
    }
    setError("")
    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError("Incorrect email or password")
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }
      if (data.user) {
        await Promise.all([
          AsyncStorage.removeItem("lastMatchSession"),
          AsyncStorage.removeItem("lastProPackSession"),
        ])

        // Fetch profile from Supabase and sync to AsyncStorage
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileData) {
            await saveUserProfile({
              name: profileData.name ?? '',
              photo: profileData.photo_url ?? null,
              location: profileData.location ?? '',
              sport: profileData.sport ?? 'tennis',
              skillLevel: profileData.skill_level ?? '',
              availability: profileData.availability ?? [],
              purpose: profileData.purpose ?? '',
              tags: profileData.tags ?? [],
              work: profileData.work ?? '',
              university: profileData.university ?? '',
              notifications: {
                newMatches: true,
                newMessages: true,
                gameReminders: true,
              },
              gamesPlayed: profileData.games_played ?? 0,
            })
          }
        } catch {
          // fail silently - will use local data
        }

        // Fetch conversations from Supabase and sync to AsyncStorage
        try {
          const { data: convosData } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', data.user.id)
            .order('last_message_time', { ascending: false })

          if (convosData && convosData.length > 0) {
            const conversations = convosData.map((c: any) => ({
              id: c.id,
              playerName: c.player_name,
              playerLocation: c.player_location,
              playerSkill: c.player_skill,
              playerPurpose: c.player_purpose,
              playerAge: c.player_age,
              sportEmoji: c.sport_emoji,
              lastMessage: c.last_message,
              lastMessageTime: c.last_message_time,
              unread: c.unread,
              muted: c.muted,
              isOrganizerChat: c.is_organizer_chat,
              eventId: c.event_id,
              isProPlayer: c.is_pro_player,
              playerTitle: c.player_title,
            }))
            await AsyncStorage.setItem(
              'conversations',
              JSON.stringify(conversations)
            )
          }
        } catch {
          // fail silently - will use local data
        }

        // Fetch group chat conversations from Supabase
        try {
          const { data: groupConvosData } = await supabase
            .from('event_attendees')
            .select(`
              event_id,
              events (
                id,
                title,
                sport_emoji,
                organizer_name
              )
            `)
            .eq('user_id', data.user.id)

          if (groupConvosData && groupConvosData.length > 0) {
            const existingRaw = await AsyncStorage.getItem('groupChatConversations')
            const existing = existingRaw ? JSON.parse(existingRaw) : []

            const fromSupabase = groupConvosData
              .filter((a: any) => a.events)
              .map((a: any) => ({
                eventId: String(a.event_id),
                eventTitle: a.events.title ?? '',
                sportEmoji: a.events.sport_emoji ?? '🎾',
                organizer: a.events.organizer_name ?? '',
                lastMessage: '',
                lastMessageTime: Date.now(),
                unread: false,
                unreadCount: 0,
              }))

            // Merge with existing (keep local data if exists)
            const merged = fromSupabase.map((s: any) => {
              const local = existing.find((e: any) => e.eventId === s.eventId)
              return local ? { ...s, ...local } : s
            })

            await AsyncStorage.setItem(
              'groupChatConversations',
              JSON.stringify(merged)
            )
          }
        } catch {
          // fail silently
        }

        router.replace("/(tabs)/match")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
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
          disabled={loading}
          style={[styles.button, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
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
