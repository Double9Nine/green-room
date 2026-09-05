import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  getJoinedStatusChangesCount,
  getUnreadGroupCount,
  getUnreadPrivateCount,
  incrementUnreadGroup,
  incrementUnreadPrivate,
} from "@/lib/notificationStore";
import { supabase } from "@/lib/supabase";
import { loadEventRequests } from "@/lib/eventRequestStorage";
import { CURRENT_USER_ID } from "@/lib/getCurrentUser";

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

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let groupChannel: ReturnType<typeof supabase.channel> | null = null
    let requestChannel: ReturnType<typeof supabase.channel> | null = null
    let approvalChannel: ReturnType<typeof supabase.channel> | null = null
    let cleaned = false

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cleaned) return

      // Remove any existing channels first
      await supabase.removeAllChannels()

      if (cleaned) return

      channel = supabase
        .channel(`global-chat-badge-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const newMsg = payload.new as any
            const convId = newMsg.conversation_id as string
            if (!convId.includes(user.id)) return
            if (newMsg.user_id === user.id) return

            await incrementUnreadPrivate()
            const [priv, grp] = await Promise.all([
              getUnreadPrivateCount(),
              getUnreadGroupCount(),
            ])
            setChatBadge(priv + grp)

            // Update conversation unread in AsyncStorage
            try {
              const raw = await AsyncStorage.getItem('conversations')
              const convos = raw ? JSON.parse(raw) : []
              const updated = convos.map((c: any) =>
                c.id === convId
                  ? {
                      ...c,
                      unread: true,
                      unreadCount: (c.unreadCount ?? 0) + 1,
                      lastMessage: newMsg.text ?? '',
                      lastMessageTime: newMsg.created_at,
                    }
                  : c
              )
              await AsyncStorage.setItem('conversations', JSON.stringify(updated))
            } catch {
              // fail silently
            }
          }
        )
        .subscribe()

      groupChannel = supabase
        .channel(`global-group-chat-badge-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
          },
          async (payload) => {
            const newMsg = payload.new as any
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (!currentUser) return
            if (newMsg.user_id === currentUser.id) return

            await incrementUnreadGroup()
            const [priv, grp] = await Promise.all([
              getUnreadPrivateCount(),
              getUnreadGroupCount(),
            ])
            setChatBadge(priv + grp)

            try {
              const raw = await AsyncStorage.getItem('groupChatConversations')
              const convos = raw ? JSON.parse(raw) : []
              const updated = convos.map((c: any) =>
                c.eventId === newMsg.event_id
                  ? {
                      ...c,
                      unread: true,
                      unreadCount: (c.unreadCount ?? 0) + 1,
                      lastMessage: newMsg.text ?? '',
                      lastMessageTime: newMsg.created_at,
                    }
                  : c
              )
              await AsyncStorage.setItem('groupChatConversations', JSON.stringify(updated))
            } catch {
              // fail silently
            }
          }
        )
        .subscribe()

      requestChannel = supabase
        .channel(`global-event-requests-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'event_attendees',
          },
          async (payload) => {
            const newRequest = payload.new as any
            if (newRequest.user_id === user.id) return // ignore own joins

            // Check if this request is for one of my events
            try {
              const { data: event } = await supabase
                .from('events')
                .select('organizer_id')
                .eq('id', newRequest.event_id)
                .single()

              if (event?.organizer_id !== user.id) return
              if (newRequest.status !== 'pending') return

              // Increment explore badge
              const raw = await AsyncStorage.getItem('exploreBadge')
              const current = raw ? parseInt(raw) : 0
              const next = current + 1
              await AsyncStorage.setItem('exploreBadge', String(next))
              setExploreBadge(next)
            } catch {
              // fail silently
            }
          }
        )
        .subscribe()

      approvalChannel = supabase
        .channel(`my-event-approvals-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'event_attendees',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const updated = payload.new as any
            if (updated.status !== 'approved' && updated.status !== 'confirmed') return

            // Fetch event details and add to group chat
            try {
              const { data: event } = await supabase
                .from('events')
                .select('id, title, sport_emoji, organizer_name')
                .eq('id', updated.event_id)
                .single()

              if (event) {
                const existingRaw = await AsyncStorage.getItem('groupChatConversations')
                const existing = existingRaw ? JSON.parse(existingRaw) : []
                const alreadyExists = existing.find((e: any) => e.eventId === String(event.id))

                if (!alreadyExists) {
                  const newConvo = {
                    eventId: String(event.id),
                    eventTitle: event.title ?? '',
                    sportEmoji: event.sport_emoji ?? '🎾',
                    organizer: event.organizer_name ?? '',
                    lastMessage: '',
                    lastMessageTime: Date.now(),
                    unread: true,
                    unreadCount: 0,
                  }
                  await AsyncStorage.setItem(
                    'groupChatConversations',
                    JSON.stringify([newConvo, ...existing])
                  )
                  // Update chat badge
                  const [priv, grp] = await Promise.all([
                    getUnreadPrivateCount(),
                    getUnreadGroupCount(),
                  ])
                  setChatBadge(priv + grp + 1)
                }
              }
            } catch {
              // fail silently
            }
          }
        )
        .subscribe()
    }

    void setupRealtime()

    return () => {
      cleaned = true
      if (channel) void supabase.removeChannel(channel)
      if (groupChannel) void supabase.removeChannel(groupChannel)
      if (requestChannel) void supabase.removeChannel(requestChannel)
      if (approvalChannel) void supabase.removeChannel(approvalChannel)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      const loadBadges = async () => {
        // Get pending requests from Supabase
        let pendingCount = 0
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: myEvents } = await supabase
              .from('events')
              .select('id')
              .eq('organizer_id', user.id)

            if (myEvents && myEvents.length > 0) {
              const myEventIds = myEvents.map((e: any) => e.id)
              const { data: pendingRequests } = await supabase
                .from('event_attendees')
                .select('id')
                .in('event_id', myEventIds)
                .eq('status', 'pending')
                .neq('user_id', user.id)

              pendingCount = pendingRequests?.length ?? 0
            }
          }
        } catch {
          // fail silently - use 0
        }

        const status = await getJoinedStatusChangesCount();
        const explore = pendingCount + status;

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
