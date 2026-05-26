import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { PlazaEvent } from "./(tabs)/explore";
import { formatEventTime } from "./(tabs)/explore";
import {
  displayUserLabel,
  getCurrentUser,
  isCurrentUser,
  type CurrentUser,
} from "../lib/getCurrentUser";
import { upsertGroupChatConversation } from "../lib/groupChatConversationsStorage";
import {
  applyMessagesForViewer,
  loadGroupChatMessages,
  type GroupChatMessage,
} from "../lib/groupChatStorage";
import {
  buildConfirmedMembersList,
  cancelJoinRequest,
  CURRENT_USER_ID,
  ensureDemoEventSeed,
  EVENT_MEMBERS_KEY,
  EVENT_REQUESTS_KEY,
  getMyStatusForEvent,
  leaveEvent,
  loadEventMembers,
  loadEventRequests,
  loadPendingRequests,
  saveEventRequests,
  savePendingRequests,
  type EventDisplayMember,
  type EventRequest,
  type EventRequestsByEvent,
  type MemberStatus,
  submitJoinRequest,
} from "../lib/eventRequestStorage";
import {
  incrementJoinedStatusChanges,
  incrementPendingRequests,
} from "../lib/notificationStore";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT_DARK = "#15803d";
const FULL_RED = "#dc2626";
const AVATAR_BLUE = "#dbeafe";
const PENDING_YELLOW = "#ca8a04";
const PENDING_BG = "#fef9c3";

const SPORT_PLACEHOLDER: Record<string, { bg: string; emoji: string }> = {
  Tennis: { bg: "#fed7aa", emoji: "🎾" },
  Pickleball: { bg: "#fef08a", emoji: "🏓" },
  Padel: { bg: "#d9f99d", emoji: "🎾" },
  Running: { bg: "#fecaca", emoji: "🏃" },
  Soccer: { bg: "#bbf7d0", emoji: "⚽" },
  Basketball: { bg: "#fed7aa", emoji: "🏀" },
  Volleyball: { bg: "#bfdbfe", emoji: "🏐" },
  Badminton: { bg: "#e9d5ff", emoji: "🏸" },
  Climbing: { bg: "#f5d0a9", emoji: "🧗" },
  Cycling: { bg: "#a7f3d0", emoji: "🚴" },
  Kickball: { bg: "#fde68a", emoji: "⚽" },
  Softball: { bg: "#fbcfe8", emoji: "🥎" },
  "Flag Football": { bg: "#fca5a5", emoji: "🏈" },
  Bowling: { bg: "#ddd6fe", emoji: "🎳" },
  "Table Tennis": { bg: "#bae6fd", emoji: "🏓" },
  Swimming: { bg: "#7dd3fc", emoji: "🏊" },
  "Social Event": { bg: "#f0abfc", emoji: "🎉" },
  Other: { bg: "#d1d5db", emoji: "🏅" },
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isEventExpired(event: { time?: string } | null | undefined): boolean {
  if (!event?.time) return false;
  const direct = new Date(event.time).getTime();
  if (!isNaN(direct)) return direct < Date.now();

  const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const match = event.time.match(
    /^(\w+),\s+(\w+)\s+(\d+),\s+(\d+):(\d+)$/
  );
  if (match) {
    const month = MONTHS[match[2]];
    if (month !== undefined) {
      const d = new Date(
        new Date().getFullYear(),
        month,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5]),
        0
      );
      return d.getTime() < Date.now();
    }
  }
  return false;
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    eventId?: string;
    eventData?: string;
  }>();

  const [event, setEvent] = useState<PlazaEvent | null>(null);
  const [myStatus, setMyStatus] = useState<MemberStatus>("none");
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: "You",
    initial: "Y",
  });
  const [eventMembersMap, setEventMembersMap] = useState<
    Record<string, import("../lib/eventRequestStorage").EventRequest[]>
  >({});
  const [groupChatPreview, setGroupChatPreview] = useState<GroupChatMessage[]>(
    []
  );
  const [toast, setToast] = useState("");

  const eventId = Number(params.eventId);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const refreshState = useCallback(async () => {
    if (!eventId) return;
    await ensureDemoEventSeed();

    const status = await getMyStatusForEvent(eventId);
    setMyStatus(status);

    const membersMap = await loadEventMembers();
    setEventMembersMap(membersMap);
  }, [eventId]);

  useEffect(() => {
    if (!params.eventData) return;
    try {
      const parsed = JSON.parse(params.eventData) as PlazaEvent;
      setEvent(parsed);
    } catch {
      setEvent(null);
    }
  }, [params.eventData]);

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(setCurrentUser);
      void refreshState();
    }, [refreshState])
  );

  const organizerName = event?.organizer ?? event?.user ?? "";
  const organizerInitial =
    event?.organizerInitial ?? getInitials(organizerName);
  const maxSpots = event?.maxSpots ?? 0;

  const isHost =
    !!event &&
    (event.createdByMe === true ||
      isCurrentUser(organizerName, currentUser.name) ||
      isCurrentUser(event.user, currentUser.name));

  const isOrganizer =
    !!event && isCurrentUser(organizerName, currentUser.name);
  const effectiveStatus: MemberStatus = isOrganizer ? "confirmed" : myStatus;

  const confirmedMembers = useMemo(() => {
    if (!event) return [] as EventDisplayMember[];
    return buildConfirmedMembersList(event, eventMembersMap, event.id);
  }, [event, eventMembersMap]);

  const displaySpots = event
    ? isOrganizer
      ? confirmedMembers.length
      : event.spots
    : 0;

  const isFull = event
    ? isOrganizer
      ? confirmedMembers.length >= event.maxSpots
      : event.spots >= event.maxSpots
    : false;

  const cannotJoin = isOrganizer ? false : (event?.spots ?? 0) >= maxSpots;

  const isPastEvent = event
    ? isEventExpired(event) || (event as unknown as { status?: string }).status === "past"
    : false;

  const validMembers = useMemo(
    () =>
      confirmedMembers.filter(
        (member) => member && member.name && member.name.length > 0
      ),
    [confirmedMembers]
  );

  const showGroupChatButton =
    (effectiveStatus === "confirmed" || isOrganizer || isHost) &&
    confirmedMembers.length >= 2;

  const showMemberList = isHost || effectiveStatus === "confirmed";
  const showMembersAndChat = showMemberList;

  const loadGroupChatPreview = useCallback(async () => {
    if (!event || !showMembersAndChat) return;
    const user = await getCurrentUser();
    const messages = await loadGroupChatMessages(event.id);
    const forViewer = applyMessagesForViewer(messages, user.name);
    setGroupChatPreview(forViewer.slice(0, 3));
  }, [event, showMembersAndChat]);

  useFocusEffect(
    useCallback(() => {
      void loadGroupChatPreview();
    }, [loadGroupChatPreview])
  );

  const openGroupChat = () => {
    if (!event) return;
    void (async () => {
      const messages = await loadGroupChatMessages(event.id);
      const last = messages[messages.length - 1];
      await upsertGroupChatConversation({
        eventId: String(event.id),
        eventTitle: event.title,
        sportEmoji: sportPlaceholder.emoji,
        organizer: organizerName,
        lastMessage: last?.text ?? "No messages yet",
        lastMessageTime: last ? Date.now() : Date.now(),
      });
      router.push({
        pathname: "/event-group-chat",
        params: {
          eventId: String(event.id),
          eventTitle: event.title,
          sportEmoji: sportPlaceholder.emoji,
          organizer: organizerName,
          memberCount: String(validMembers.length),
          memberInitials: JSON.stringify(
            validMembers
              .slice(0, 3)
              .map((m) => m?.name?.[0]?.toUpperCase() ?? "?")
          ),
        },
      });
    })();
  };

  const sportPlaceholder = event
    ? (SPORT_PLACEHOLDER[event.sport] ?? SPORT_PLACEHOLDER.Tennis)
    : SPORT_PLACEHOLDER.Tennis;
  const sportEmoji = sportPlaceholder.emoji;

  const eventProfileParams = (member: {
    name: string;
    skill: string;
    isOrganizer: boolean;
  }) => ({
    playerName: member?.name ?? "Unknown",
    playerSkill: member.skill || "",
    playerLocation: "",
    sportEmoji: sportPlaceholder.emoji,
    hideLocation: "true",
    hideAvailability: "true",
    isOrganizer: member.isOrganizer ? "true" : "false",
  });

  const openOrganizerProfile = () => {
    router.push({
      pathname: "/player-profile",
      params: eventProfileParams({
        name: organizerName,
        skill: "",
        isOrganizer: true,
      }),
    });
  };

  const openMessageOrganizer = () => {
    if (!event) return;
    router.push({
      pathname: "/chat-conversation",
      params: {
        playerId: `event-${event.id}-organizer-${organizerName}`,
        playerName: organizerName,
        sportEmoji: sportPlaceholder.emoji,
        isOrganizerChat: "true",
        eventId: String(event.id),
      },
    });
  };

  const openMessageMember = (member: EventDisplayMember) => {
    if (!event) return;
    router.push({
      pathname: "/chat-conversation",
      params: {
        playerId: `event-${event.id}-member-${member.name}`,
        playerName: member?.name ?? "Unknown",
        playerSkill: member.skill,
        sportEmoji: sportPlaceholder.emoji,
        isOrganizerChat: "true",
        eventId: String(event.id),
      },
    });
  };

  const openMemberProfile = (member: EventDisplayMember) => {
    router.push({
      pathname: "/player-profile",
      params: eventProfileParams({
        name: member?.name ?? "Unknown",
        skill: member.skill,
        isOrganizer: member.isOrganizer,
      }),
    });
  };

  const showOrganizerPreview =
    !isHost &&
    (effectiveStatus === "none" || effectiveStatus === "pending");

  const handleRequestToJoin = async () => {
    if (!event || cannotJoin) return;
    await submitJoinRequest(
      event.id,
      {
        name: currentUser.name,
        initial: currentUser.initial,
        userId: CURRENT_USER_ID,
      },
      event as unknown as Record<string, unknown>
    );
    setMyStatus("pending");
    await refreshState();
  };

  const handleCancelRequest = async () => {
    if (!event) return;
    await cancelJoinRequest(event.id);
    setMyStatus("none");
    await refreshState();
  };

  const handleRequestAgain = async () => {
    await handleRequestToJoin();
  };

  const handleLeaveEvent = async () => {
    if (!event) return;
    Alert.alert("Leave event?", "You will lose access to the group chat.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await leaveEvent(event.id);
            setMyStatus("none");
            await refreshState();
          })();
        },
      },
    ]);
  };

  const handleRemoveMember = (member: EventDisplayMember) => {
    if (!event || member.isOrganizer) return;

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.name} from this event?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const key = String(event.id);
              const membersRaw = await AsyncStorage.getItem(EVENT_MEMBERS_KEY);
              const allMembers = membersRaw
                ? (JSON.parse(membersRaw) as EventRequestsByEvent)
                : {};
              const eventMembers = allMembers[key] ?? [];
              const entry = eventMembers.find((m) => m.userName === member.name);

              allMembers[key] = eventMembers.filter((m) =>
                entry ? m.userId !== entry.userId : m.userName !== member.name
              );
              await AsyncStorage.setItem(
                EVENT_MEMBERS_KEY,
                JSON.stringify(allMembers)
              );

              const pending = await loadPendingRequests();
              if (entry) {
                await savePendingRequests({
                  ...pending,
                  [key]: (pending[key] ?? []).filter(
                    (r) => r.userId !== entry.userId
                  ),
                });
              }

              const requestsRaw = await AsyncStorage.getItem(EVENT_REQUESTS_KEY);
              const allRequests = requestsRaw
                ? (JSON.parse(requestsRaw) as EventRequest[])
                : [];
              const updatedRequests = allRequests.map((r) =>
                r.eventId === event.id && r.userName === member.name
                  ? { ...r, status: "removed" as MemberStatus }
                  : r
              );
              await AsyncStorage.setItem(
                EVENT_REQUESTS_KEY,
                JSON.stringify(updatedRequests)
              );

              const removedIsCurrentUser =
                entry?.userId === CURRENT_USER_ID ||
                isCurrentUser(member.name, currentUser.name);
              if (removedIsCurrentUser) {
                await incrementJoinedStatusChanges();
              }
              await refreshState();
              showToast(`${member.name} has been removed from the event`);
            })();
          },
        },
      ]
    );
  };

  const renderJoinAction = (
    label: string,
    onPress: () => void,
    enabled: boolean
  ) => (
    <Pressable
      disabled={!enabled}
      style={[
        styles.joinBottomBtn,
        enabled ? styles.joinBottomBtnActive : styles.joinBottomBtnDisabled,
      ]}
      onPress={() => {
        if (enabled) onPress();
      }}
    >
      <Text
        style={
          enabled
            ? styles.joinBottomBtnTextActive
            : styles.joinBottomBtnTextDisabled
        }
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderBottomBar = () => {
    if (isHost) return null;

    if (myStatus === "pending") {
      return (
        <Pressable
          style={[styles.joinBottomBtn, styles.joinBottomBtnCancel]}
          onPress={() => void handleCancelRequest()}
        >
          <Text style={styles.joinBottomBtnTextCancel}>Cancel Request</Text>
        </Pressable>
      );
    }

    if (myStatus === "confirmed" && !isOrganizer) {
      return (
        <Pressable onPress={() => handleLeaveEvent()}>
          <Text style={styles.leaveEventText}>Leave Event</Text>
        </Pressable>
      );
    }

    const canRequest = !cannotJoin;

    if (myStatus === "rejected") {
      return renderJoinAction(
        "Request Again",
        () => void handleRequestAgain(),
        canRequest
      );
    }

    const eventExpired = isEventExpired(event);

    if (myStatus === "none" && eventExpired) {
      return renderJoinAction("Event Has Passed", () => {}, false);
    }

    return renderJoinAction(
      "Request to Join",
      () => void handleRequestToJoin(),
      canRequest
    );
  };

  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Events</Text>
        </Pressable>
        <Text style={styles.errorText}>Event not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backBtnText}>← Back to Events</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {event.title}
          </Text>
          {showMembersAndChat ? (
            <Text style={styles.headerSubtitle}>Group Chat</Text>
          ) : null}
        </View>

        {!isPastEvent && __DEV__ && isOrganizer && event && event.id ? (
          <Pressable
            onPress={async () => {
              if (!event) return;

              const pending = await loadPendingRequests();
              const key = String(event.id);
              const eventPending = [...(pending[key] ?? [])];

              const dummyRequesters = [
                { name: "Test User A", initial: "A" },
                { name: "Test User B", initial: "B" },
                { name: "Test User C", initial: "C" },
                { name: "Test User D", initial: "D" },
              ];

              const picked =
                dummyRequesters[eventPending.length % dummyRequesters.length];
              const userId = `dev-generate-${Date.now()}-${eventPending.length}`;
              const entry = {
                eventId: event.id,
                userId,
                userName: picked.name,
                userInitial: picked.initial,
                status: "pending" as const,
                requestedAt: Date.now(),
              };

              eventPending.push(entry);
              await savePendingRequests({ ...pending, [key]: eventPending });

              let requests = await loadEventRequests();
              requests = [
                ...requests.filter(
                  (r) => !(r.eventId === event.id && r.userId === userId)
                ),
                entry,
              ];
              await saveEventRequests(requests);

              await incrementPendingRequests();
              await refreshState();
              showToast(`🧪 Request from ${picked.name} added!`);
            }}
            style={styles.devGenerateBtn}
          >
            <Text style={styles.devGenerateBtnText}>
              🧪 DEV: Generate Join Request
            </Text>
          </Pressable>
        ) : null}

        {!isPastEvent && __DEV__ && myStatus === "pending" && (
          <>
            <Pressable
              onPress={async () => {
                const user = await getCurrentUser();

                const requestsRaw = await AsyncStorage.getItem("eventRequests");
                const requests = requestsRaw ? JSON.parse(requestsRaw) : [];
                const updated = requests.map((r: any) =>
                  r.eventId === event.id ? { ...r, status: "confirmed" } : r
                );
                await AsyncStorage.setItem(
                  "eventRequests",
                  JSON.stringify(updated)
                );

                const membersRaw = await AsyncStorage.getItem("eventMembers");
                const allMembers = membersRaw ? JSON.parse(membersRaw) : {};
                const eventId = event.id;
                const eventMembers = (allMembers[eventId] || []).filter(
                  (m: any) => m && m.name
                );
                if (!eventMembers.find((m: any) => m.name === user.name)) {
                  eventMembers.push({
                    name: user.name,
                    initial: user.initial,
                    isOrganizer: false,
                  });
                }
                allMembers[eventId] = eventMembers;
                await AsyncStorage.setItem(
                  "eventMembers",
                  JSON.stringify(allMembers)
                );

                setMyStatus("confirmed");
                await incrementJoinedStatusChanges();
              }}
              style={{
                backgroundColor: "#f59e0b",
                padding: 8,
                borderRadius: 8,
                margin: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                🧪 DEV: Auto Approve My Request
              </Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                const requestsRaw = await AsyncStorage.getItem("eventRequests");
                const requests = requestsRaw ? JSON.parse(requestsRaw) : [];
                const updated = requests.map((r: any) =>
                  r.eventId === event.id ? { ...r, status: "rejected" } : r
                );
                await AsyncStorage.setItem(
                  "eventRequests",
                  JSON.stringify(updated)
                );
                setMyStatus("rejected");
                await incrementJoinedStatusChanges();
              }}
              style={{
                backgroundColor: "#dc2626",
                padding: 8,
                borderRadius: 8,
                margin: 16,
                marginTop: 0,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>
                🧪 DEV: Auto Reject My Request
              </Text>
            </Pressable>
          </>
        )}

        {!isPastEvent && __DEV__ && myStatus === "confirmed" && !isOrganizer ? (
          <Pressable
            onPress={async () => {
              const user = await getCurrentUser();
              const key = String(event.id);

              const membersRaw = await AsyncStorage.getItem(EVENT_MEMBERS_KEY);
              const allMembers = membersRaw
                ? (JSON.parse(membersRaw) as EventRequestsByEvent)
                : {};
              const eventMembers = allMembers[key] ?? [];
              allMembers[key] = eventMembers.filter(
                (m) =>
                  m.userId !== CURRENT_USER_ID && m.userName !== user.name
              );
              await AsyncStorage.setItem(
                EVENT_MEMBERS_KEY,
                JSON.stringify(allMembers)
              );

              const requestsRaw = await AsyncStorage.getItem(EVENT_REQUESTS_KEY);
              const allRequests = requestsRaw
                ? (JSON.parse(requestsRaw) as EventRequest[])
                : [];
              const updatedRequests = allRequests.map((r) =>
                r.eventId === event.id && r.userId === CURRENT_USER_ID
                  ? { ...r, status: "removed" as MemberStatus }
                  : r
              );
              await AsyncStorage.setItem(
                EVENT_REQUESTS_KEY,
                JSON.stringify(updatedRequests)
              );

              await incrementJoinedStatusChanges();
              setMyStatus("removed");
              showToast("🧪 DEV: You have been removed from this event");
            }}
            style={styles.devSimulateRemovedBtn}
          >
            <Text style={styles.devSimulateRemovedBtnText}>
              🧪 DEV: Simulate Being Removed
            </Text>
          </Pressable>
        ) : null}

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
        >
          {myStatus === "pending" ? (
            <View style={styles.statusBannerPending}>
              <Text style={styles.statusBannerPendingText}>
                ⏳ Request Pending
              </Text>
            </View>
          ) : null}
          {myStatus === "rejected" ? (
            <View style={styles.statusBannerRejected}>
              <Text style={styles.statusBannerRejectedText}>
                ❌ Request Declined
              </Text>
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <View style={styles.infoCardTop}>
              <View style={styles.infoCardTitleRow}>
                <Text style={styles.sportEmoji}>{sportEmoji}</Text>
                <View style={styles.infoCardTitleWrap}>
                  <Text style={styles.infoCardTitle}>{event.title}</Text>
                  <Text style={styles.hostedBy}>Hosted by {organizerName}</Text>
                </View>
              </View>
              {isPastEvent ? (
                <View
                  style={{
                    backgroundColor: "#f1f5f9",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text style={{ color: "#64748b", fontWeight: "700", fontSize: 13 }}>
                    📅 Event Ended
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.statusPill,
                    isFull ? styles.statusPillFull : styles.statusPillOpen,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isFull ? styles.statusPillTextFull : styles.statusPillTextOpen,
                    ]}
                  >
                    {isFull ? "Event Full" : "Open"}
                  </Text>
                </View>
              )}
            </View>

            {event.details ? (
              <Text style={styles.eventDescription}>{event.details}</Text>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoRowText}>📍 {event.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoRowText}>🕐 {formatEventTime(event.time)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.infoRowText,
                  isFull ? styles.spotsFull : styles.spotsAvailable,
                ]}
              >
                👥 {displaySpots}/{maxSpots}
                {isFull
                  ? " (Full)"
                  : ` · ${maxSpots - displaySpots} spots left`}
              </Text>
            </View>
          </View>

          {!isPastEvent && showOrganizerPreview ? (
            <>
              <Pressable
                onPress={openOrganizerProfile}
                style={styles.organizerPreviewCard}
              >
                <View style={styles.organizerPreviewAvatar}>
                  <Text style={styles.organizerPreviewAvatarText}>
                    {organizerName[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={styles.organizerPreviewMeta}>
                  <Text style={styles.organizerPreviewLabel}>Organized by</Text>
                  <Text style={styles.organizerPreviewName}>{organizerName}</Text>
                  <Text style={styles.organizerPreviewHint}>
                    Tap to view profile →
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={openMessageOrganizer}
                style={styles.messageOrganizerBtnLarge}
              >
                <Text style={styles.messageOrganizerBtnLargeText}>
                  Message Organizer
                </Text>
              </Pressable>
            </>
          ) : null}

          {!isPastEvent && !showOrganizerPreview && !isHost && myStatus === "rejected" ? (
            <Pressable
              onPress={openMessageOrganizer}
              style={styles.messageOrganizerBtnLarge}
            >
              <Text style={styles.messageOrganizerBtnLargeText}>
                Message Organizer
              </Text>
            </Pressable>
          ) : null}

          {!isPastEvent && showMemberList ? (
            <>
              {showGroupChatButton ? (
                <Pressable
                  onPress={openGroupChat}
                  style={styles.groupChatNavBtn}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color={WHITE}
                  />
                  <Text style={styles.groupChatNavBtnText}>Group Chat</Text>
                </Pressable>
              ) : null}
              <Text style={styles.sectionTitle}>
                Event Members ({validMembers.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.membersScroll}
                contentContainerStyle={styles.membersRow}
              >
                {validMembers.map((member, index) => (
                  <View
                    key={`member-${index}-${member?.name ?? "unknown"}`}
                    style={styles.memberListItem}
                  >
                    <View style={styles.memberAvatarWrap}>
                      <Pressable onPress={() => openMemberProfile(member)}>
                        <View style={styles.memberListAvatar}>
                          <Text style={styles.memberListAvatarText}>
                            {getInitials(member?.name ?? "?").slice(0, 1) ||
                              "?"}
                          </Text>
                        </View>
                      </Pressable>
                      {isOrganizer && !member.isOrganizer ? (
                        <Pressable
                          onPress={() => handleRemoveMember(member)}
                          style={styles.memberRemoveBtn}
                          hitSlop={6}
                        >
                          <Text style={styles.memberRemoveBtnText}>×</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={styles.memberListFirstName}>
                      {displayUserLabel(
                        member?.name ?? "Unknown",
                        currentUser.name
                      ).split(" ")[0]}
                    </Text>
                    {member.isOrganizer ? (
                      <Text style={styles.memberListOrganizerLabel}>
                        Organizer
                      </Text>
                    ) : null}
                    {isHost && !member.isOrganizer ? (
                      <Pressable
                        onPress={() => openMessageMember(member)}
                        style={styles.memberMessageBtn}
                      >
                        <Text style={styles.memberMessageBtnText}>Message</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
              {!isHost ? (
                <Pressable
                  onPress={openMessageOrganizer}
                  style={styles.messageOrganizerBtnLarge}
                >
                  <Text style={styles.messageOrganizerBtnLargeText}>
                    Message Organizer
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {!isPastEvent && showMembersAndChat ? (
            <>
              <Text style={styles.sectionTitle}>Group Chat</Text>
              <View style={styles.chatCard}>
                {groupChatPreview.length === 0 ? (
                  <Text style={styles.chatEmptyText}>
                    No messages yet. Say hi when the event fills up!
                  </Text>
                ) : (
                  groupChatPreview.map((msg) => {
                    if (msg.sent) {
                      return (
                        <View key={msg.id} style={styles.chatPreviewRowSent}>
                          <View style={styles.chatPreviewBubbleSent}>
                            <Text style={styles.chatPreviewTextSent}>
                              {msg.text}
                            </Text>
                          </View>
                        </View>
                      );
                    }

                    const member = validMembers.find(
                      (m) => m?.name === msg.sender
                    );
                    return (
                      <Pressable
                        key={msg.id}
                        onPress={() => member && openMemberProfile(member)}
                        style={styles.chatMessageRow}
                      >
                        <View style={styles.chatAvatar}>
                          <Text style={styles.chatAvatarText}>{msg.initial}</Text>
                        </View>
                        <View style={styles.chatMessageBody}>
                          <Text style={styles.chatPreviewSenderName}>
                            {msg.sender}
                          </Text>
                          <View style={styles.chatPreviewBubbleReceived}>
                            <Text style={styles.chatPreviewTextReceived}>
                              {msg.text}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {isPastEvent ? (
            <Text
              style={{
                color: "#94a3b8",
                textAlign: "center",
                fontSize: 14,
                fontStyle: "italic",
                marginTop: 16,
              }}
            >
              This event has already taken place.
            </Text>
          ) : (
            renderBottomBar()
          )}
        </View>

        {toast ? (
          <View style={[styles.toastWrap, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 15, fontWeight: "600", color: ACCENT_DARK },
  headerTitle: { fontSize: 22, fontWeight: "900", color: TEXT, marginTop: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: "600", color: MUTED, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  statusBannerPending: {
    backgroundColor: PENDING_BG,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fde047",
  },
  statusBannerPendingText: {
    fontSize: 14,
    fontWeight: "800",
    color: PENDING_YELLOW,
    textAlign: "center",
  },
  statusBannerRejected: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  statusBannerRejectedText: {
    fontSize: 14,
    fontWeight: "800",
    color: FULL_RED,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  infoCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoCardTitleRow: { flexDirection: "row", alignItems: "flex-start", flex: 1, marginRight: 8 },
  sportEmoji: { fontSize: 32, marginRight: 10 },
  infoCardTitleWrap: { flex: 1 },
  infoCardTitle: { fontSize: 20, fontWeight: "900", color: TEXT },
  hostedBy: { fontSize: 14, fontWeight: "600", color: MUTED, marginTop: 4 },
  eventDescription: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 12,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillOpen: { backgroundColor: "#dcfce7" },
  statusPillFull: { backgroundColor: "#f1f5f9" },
  statusPillText: { fontSize: 12, fontWeight: "800" },
  statusPillTextOpen: { color: ACCENT_DARK },
  statusPillTextFull: { color: MUTED },
  infoRow: { marginTop: 8 },
  infoRowText: { fontSize: 15, fontWeight: "600", color: TEXT },
  spotsAvailable: { color: ACCENT_DARK },
  spotsFull: { color: FULL_RED, fontWeight: "800" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
    marginTop: 20,
    marginBottom: 12,
  },
  membersScroll: {
    overflow: "visible",
  },
  membersRow: {
    paddingRight: 8,
    overflow: "visible",
  },
  memberListItem: {
    alignItems: "center",
    marginRight: 16,
    overflow: "visible",
  },
  memberAvatarWrap: {
    position: "relative",
    overflow: "visible",
  },
  memberRemoveBtn: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
    zIndex: 999,
  },
  memberRemoveBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  memberListAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
  },
  memberListAvatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e40af",
  },
  memberListFirstName: {
    fontSize: 12,
    color: TEXT,
    marginTop: 6,
    fontWeight: "600",
    textAlign: "center",
  },
  memberListOrganizerLabel: {
    fontSize: 10,
    color: ACCENT_DARK,
    fontWeight: "700",
    textAlign: "center",
  },
  messageOrganizerBtn: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    alignSelf: "center",
  },
  messageOrganizerBtnText: { color: WHITE, fontSize: 11, fontWeight: "700" },
  organizerPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dcfce7",
    marginTop: 12,
  },
  organizerPreviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  organizerPreviewAvatarText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "800",
  },
  organizerPreviewMeta: { flex: 1 },
  organizerPreviewLabel: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
  },
  organizerPreviewName: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  organizerPreviewHint: {
    fontSize: 12,
    color: ACCENT_DARK,
    fontWeight: "600",
    marginTop: 2,
  },
  groupChatNavBtn: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    alignSelf: "stretch",
  },
  groupChatNavBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  messageOrganizerBtnLarge: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  messageOrganizerBtnLargeText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
  },
  memberMessageBtn: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: "center",
  },
  memberMessageBtnText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "700",
  },
  hostMessageBtn: {
    backgroundColor: "#e0f2fe",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 4,
    alignSelf: "center",
  },
  hostMessageBtnText: {
    color: "#0369a1",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  memberHostActions: { alignItems: "center", marginTop: 4, gap: 4 },
  removeMemberText: { fontSize: 10, fontWeight: "700", color: FULL_RED },
  chatCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 16,
  },
  chatPreviewRowSent: {
    alignItems: "flex-end",
    marginBottom: 4,
  },
  chatPreviewBubbleSent: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "85%",
  },
  chatPreviewTextSent: {
    fontSize: 14,
    color: WHITE,
    lineHeight: 20,
  },
  chatPreviewSenderName: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED,
    marginBottom: 2,
    marginLeft: 4,
  },
  chatPreviewBubbleReceived: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  chatPreviewTextReceived: {
    fontSize: 14,
    color: TEXT,
    lineHeight: 20,
  },
  chatMessageRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AVATAR_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarText: { fontSize: 15, fontWeight: "800", color: "#1d4ed8" },
  chatMessageBody: { flex: 1 },
  chatMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chatMessageName: { fontSize: 14, fontWeight: "800", color: TEXT, flex: 1 },
  chatEmptyText: { fontSize: 14, color: MUTED, textAlign: "center", paddingVertical: 16 },
  chatMessageText: { fontSize: 14, color: MUTED, marginTop: 4, lineHeight: 20 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  capacityText: {
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
    marginBottom: 10,
  },
  joinBottomBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  joinBottomBtnActive: { backgroundColor: ACCENT_DARK },
  joinBottomBtnCancel: { backgroundColor: BORDER },
  joinBottomBtnDisabled: { backgroundColor: BORDER },
  joinBottomBtnTextActive: { color: WHITE, fontSize: 16, fontWeight: "800" },
  joinBottomBtnTextCancel: { color: TEXT, fontSize: 16, fontWeight: "700" },
  joinBottomBtnTextDisabled: { color: MUTED, fontSize: 16, fontWeight: "700" },
  leaveEventText: {
    color: FULL_RED,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 16,
  },
  errorText: { marginTop: 24, textAlign: "center", fontSize: 16, color: MUTED },
  devGenerateBtn: {
    backgroundColor: "#0ea5e9",
    padding: 8,
    borderRadius: 8,
    margin: 16,
    alignItems: "center",
  },
  devGenerateBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  devSimulateRemovedBtn: {
    backgroundColor: "#dc2626",
    padding: 8,
    borderRadius: 8,
    margin: 16,
    alignItems: "center",
  },
  devSimulateRemovedBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  toastWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#052e16",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 20,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
