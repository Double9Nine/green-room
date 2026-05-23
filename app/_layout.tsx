import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
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
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
