import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/signup"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(auth)/forgot-password"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(auth)/onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(auth)/create-profile"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="(auth)/additional-info"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="match-filter"
          options={{
            headerShown: false,
            title: "Match filter",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="match-results"
          options={{
            headerShown: true,
            title: "MY MATCHES",
            headerBackTitle: "Back",
            headerTintColor: "#d4af37",
            headerStyle: { backgroundColor: "#052e16" },
            headerTitleStyle: { color: "#d4af37", fontWeight: "800" },
          }}
        />
        <Stack.Screen
          name="chat-conversation"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="player-profile"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="my-player-card"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="event-details"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="event-group-chat"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="my-profile"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
