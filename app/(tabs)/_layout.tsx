import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  getExploreBadgeCount,
  getUnreadGroupCount,
  getUnreadPrivateCount,
} from "@/lib/notificationStore";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT = "#22c55e";
const ACCENT_DARK = "#15803d";

export default function TabsLayout() {
  const [exploreBadge, setExploreBadge] = useState(0);
  const [chatBadge, setChatBadge] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadBadges = async () => {
        const explore = await getExploreBadgeCount();
        const [priv, grp] = await Promise.all([
          getUnreadPrivateCount(),
          getUnreadGroupCount(),
        ]);
        const chat = priv + grp;
        setExploreBadge(explore);
        setChatBadge(chat);
      };
      void loadBadges();
      const interval = setInterval(() => {
        void loadBadges();
      }, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: BG },
        tabBarActiveTintColor: ACCENT_DARK,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: WHITE,
          borderTopWidth: 0,
          ...Platform.select({
            ios: {
              shadowColor: TEXT,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
            },
            default: {},
          }),
        },
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: WHITE,
              borderTopWidth: 3,
              borderTopColor: ACCENT,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: BORDER,
            }}
          />
        ),
        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="match"
        options={{
          title: "Match",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "tennisball" : "tennisball-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarBadge: exploreBadge > 0 ? exploreBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: "#dc2626" },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: chatBadge > 0 ? chatBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: "#dc2626" },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
