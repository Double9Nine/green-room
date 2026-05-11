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
            title: "Match Results",
            headerBackTitle: "Back",
            headerTintColor: "#15803d",
            headerStyle: { backgroundColor: "#f0fdf4" },
            headerTitleStyle: { color: "#0f172a", fontWeight: "700" },
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
