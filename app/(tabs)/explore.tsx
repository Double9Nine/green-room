import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  approveJoinRequest,
  buildConfirmedMembersList,
  cancelJoinRequest,
  CURRENT_USER_ID,
  declineJoinRequest,
  ensureDemoEventSeed,
  EVENT_MEMBERS_KEY,
  EVENT_REQUESTS_KEY,
  formatRequestAgo,
  getConfirmedForEvent,
  getMyStatusFromList,
  getPendingForEvent,
  leaveEvent,
  loadEventMembers,
  loadEventRequests,
  loadPendingRequests,
  resolveEventSpotsAndMembers,
  submitJoinRequest,
  type EventRequest,
  type EventRequestsByEvent,
  type MemberStatus,
} from "../../lib/eventRequestStorage";
import { getCurrentUser } from "../../lib/getCurrentUser";
import { upsertGroupChatConversation } from "../../lib/groupChatConversationsStorage";
import { loadGroupChatMessages } from "../../lib/groupChatStorage";
import {
  clearJoinedStatusChanges,
  clearPendingRequests,
  getJoinedStatusChangesCount,
  getPendingRequestsCount,
} from "../../lib/notificationStore";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const PLACEHOLDER = "#94a3b8";
const ACCENT = "#22c55e";
const ACCENT_DARK = "#15803d";

const MY_EVENTS_KEY = "myEvents";
const JOINED_EVENTS_KEY = "joinedEvents";

const EVENT_TYPES = [
  "Casual Match",
  "Tournament",
  "Training Session",
  "Group Run",
  "Friendly Game",
  "Open Session",
] as const;

const SORT_OPTIONS = ["Latest", "Nearest", "Popular"] as const;

const FILTER_SPORTS = [
  "All Sports",
  "Tennis",
  "Pickleball",
  "Padel",
  "Running",
  "Soccer",
  "Basketball",
  "Volleyball",
  "Badminton",
  "Climbing",
  "Cycling",
  "Kickball",
  "Softball",
  "Flag Football",
  "Bowling",
  "Table Tennis",
  "Swimming",
  "Social Event",
  "Other",
] as const;

const CREATE_EVENT_SPORTS = FILTER_SPORTS.filter((s) => s !== "All Sports");

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
  "Social Event": { bg: "#f0abfc", emoji: "🎉" },
  Swimming: { bg: "#7dd3fc", emoji: "🏊" },
  Other: { bg: "#d1d5db", emoji: "🏅" },
};

type SubTab = "discover" | "my" | "joined";

export type PlazaEvent = {
  id: number;
  user: string;
  organizer: string;
  organizerInitial: string;
  sport: string;
  title: string;
  location: string;
  distance: string;
  time: string;
  postedAgo: string;
  spots: number;
  maxSpots: number;
  likes: number;
  comments: number;
  createdByMe?: boolean;
  eventType?: string;
  details?: string;
  dateLabel?: string;
  timeLabel?: string;
  status?: string;
  attended?: boolean;
  attendanceAnswered?: boolean;
};

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
};

function withOrganizer(
  event: Omit<PlazaEvent, "organizer" | "organizerInitial">
): PlazaEvent {
  return {
    ...event,
    organizer: event.user,
    organizerInitial: event.user
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}

function resolvePlazaEventFromRequest(
  req: EventRequest,
  events: PlazaEvent[]
): PlazaEvent | null {
  const stored = req.eventData as PlazaEvent | undefined;
  if (stored && typeof stored === "object" && typeof stored.id === "number") {
    if (!stored.organizer) {
      return withOrganizer(
        stored as Omit<PlazaEvent, "organizer" | "organizerInitial">
      );
    }
    return stored;
  }
  return events.find((e) => e.id === req.eventId) ?? null;
}

function isEventExpired(
  eventData: { time?: string } | string | null | undefined
): boolean {
  if (!eventData) return false;
  const timeStr =
    typeof eventData === "string" ? eventData : eventData.time || "";
  if (!timeStr) return false;

  const direct = new Date(timeStr).getTime();
  if (!isNaN(direct)) return direct < Date.now();

  const match = timeStr.match(/^(\w+),\s+(\w+)\s+(\d+),\s+(\d+):(\d+)$/);
  if (match) {
    const MONTHS: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = MONTHS[match[2]];
    if (month !== undefined) {
      const d = new Date(
        new Date().getFullYear(),
        month,
        parseInt(match[3], 10),
        parseInt(match[4], 10),
        parseInt(match[5], 10),
        0
      );
      return d.getTime() < Date.now();
    }
  }
  return false;
}

function CollapsibleSection({
  title,
  count,
  defaultExpanded = false,
  showWhenEmpty = false,
  children,
}: {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  /** Past sections: always visible with empty state when count is 0 */
  showWhenEmpty?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (count === 0 && !showWhenEmpty) return null;

  return (
    <View style={styles.collapsibleSection}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[
          styles.collapsibleHeader,
          expanded && styles.collapsibleHeaderExpanded,
        ]}
      >
        <Text style={styles.collapsibleTitle}>
          {title} ({count})
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={MUTED}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.collapsibleBody}>
          {count === 0 &&
          showWhenEmpty &&
          Children.count(children) === 0 ? (
            <View style={styles.collapsibleEmpty}>
              <Text style={styles.collapsibleEmptyText}>No events yet</Text>
            </View>
          ) : (
            children
          )}
        </View>
      ) : null}
    </View>
  );
}

function PastEventCard({
  event,
  badge,
  badgeColor,
  badgeTextColor,
  onPress,
}: {
  event: PlazaEvent;
  badge: string;
  badgeColor: string;
  badgeTextColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.joinedStatusCard,
        styles.joinedAccentExpired,
        styles.pastEventCard,
      ]}
    >
      <Text style={styles.joinedStatusTitle}>{event.title}</Text>
      <Text style={styles.joinedStatusMeta}>
        {event.sport} · {formatEventTime(event.time)}
      </Text>
      <Text style={styles.joinedStatusMeta}>📍 {event.location}</Text>
      <View style={[styles.pastEventBadge, { backgroundColor: badgeColor }]}>
        <Text style={[styles.pastEventBadgeText, { color: badgeTextColor }]}>
          {badge}
        </Text>
      </View>
    </Pressable>
  );
}

function DismissableCard({
  event,
  badge,
  badgeColor,
  badgeTextColor,
  onDismiss,
  onRequestAgain,
  showRequestAgain = false,
  onCardPress,
}: {
  event: PlazaEvent;
  badge: string;
  badgeColor: string;
  badgeTextColor: string;
  onDismiss: () => void;
  onRequestAgain?: () => void;
  showRequestAgain?: boolean;
  onCardPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onCardPress}
      style={[styles.joinedStatusCard, styles.joinedAccentExpired, styles.dismissableCard]}
    >
      <Text style={styles.joinedStatusTitle}>{event.title}</Text>
      <Text style={styles.joinedStatusMeta}>
        {event.sport} · {formatEventTime(event.time)}
      </Text>
      <Text style={styles.joinedStatusMeta}>📍 {event.location}</Text>
      <View style={[styles.pastEventBadge, { backgroundColor: badgeColor }]}>
        <Text style={[styles.pastEventBadgeText, { color: badgeTextColor }]}>
          {badge}
        </Text>
      </View>
      <View style={styles.joinedCardActions}>
        {showRequestAgain ? (
          <Pressable
            onPress={(e) => {
              stopCardPress(e);
              onRequestAgain?.();
            }}
            hitSlop={8}
          >
            <Text style={styles.joinedTextBtnGreen}>Request Again</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={(e) => {
            stopCardPress(e);
            onDismiss();
          }}
          hitSlop={8}
        >
          <Text style={styles.joinedTextBtnGray}>Dismiss</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

type JoinedStatusCardProps = {
  event: PlazaEvent;
  variant: "pending";
  onCardPress: () => void;
  onCancel?: () => void;
};

function JoinedStatusCard({
  event,
  variant,
  onCardPress,
  onCancel,
}: JoinedStatusCardProps) {
  return (
    <Pressable
      onPress={onCardPress}
      style={[styles.joinedStatusCard, styles.joinedAccentYellow]}
    >
      <Text style={styles.joinedStatusTitle}>{event.title}</Text>
      <Text style={styles.joinedStatusMeta}>
        {event.sport} · {formatEventTime(event.time)}
      </Text>
      <Text style={styles.joinedStatusMeta}>📍 {event.location}</Text>
      {variant === "pending" ? (
        <View style={styles.joinedBadgePending}>
          <Text style={styles.joinedBadgePendingText}>⏳ Awaiting Approval</Text>
        </View>
      ) : null}
      <View style={styles.joinedCardActions}>
        <Pressable
          onPress={(e) => {
            stopCardPress(e);
            onCancel?.();
          }}
          hitSlop={8}
        >
          <Text style={styles.joinedTextBtnGray}>Cancel Request</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const DUMMY_EVENTS: PlazaEvent[] = [
  withOrganizer({
    id: 1,
    user: "Sarah M.",
    sport: "Tennis",
    title: "Morning Tennis Singles Match",
    location: "Central Park Tennis Courts, NY",
    distance: "0.8 mi",
    time: "2026-06-10T09:00:00",
    postedAgo: "1h ago",
    spots: 2,
    maxSpots: 2,
    likes: 18,
    comments: 6,
    details: "Looking for a 3.5+ player for a friendly singles match.",
  }),
  withOrganizer({
    id: 2,
    user: "Mike L.",
    sport: "Pickleball",
    title: "Pickleball Beginner Meetup",
    location: "Hudson Yards Courts, NY",
    distance: "1.2 mi",
    time: "2026-06-10T11:00:00",
    postedAgo: "2h ago",
    spots: 3,
    maxSpots: 6,
    likes: 24,
    comments: 9,
    details: "All levels welcome! Paddles provided.",
  }),
  withOrganizer({
    id: 3,
    user: "Emma R.",
    sport: "Padel",
    title: "Padel Doubles Session",
    location: "Padel Haus, Brooklyn",
    distance: "2.1 mi",
    time: "2026-06-11T19:00:00",
    postedAgo: "3h ago",
    spots: 2,
    maxSpots: 4,
    likes: 12,
    comments: 4,
    details: "Looking for two more players for a fun doubles game.",
  }),
  withOrganizer({
    id: 4,
    user: "James K.",
    sport: "Running",
    title: "Central Park 5K Group Run",
    location: "Central Park, NY",
    distance: "0.5 mi",
    time: "2026-06-10T06:30:00",
    postedAgo: "30m ago",
    spots: 8,
    maxSpots: 15,
    likes: 31,
    comments: 11,
    details: "Easy pace group run. All levels welcome!",
  }),
  withOrganizer({
    id: 5,
    user: "Carlos R.",
    sport: "Soccer",
    title: "Sunday Soccer Pickup Game",
    location: "Pier 40 Soccer Fields, NY",
    distance: "1.5 mi",
    time: "2026-06-14T10:00:00",
    postedAgo: "4h ago",
    spots: 6,
    maxSpots: 14,
    likes: 42,
    comments: 15,
    details: "Casual pickup game. Bring your own cleats.",
  }),
  withOrganizer({
    id: 6,
    user: "Marcus T.",
    sport: "Basketball",
    title: "3v3 Basketball Pickup",
    location: "West 4th Street Courts, NY",
    distance: "0.9 mi",
    time: "2026-06-11T17:00:00",
    postedAgo: "5h ago",
    spots: 2,
    maxSpots: 6,
    likes: 28,
    comments: 8,
    details: "Competitive but friendly 3v3. All skill levels.",
  }),
  withOrganizer({
    id: 7,
    user: "Lisa C.",
    sport: "Volleyball",
    title: "Beach Volleyball Session",
    location: "Rockaway Beach, Queens",
    distance: "8.2 mi",
    time: "2026-06-13T13:00:00",
    postedAgo: "6h ago",
    spots: 4,
    maxSpots: 12,
    likes: 35,
    comments: 13,
    details: "Fun beach volleyball session. Beginners welcome!",
  }),
  withOrganizer({
    id: 8,
    user: "Amy W.",
    sport: "Badminton",
    title: "Casual Badminton Session",
    location: "YMCA Courts, Brooklyn",
    distance: "2.1 mi",
    time: "2026-06-11T19:00:00",
    postedAgo: "7h ago",
    spots: 3,
    maxSpots: 4,
    likes: 12,
    comments: 4,
    details: "Relaxed game, all levels welcome. Shuttlecocks provided.",
  }),
  withOrganizer({
    id: 9,
    user: "David W.",
    sport: "Climbing",
    title: "Indoor Bouldering Session",
    location: "Brooklyn Boulders, Brooklyn",
    distance: "2.5 mi",
    time: "2026-06-11T18:00:00",
    postedAgo: "8h ago",
    spots: 5,
    maxSpots: 8,
    likes: 22,
    comments: 7,
    details: "Beginner to intermediate routes. Shoes available to rent.",
  }),
  withOrganizer({
    id: 10,
    user: "Tom H.",
    sport: "Cycling",
    title: "Sunday Morning Bike Ride",
    location: "Hudson River Greenway, NY",
    distance: "0.3 mi",
    time: "2026-06-14T08:00:00",
    postedAgo: "9h ago",
    spots: 6,
    maxSpots: 10,
    likes: 19,
    comments: 5,
    details: "15-mile scenic ride along the Hudson. Moderate pace.",
  }),
  withOrganizer({
    id: 11,
    user: "Rachel K.",
    sport: "Kickball",
    title: "Kickball Pickup Game",
    location: "McCarren Park, Brooklyn",
    distance: "3.1 mi",
    time: "2026-06-13T15:00:00",
    postedAgo: "10h ago",
    spots: 7,
    maxSpots: 16,
    likes: 38,
    comments: 12,
    details: "Super fun and casual kickball game. No experience needed!",
  }),
  withOrganizer({
    id: 12,
    user: "Jake M.",
    sport: "Softball",
    title: "Co-ed Softball Game",
    location: "Heckscher Fields, Central Park",
    distance: "1.4 mi",
    time: "2026-06-14T11:00:00",
    postedAgo: "11h ago",
    spots: 5,
    maxSpots: 18,
    likes: 27,
    comments: 9,
    details: "Friendly co-ed softball. Gloves provided for those who need.",
  }),
  withOrganizer({
    id: 13,
    user: "Nina P.",
    sport: "Flag Football",
    title: "Flag Football Pickup Game",
    location: "Randalls Island, NY",
    distance: "4.2 mi",
    time: "2026-06-13T14:00:00",
    postedAgo: "12h ago",
    spots: 4,
    maxSpots: 14,
    likes: 33,
    comments: 11,
    details: "7v7 flag football. All positions needed!",
  }),
  withOrganizer({
    id: 14,
    user: "Steve B.",
    sport: "Bowling",
    title: "Bowling Night Out",
    location: "Bowlero Manhattan, NY",
    distance: "1.8 mi",
    time: "2026-06-13T20:00:00",
    postedAgo: "13h ago",
    spots: 3,
    maxSpots: 8,
    likes: 41,
    comments: 16,
    details: "Fun bowling night. Shoes included. Drinks optional!",
  }),
  withOrganizer({
    id: 15,
    user: "Jenny L.",
    sport: "Table Tennis",
    title: "Table Tennis Round Robin",
    location: "Fat Cat, Greenwich Village",
    distance: "1.1 mi",
    time: "2026-06-12T19:00:00",
    postedAgo: "14h ago",
    spots: 4,
    maxSpots: 8,
    likes: 16,
    comments: 6,
    details: "Round robin format. All skill levels. $5 entry.",
  }),
  withOrganizer({
    id: 16,
    user: "Alex D.",
    sport: "Social Event",
    title: "Sports Mixer & Happy Hour",
    location: "Slate NY, Midtown",
    distance: "2.3 mi",
    time: "2026-06-12T18:30:00",
    postedAgo: "15h ago",
    spots: 12,
    maxSpots: 30,
    likes: 55,
    comments: 22,
    details: "Meet fellow sports lovers over drinks. No equipment needed!",
  }),
  withOrganizer({
    id: 17,
    user: "Mia C.",
    sport: "Swimming",
    title: "Open Water Swimming Group",
    location: "Floating Pool, Brooklyn",
    distance: "3.5 mi",
    time: "2026-06-13T07:30:00",
    postedAgo: "16h ago",
    spots: 5,
    maxSpots: 10,
    likes: 14,
    comments: 4,
    details: "Casual open water swim. Must be comfortable in open water.",
  }),
  withOrganizer({
    id: 18,
    user: "Ben T.",
    sport: "Other",
    title: "Frisbee in the Park",
    location: "Prospect Park, Brooklyn",
    distance: "2.8 mi",
    time: "2026-06-14T15:00:00",
    postedAgo: "17h ago",
    spots: 6,
    maxSpots: 12,
    likes: 21,
    comments: 7,
    details: "Ultimate frisbee casual game. No experience needed!",
  }),
  withOrganizer({
    id: 97,
    user: "Test Host",
    sport: "Tennis",
    title: "Test Expired Event - Member Flow",
    location: "Central Park Tennis Courts, NY",
    distance: "0.8 mi",
    time: "2026-05-24T20:57:00",
    spots: 3,
    maxSpots: 4,
    likes: 5,
    comments: 2,
    details: "Test event for member expiration flow.",
  }),
  withOrganizer({
    id: 98,
    user: "Past User",
    sport: "Tennis",
    title: "Past Tennis Match (Test)",
    location: "Central Park, NY",
    distance: "0.8 mi",
    time: "2024-01-01T09:00:00",
    postedAgo: "1y ago",
    spots: 2,
    maxSpots: 4,
    likes: 5,
    comments: 2,
    details: "This is a past event for testing expired status.",
  }),
  withOrganizer({
    id: 99,
    user: "Tommy K.",
    sport: "Basketball",
    title: "Full Court 5v5 Basketball",
    location: "West 4th Street Courts, NY",
    distance: "1.1 mi",
    time: "2026-06-10T18:00:00",
    postedAgo: "Just now",
    spots: 10,
    maxSpots: 10,
    likes: 52,
    comments: 18,
    details: "Competitive 5v5 full court game. All spots taken!",
  }),
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parseDistanceMi(distance: string) {
  const n = parseFloat(distance.replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? 999 : n;
}

function sportFromFilterLabel(label: string) {
  if (label === "All Sports") return null;
  return label;
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEventTime(timeStr: string): string {
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type EventCardProps = {
  event: PlazaEvent;
  mode: SubTab;
  joined: boolean;
  liked: boolean;
  requestStatus?: MemberStatus;
  onToggleLike: () => void;
  onJoin: () => void;
  onUnjoin: () => void;
  onEventDetails?: () => void;
  onCardPress?: () => void;
  onManageRequests?: () => void;
  pendingRequestCount?: number;
  showGroupChat?: boolean;
  onOpenGroupChat?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function stopCardPress(e: unknown) {
  const ev = e as { stopPropagation?: () => void };
  ev.stopPropagation?.();
}

function EventCard({
  event,
  mode,
  joined,
  liked,
  requestStatus = "none",
  onToggleLike,
  onJoin,
  onUnjoin,
  onEventDetails,
  onCardPress,
  onManageRequests,
  pendingRequestCount = 0,
  showGroupChat = false,
  onOpenGroupChat,
  onEdit,
  onDelete,
}: EventCardProps) {
  const placeholder =
    SPORT_PLACEHOLDER[event.sport] ?? SPORT_PLACEHOLDER.Tennis;
  const cardIsPressable =
    !!onCardPress && (mode === "joined" || mode === "my");

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${event.title} — ${event.location} · ${formatEventTime(event.time)}`,
      });
    } catch {
      /* user dismissed */
    }
  };

  const cardBody = (
    <>
      <View style={styles.eventTopRow}>
        <View style={styles.eventAvatar}>
          <Text style={styles.eventAvatarText}>{getInitials(event.user)}</Text>
        </View>
        <View style={styles.eventTopMeta}>
          <Text style={styles.eventUsername}>{event.user}</Text>
          <View style={styles.sportTagPill}>
            <Text style={styles.sportTagText}>{event.sport}</Text>
          </View>
        </View>
        <Text style={styles.eventPostedAgo}>{event.postedAgo}</Text>
      </View>

      <Text style={styles.eventTitle}>{event.title}</Text>

      {mode === "discover" && requestStatus !== "none" ? (
        <View
          style={[
            styles.requestStatusBadge,
            requestStatus === "pending" && styles.requestStatusPending,
            requestStatus === "confirmed" && styles.requestStatusConfirmed,
            requestStatus === "rejected" && styles.requestStatusRejected,
          ]}
        >
          <Text
            style={[
              styles.requestStatusBadgeText,
              requestStatus === "pending" && styles.requestStatusTextPending,
              requestStatus === "confirmed" && styles.requestStatusTextConfirmed,
              requestStatus === "rejected" && styles.requestStatusTextRejected,
            ]}
          >
            {requestStatus === "pending"
              ? "⏳ Pending"
              : requestStatus === "confirmed"
                ? "✓ Joined"
                : "❌ Declined"}
          </Text>
        </View>
      ) : null}

      <View style={styles.eventImageWrap}>
        <View
          style={[styles.eventImagePlaceholder, { backgroundColor: placeholder.bg }]}
        >
          <Text style={styles.eventImageEmoji}>{placeholder.emoji}</Text>
        </View>
        <View
          style={[
            styles.spotsBadge,
            event.spots >= event.maxSpots && styles.spotsBadgeFull,
          ]}
        >
          <Text style={styles.spotsBadgeText}>
            👥 {event.spots}/{event.maxSpots}
            {event.spots >= event.maxSpots ? " · FULL" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <Text style={styles.eventInfoLeft}>📍 {event.location}</Text>
        <Text style={styles.eventDistance}>{event.distance}</Text>
      </View>

      <View style={styles.eventInfoRow}>
        <Text style={styles.eventInfoLeft}>🕐 {formatEventTime(event.time)}</Text>
      </View>

      <View style={styles.eventActionsRow}>
        <Pressable
          onPress={(e) => {
            if (cardIsPressable) stopCardPress(e);
            onToggleLike();
          }}
          style={styles.actionChip}
          hitSlop={8}
        >
          <Text style={styles.actionChipText}>
            {liked ? "❤️" : "🤍"} {event.likes + (liked ? 1 : 0)}
          </Text>
        </Pressable>
        <View style={styles.actionChip}>
          <Text style={styles.actionChipText}>💬 {event.comments}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            if (cardIsPressable) stopCardPress(e);
            void handleShare();
          }}
          hitSlop={8}
        >
          <Ionicons name="share-outline" size={22} color={MUTED} />
        </Pressable>

        {mode === "discover" ? (
          <Pressable style={styles.joinBtn} onPress={onEventDetails}>
            <Text style={styles.joinBtnText}>Event Details</Text>
          </Pressable>
        ) : null}
      </View>

      {mode === "my" ? (
        <>
          <Text style={styles.joinedCountText}>
            {event.spots} people joined
          </Text>
          {pendingRequestCount > 0 ? (
            <Pressable
              style={styles.manageRequestsBtn}
              onPress={(e) => {
                if (cardIsPressable) stopCardPress(e);
                onManageRequests?.();
              }}
            >
              <Text style={styles.manageRequestsBtnText}>Manage Requests</Text>
              <View style={styles.pendingCountBadge}>
                <Text style={styles.pendingCountBadgeText}>
                  {pendingRequestCount} pending
                </Text>
              </View>
            </Pressable>
          ) : null}
          {showGroupChat ? (
            <Pressable
              style={styles.myEventGroupChatBtn}
              onPress={(e) => {
                if (cardIsPressable) stopCardPress(e);
                onOpenGroupChat?.();
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color={WHITE} />
              <Text style={styles.myEventGroupChatBtnText}>Group Chat</Text>
            </Pressable>
          ) : null}
          <View style={styles.myEventActions}>
            <Pressable
              style={styles.outlineBtn}
              onPress={(e) => {
                if (cardIsPressable) stopCardPress(e);
                onEdit?.();
              }}
            >
              <Text style={styles.outlineBtnText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={(e) => {
                if (cardIsPressable) stopCardPress(e);
                onDelete?.();
              }}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </>
  );

  if (cardIsPressable) {
    return (
      <Pressable onPress={onCardPress} style={styles.eventCard}>
        {cardBody}
      </Pressable>
    );
  }

  return <View style={styles.eventCard}>{cardBody}</View>;
}

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState<SubTab>("discover");
  const [myEventsBadge, setMyEventsBadge] = useState(0);
  const [joinedBadge, setJoinedBadge] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Latest");
  const [myEvents, setMyEvents] = useState<PlazaEvent[]>([]);
  const [joinedIds, setJoinedIds] = useState<number[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [eventRequestsList, setEventRequestsList] = useState<EventRequest[]>([]);
  const [confirmedJoined, setConfirmedJoined] = useState<EventRequest[]>([]);
  const [pendingJoined, setPendingJoined] = useState<EventRequest[]>([]);
  const [declinedJoined, setDeclinedJoined] = useState<EventRequest[]>([]);
  const [removedJoined, setRemovedJoined] = useState<EventRequest[]>([]);
  const [expiredJoined, setExpiredJoined] = useState<EventRequest[]>([]);
  const [pastJoined, setPastJoined] = useState<EventRequest[]>([]);
  const [pendingMap, setPendingMap] = useState<EventRequestsByEvent>({});
  const [eventMembersMap, setEventMembersMap] = useState<EventRequestsByEvent>({});
  const [requestsModalEvent, setRequestsModalEvent] = useState<PlazaEvent | null>(
    null
  );
  const [createVisible, setCreateVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlazaEvent | null>(null);
  const modalScrollRef = useRef<ScrollView>(null);

  const [formName, setFormName] = useState("");
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [eventType, setEventType] = useState("");
  const [sport, setSport] = useState("");
  const [formMax, setFormMax] = useState("8");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [location, setLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<PlacePrediction[]>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [details, setDetails] = useState("");
  const loadStorage = useCallback(async () => {
    try {
      await ensureDemoEventSeed();
      const [myRaw, joinedRaw, requests, pending, members] = await Promise.all([
        AsyncStorage.getItem(MY_EVENTS_KEY),
        AsyncStorage.getItem(JOINED_EVENTS_KEY),
        loadEventRequests(),
        loadPendingRequests(),
        loadEventMembers(),
      ]);
      if (myRaw) {
        const parsed = JSON.parse(myRaw) as PlazaEvent[];
        setMyEvents(Array.isArray(parsed) ? parsed : []);
      }
      // Legacy instant-join IDs are no longer used; Joined tab uses confirmed requests only.
      if (joinedRaw) {
        await AsyncStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify([]));
      }
      setJoinedIds([]);
      setEventRequestsList(requests);
      setPendingMap(pending);
      setEventMembersMap(members);
    } catch {
      setMyEvents([]);
      setJoinedIds([]);
      setEventRequestsList([]);
      setPendingMap({});
      setEventMembersMap({});
    }
  }, []);

  const loadJoinedRequests = useCallback(async () => {
    try {
      const requests = await loadEventRequests();
      const mine = requests.filter((r) => r.userId === CURRENT_USER_ID);
      const confirmedList: EventRequest[] = [];
      const pendingList: EventRequest[] = [];
      const declinedList: EventRequest[] = [];
      const removedList: EventRequest[] = [];
      const expiredList: EventRequest[] = [];
      const pastList: EventRequest[] = [];

      mine.forEach((r) => {
        const eventData = r.eventData as { time?: string } | undefined;
        if (r.status === "past" && r.attended === true) {
          pastList.push(r);
        } else if (r.status === "confirmed" && !isEventExpired(eventData)) {
          confirmedList.push(r);
        } else if (r.status === "rejected") {
          declinedList.push(r);
        } else if (r.status === "removed") {
          removedList.push(r);
        } else if (r.status === "pending") {
          if (isEventExpired(eventData)) {
            expiredList.push(r);
          } else {
            pendingList.push(r);
          }
        }
      });

      setConfirmedJoined(confirmedList);
      setPendingJoined(pendingList);
      setDeclinedJoined(declinedList);
      setRemovedJoined(removedList);
      setExpiredJoined(expiredList);
      setPastJoined(pastList);
    } catch {
      setConfirmedJoined([]);
      setPendingJoined([]);
      setDeclinedJoined([]);
      setRemovedJoined([]);
      setExpiredJoined([]);
      setPastJoined([]);
    }
  }, []);

  const incrementGamesPlayed = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("userProfile");
      const profile = raw ? JSON.parse(raw) : {};
      const current = profile.gamesPlayed || 0;
      const updated = { ...profile, gamesPlayed: current + 1 };
      await AsyncStorage.setItem("userProfile", JSON.stringify(updated));
      console.log("Games played updated to:", current + 1);
    } catch (e) {
      console.log("incrementGamesPlayed error:", e);
    }
  }, []);

  const updateRequestStatus = useCallback(
    async (eventId: number, status: MemberStatus, attended: boolean) => {
      const requestsRaw = await AsyncStorage.getItem(EVENT_REQUESTS_KEY);
      const requests = requestsRaw
        ? (JSON.parse(requestsRaw) as EventRequest[])
        : [];
      const updated = requests.map((r) =>
        r.eventId === eventId && r.userId === CURRENT_USER_ID
          ? {
              ...r,
              status,
              attended,
              attendanceAnswered: true,
            }
          : r
      );
      await AsyncStorage.setItem(EVENT_REQUESTS_KEY, JSON.stringify(updated));
    },
    []
  );

  const removeRequest = useCallback(async (eventId: number) => {
    await cancelJoinRequest(eventId);
  }, []);

  const updateMyEventStatus = useCallback(
    async (eventId: number, attended: boolean) => {
      const myEventsRaw = await AsyncStorage.getItem(MY_EVENTS_KEY);
      const stored = myEventsRaw ? (JSON.parse(myEventsRaw) as PlazaEvent[]) : [];
      const updated = stored.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: "past",
              attended,
              attendanceAnswered: true,
            }
          : e
      );
      await AsyncStorage.setItem(MY_EVENTS_KEY, JSON.stringify(updated));
      setMyEvents(updated);
    },
    []
  );

  const removeMyEvent = useCallback(async (eventId: number) => {
    const myEventsRaw = await AsyncStorage.getItem(MY_EVENTS_KEY);
    const stored = myEventsRaw ? (JSON.parse(myEventsRaw) as PlazaEvent[]) : [];
    const updated = stored.filter((e) => e.id !== eventId);
    await AsyncStorage.setItem(MY_EVENTS_KEY, JSON.stringify(updated));
    setMyEvents(updated);
  }, []);

  const checkExpiredEventsRef = useRef<(() => Promise<void>) | null>(null);

  const checkExpiredEvents = useCallback(async () => {
    const requestsRaw = await AsyncStorage.getItem(EVENT_REQUESTS_KEY);
    const requests = requestsRaw
      ? (JSON.parse(requestsRaw) as EventRequest[])
      : [];

    const expiredConfirmed = requests.filter((r) => {
      if (r.status !== "confirmed" || r.userId !== CURRENT_USER_ID) return false;
      if (r.attendanceAnswered) return false;
      return isEventExpired(r.eventData as { time?: string } | undefined);
    });

    const myEventsRaw = await AsyncStorage.getItem(MY_EVENTS_KEY);
    const storedMyEvents = myEventsRaw
      ? (JSON.parse(myEventsRaw) as PlazaEvent[])
      : [];
    const expiredMyEvents = storedMyEvents.filter((e) => {
      if (e.attendanceAnswered) return false;
      return isEventExpired(e);
    });

    if (expiredConfirmed.length > 0) {
      const req = expiredConfirmed[0];
      const title =
        (req.eventData as { title?: string } | undefined)?.title ?? "Event";
      Alert.alert(
        "Did you attend?",
        `"${title}" has passed. Did you show up?`,
        [
          {
            text: "Yes! 🎉",
            onPress: () => {
              void (async () => {
                await updateRequestStatus(req.eventId, "past", true);
                await incrementGamesPlayed();
                await loadJoinedRequests();
                await loadStorage();
                await checkExpiredEventsRef.current?.();
              })();
            },
          },
          {
            text: "No",
            onPress: () => {
              void (async () => {
                await removeRequest(req.eventId);
                await loadJoinedRequests();
                await loadStorage();
                await checkExpiredEventsRef.current?.();
              })();
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    if (expiredMyEvents.length > 0) {
      const ev = expiredMyEvents[0];
      Alert.alert(
        "Did your event happen?",
        `"${ev.title}" has passed. Did you successfully host it?`,
        [
          {
            text: "Yes! 🎉",
            onPress: () => {
              void (async () => {
                await updateMyEventStatus(ev.id, true);
                await incrementGamesPlayed();
                await loadStorage();
                await checkExpiredEventsRef.current?.();
              })();
            },
          },
          {
            text: "No",
            onPress: () => {
              void (async () => {
                await removeMyEvent(ev.id);
                await loadStorage();
                await checkExpiredEventsRef.current?.();
              })();
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [
    incrementGamesPlayed,
    loadJoinedRequests,
    loadStorage,
    removeMyEvent,
    removeRequest,
    updateMyEventStatus,
    updateRequestStatus,
  ]);

  checkExpiredEventsRef.current = checkExpiredEvents;

  useFocusEffect(
    useCallback(() => {
      void loadStorage();
      void loadJoinedRequests();
      void checkExpiredEvents();

      const loadBadges = async () => {
        const pending = await getPendingRequestsCount();
        const status = await getJoinedStatusChangesCount();
        setMyEventsBadge(pending);
        setJoinedBadge(status);
      };
      void loadBadges();
    }, [loadStorage, loadJoinedRequests, checkExpiredEvents])
  );

  useEffect(() => {
    void checkExpiredEvents();
    const interval = setInterval(() => {
      void checkExpiredEvents();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkExpiredEvents]);

  const switchSubTab = useCallback((tab: SubTab) => {
    setSubTab(tab);
    if (tab === "my") {
      void clearPendingRequests();
      setMyEventsBadge(0);
    } else if (tab === "joined") {
      void clearJoinedStatusChanges();
      setJoinedBadge(0);
    }
  }, []);

  const getRequestStatus = useCallback(
    (eventId: number): MemberStatus =>
      getMyStatusFromList(eventRequestsList, eventId),
    [eventRequestsList]
  );

  const allDiscoverEvents = useMemo(() => {
    const dummyIds = new Set(DUMMY_EVENTS.map((e) => e.id));
    const created = myEvents.filter((e) => !dummyIds.has(e.id));
    const merged = [...created, ...DUMMY_EVENTS].map((e) => {
      const confirmed = getConfirmedForEvent(eventMembersMap, e.id);
      const { spotsTaken } = resolveEventSpotsAndMembers(
        e,
        confirmed,
        !e.createdByMe
      );
      return {
        ...e,
        spots: spotsTaken,
      };
    });
    const fullDemo = merged.find((e) => e.id === 99);
    if (!fullDemo) return merged;
    return [fullDemo, ...merged.filter((e) => e.id !== 99)];
  }, [myEvents, eventMembersMap]);

  const filteredDiscover = useMemo(() => {
    let list = [...allDiscoverEvents];

    list = list.filter((event) => !isEventExpired(event));

    const sport = sportFromFilterLabel(selectedSport);
    if (sport) {
      list = list.filter((e) => e.sport === sport);
    }
    if (sortBy === "Latest") {
      list.sort((a, b) => b.id - a.id);
    } else if (sortBy === "Nearest") {
      list.sort(
        (a, b) => parseDistanceMi(a.distance) - parseDistanceMi(b.distance)
      );
    } else {
      list.sort((a, b) => b.likes - a.likes);
    }
    return list;
  }, [allDiscoverEvents, selectedSport, sortBy]);

  const fetchLocationSuggestions = async (input: string) => {
    if (input.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&location=40.7128,-74.0060&radius=80000&components=country:us&key=${apiKey}`;

      const response = await fetch(url);
      const data = (await response.json()) as {
        status?: string;
        predictions?: PlacePrediction[];
        error_message?: string;
      };

      if (data.predictions) {
        setLocationSuggestions(data.predictions.slice(0, 5));
        setShowSuggestions(true);
      }
    } catch {}
  };

  const resetForm = () => {
    setFormName("");
    setEventType("");
    setSport("");
    setFormMax("8");
    setDate(null);
    setTime(null);
    setLocation("");
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setDetails("");
    setShowEventTypeDropdown(false);
    setShowSportDropdown(false);
    setEditingEvent(null);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateVisible(true);
  };

  const openEditModal = (event: PlazaEvent) => {
    setEditingEvent(event);
    setFormName(event.title);
    setEventType(event.eventType ?? "");
    setSport(event.sport);
    setFormMax(String(event.maxSpots));
    setLocation(event.location);
    setDetails(event.details ?? "");
    setDate(new Date());
    setTime(new Date());
    setCreateVisible(true);
  };

  const closeModal = () => {
    setCreateVisible(false);
    resetForm();
  };

  const persistMyEvents = async (next: PlazaEvent[]) => {
    setMyEvents(next);
    await AsyncStorage.setItem(MY_EVENTS_KEY, JSON.stringify(next));
  };

  const persistJoined = async (next: number[]) => {
    setJoinedIds(next);
    await AsyncStorage.setItem(JOINED_EVENTS_KEY, JSON.stringify(next));
  };

  const handleCreateOrUpdate = async () => {
    if (!formName.trim() || !location.trim()) {
      Alert.alert("Missing info", "Please add an event name and location.");
      return;
    }
    if (!eventType || !sport) {
      Alert.alert("Missing info", "Please select an event type and sport.");
      return;
    }

    const maxSpots = Math.max(2, parseInt(formMax, 10) || 8);
    const selectedDate = date ?? new Date();
    const selectedTime = time ?? new Date();
    const dateStr = formatDate(selectedDate);
    const timeStr = formatTime(selectedTime);

    if (editingEvent) {
      const updated: PlazaEvent = {
        ...editingEvent,
        title: formName.trim(),
        sport,
        eventType,
        maxSpots,
        location: location.trim(),
        details: details.trim(),
        time: `${dateStr}, ${timeStr}`,
        dateLabel: dateStr,
        timeLabel: timeStr,
      };
      await persistMyEvents(
        myEvents.map((e) => (e.id === editingEvent.id ? updated : e))
      );
      closeModal();
      setSubTab("my");
      return;
    }

    const user = await getCurrentUser();

    const newEvent: PlazaEvent = {
      id: Date.now(),
      user: user.name,
      organizer: user.name,
      organizerInitial: user.initial,
      sport,
      title: formName.trim(),
      location: location.trim(),
      distance: "0.1 mi",
      time: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0
      ).toISOString(),
      postedAgo: "Just now",
      spots: 1,
      maxSpots,
      likes: 0,
      comments: 0,
      createdByMe: true,
      eventType,
      details: details.trim(),
      dateLabel: dateStr,
      timeLabel: timeStr,
    };

    await persistMyEvents([newEvent, ...myEvents]);
    await refreshRequestData();
    closeModal();
    setSubTab("my");
  };

  const scrollModalToEnd = () => {
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const renderSelectModal = (
    visible: boolean,
    onClose: () => void,
    options: readonly string[],
    selected: string,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.selectModalOverlay}>
        <Pressable style={styles.selectModalBackdrop} onPress={onClose} />
        <View style={styles.selectModalSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  style={styles.selectModalOption}
                >
                  <Text
                    style={[
                      styles.selectModalOptionText,
                      isSelected && styles.selectModalOptionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={22} color={ACCENT_DARK} />
                  ) : (
                    <View style={styles.selectModalCheckPlaceholder} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.selectModalCancel} onPress={onClose}>
            <Text style={styles.selectModalCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const openEventDetails = (event: PlazaEvent, joined = false) => {
    router.push({
      pathname: "/event-details",
      params: {
        eventId: String(event.id),
        eventData: JSON.stringify(event),
        ...(joined ? { joined: "true" } : {}),
      },
    });
  };

  const openGroupChat = (
    event: PlazaEvent,
    membersMap: EventRequestsByEvent = eventMembersMap
  ) => {
    const confirmed = buildConfirmedMembersList(event, membersMap, event.id);
    if (confirmed.length < 2) return;
    const placeholder =
      SPORT_PLACEHOLDER[event.sport] ?? SPORT_PLACEHOLDER.Tennis;
    void (async () => {
      const messages = await loadGroupChatMessages(event.id);
      const last = messages[messages.length - 1];
      await upsertGroupChatConversation({
        eventId: String(event.id),
        eventTitle: event.title,
        sportEmoji: placeholder.emoji,
        organizer: event.organizer,
        lastMessage: last?.text ?? "No messages yet",
        lastMessageTime: Date.now(),
      });
      router.push({
        pathname: "/event-group-chat",
        params: {
          eventId: String(event.id),
          eventTitle: event.title,
          sportEmoji: placeholder.emoji,
          organizer: event.organizer,
          memberCount: String(confirmed.length),
          memberInitials: JSON.stringify(
            confirmed.slice(0, 3).map((m) => m.name[0]?.toUpperCase() ?? "?")
          ),
        },
      });
    })();
  };

  const refreshRequestData = async () => {
    const [requests, pending, members] = await Promise.all([
      loadEventRequests(),
      loadPendingRequests(),
      loadEventMembers(),
    ]);
    setEventRequestsList(requests);
    setPendingMap(pending);
    setEventMembersMap(members);
    await loadJoinedRequests();
  };

  const handleCancelJoinedRequest = async (eventId: number) => {
    await cancelJoinRequest(eventId);
    await refreshRequestData();
  };

  const handleRequestAgain = async (req: EventRequest) => {
    const user = await getCurrentUser();
    await submitJoinRequest(
      req.eventId,
      {
        name: user.name,
        initial: user.initial,
        userId: CURRENT_USER_ID,
      },
      req.eventData
    );
    await refreshRequestData();
  };

  const handleRemoveDeclinedRequest = async (eventId: number) => {
    await cancelJoinRequest(eventId);
    await refreshRequestData();
  };

  const handleDismiss = useCallback(
    async (eventId: number, status: string) => {
      const raw = await AsyncStorage.getItem(EVENT_REQUESTS_KEY);
      const requests = raw ? (JSON.parse(raw) as EventRequest[]) : [];
      const updated = requests.filter((r) => {
        if (r.eventId !== eventId || r.userId !== CURRENT_USER_ID) return true;
        if (status === "expired") return r.status !== "pending";
        return r.status !== status;
      });
      await AsyncStorage.setItem(EVENT_REQUESTS_KEY, JSON.stringify(updated));
      await loadJoinedRequests();
      await refreshRequestData();
    },
    [loadJoinedRequests]
  );

  const handleRequestAgainById = useCallback(
    async (eventId: number) => {
      const req = eventRequestsList.find(
        (r) => r.eventId === eventId && r.userId === CURRENT_USER_ID
      );
      if (req) await handleRequestAgain(req);
    },
    [eventRequestsList, handleRequestAgain]
  );

  const handleApproveRequest = async (eventId: number, userId: string) => {
    const membersRaw = await AsyncStorage.getItem(EVENT_MEMBERS_KEY);
    const allMembers = membersRaw
      ? (JSON.parse(membersRaw) as EventRequestsByEvent)
      : {};
    const key = String(eventId);
    const confirmedMembers = allMembers[key] ?? [];

    const event =
      allDiscoverEvents.find((e) => e.id === eventId) ??
      myEvents.find((e) => e.id === eventId) ??
      requestsModalEvent;
    if (!event) return;

    const confirmedCount = confirmedMembers.length + 1;

    if (confirmedCount >= event.maxSpots) {
      Alert.alert(
        "Event Full",
        "This event has reached maximum capacity. You cannot approve more members.",
        [{ text: "OK" }]
      );
      return;
    }

    await approveJoinRequest(eventId, userId);
    await refreshRequestData();

    const source =
      allDiscoverEvents.find((e) => e.id === eventId) ??
      requestsModalEvent ??
      myEvents.find((e) => e.id === eventId);
    if (!source) return;

    const members = await loadEventMembers();
    setEventMembersMap(members);
    const confirmed = buildConfirmedMembersList(source, members, eventId);
    if (confirmed.length >= 2) {
      const merged = allDiscoverEvents.find((e) => e.id === eventId) ?? source;
      Alert.alert(
        "Group chat unlocked",
        "You have at least 2 members. Open group chat to test messaging.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open Group Chat",
            onPress: () => {
              setRequestsModalEvent(null);
              openGroupChat(merged, members);
            },
          },
        ]
      );
    }
  };

  const handleDeclineRequest = async (eventId: number, userId: string) => {
    await declineJoinRequest(eventId, userId);
    await refreshRequestData();
  };

  const modalPendingRequests = requestsModalEvent
    ? getPendingForEvent(pendingMap, requestsModalEvent.id)
    : [];

  const modalConfirmedCount = requestsModalEvent
    ? buildConfirmedMembersList(
        requestsModalEvent,
        eventMembersMap,
        requestsModalEvent.id
      ).length
    : 0;

  const modalEventFull =
    requestsModalEvent != null &&
    modalConfirmedCount >= requestsModalEvent.maxSpots;

  const handleUnjoin = async (eventId: number) => {
    await leaveEvent(eventId);
    const nextJoined = joinedIds.filter((id) => id !== eventId);
    await persistJoined(nextJoined);
    await refreshRequestData();
  };

  const handleDelete = (event: PlazaEvent) => {
    Alert.alert("Delete event?", `Remove "${event.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await persistMyEvents(myEvents.filter((e) => e.id !== event.id));
            const nextJoined = joinedIds.filter((id) => id !== event.id);
            await persistJoined(nextJoined);
          })();
        },
      },
    ]);
  };

  const toggleLike = (id: number) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderDiscover = () => (
    <View style={styles.tabPanel}>
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Filter by sport:</Text>
        <Pressable
          onPress={() => setShowDropdown(!showDropdown)}
          style={styles.sportDropdownTrigger}
        >
          <Text style={styles.sportDropdownTriggerText}>{selectedSport}</Text>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={16}
            color={MUTED}
          />
        </Pressable>
        <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>
          Sort by:
        </Text>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setSortBy(opt)}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text
                  style={[styles.sortChipText, active && styles.sortChipTextActive]}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.tabScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredDiscover.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            mode="discover"
            joined={getRequestStatus(event.id) === "confirmed"}
            liked={likedIds.has(event.id)}
            requestStatus={getRequestStatus(event.id)}
            onToggleLike={() => toggleLike(event.id)}
            onJoin={() => {}}
            onUnjoin={() => void handleUnjoin(event.id)}
            onEventDetails={() => openEventDetails(event)}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderMyEvents = () => {
    const activeMyEvents = myEvents.filter((e) => e.status !== "past");
    const pastMyEvents = myEvents.filter(
      (e) => e.status === "past" && e.attended === true
    );

    return (
      <ScrollView
        style={styles.tabScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <CollapsibleSection
          title="📌 Active"
          count={activeMyEvents.length}
          defaultExpanded
          showWhenEmpty
        >
          {activeMyEvents.length === 0 ? (
            <View style={styles.myEventsActiveEmpty}>
              <Text style={styles.myEventsActiveEmptyText}>No active events</Text>
            </View>
          ) : (
            activeMyEvents.map((event) => {
              const merged =
                allDiscoverEvents.find((e) => e.id === event.id) ?? event;
              const confirmedCount = buildConfirmedMembersList(
                merged,
                eventMembersMap,
                merged.id
              ).length;
              return (
                <EventCard
                  key={event.id}
                  event={merged}
                  mode="my"
                  joined={joinedIds.includes(event.id)}
                  liked={likedIds.has(event.id)}
                  onToggleLike={() => toggleLike(event.id)}
                  onJoin={() => {}}
                  onUnjoin={() => {}}
                  onCardPress={() => openEventDetails(merged)}
                  pendingRequestCount={
                    getPendingForEvent(pendingMap, merged.id).length
                  }
                  showGroupChat={confirmedCount >= 2}
                  onOpenGroupChat={() => openGroupChat(merged)}
                  onManageRequests={() => setRequestsModalEvent(merged)}
                  onEdit={() => openEditModal(merged)}
                  onDelete={() => handleDelete(merged)}
                />
              );
            })
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="📅 Past"
          count={pastMyEvents.length}
          defaultExpanded={false}
          showWhenEmpty
        >
          {pastMyEvents.map((event) => {
            const merged =
              allDiscoverEvents.find((e) => e.id === event.id) ?? event;
            return (
              <PastEventCard
                key={`past-my-${event.id}`}
                event={merged}
                badge="✅ Hosted · +1 Game"
                badgeColor="#dcfce7"
                badgeTextColor={ACCENT_DARK}
                onPress={() => openEventDetails(merged)}
              />
            );
          })}
        </CollapsibleSection>
      </ScrollView>
    );
  };

  const renderJoined = () => {
    return (
      <ScrollView
        style={styles.tabScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <CollapsibleSection
          title="✅ Confirmed"
          count={confirmedJoined.length}
          defaultExpanded
          showWhenEmpty
        >
          {confirmedJoined.map((req) => {
            const event = resolvePlazaEventFromRequest(req, allDiscoverEvents);
            if (!event) return null;
            return (
              <View key={`confirmed-${req.eventId}`} style={styles.joinedAccentGreen}>
                <EventCard
                  event={event}
                  mode="joined"
                  joined
                  liked={likedIds.has(event.id)}
                  onToggleLike={() => toggleLike(event.id)}
                  onJoin={() => {}}
                  onCardPress={() => openEventDetails(event, true)}
                  onUnjoin={() => {}}
                />
              </View>
            );
          })}
        </CollapsibleSection>

        <CollapsibleSection
          title="⏳ Pending"
          count={pendingJoined.length}
          defaultExpanded={false}
          showWhenEmpty
        >
          {pendingJoined.map((req) => {
            const event = resolvePlazaEventFromRequest(req, allDiscoverEvents);
            if (!event) return null;
            return (
              <JoinedStatusCard
                key={`pending-${req.eventId}`}
                event={event}
                variant="pending"
                onCardPress={() => openEventDetails(event)}
                onCancel={() => void handleCancelJoinedRequest(req.eventId)}
              />
            );
          })}
        </CollapsibleSection>

        <CollapsibleSection
          title="📅 Past"
          count={pastJoined.length}
          defaultExpanded={false}
          showWhenEmpty
        >
          {pastJoined.map((req) => {
            const event = resolvePlazaEventFromRequest(req, allDiscoverEvents);
            if (!event) return null;
            return (
              <PastEventCard
                key={`past-joined-${req.eventId}`}
                event={event}
                badge="✅ Attended · +1 Game"
                badgeColor="#dcfce7"
                badgeTextColor={ACCENT_DARK}
                onPress={() => openEventDetails(event, true)}
              />
            );
          })}
        </CollapsibleSection>

        {removedJoined.length > 0 ? (
          <View style={styles.staticSection}>
            <Text style={styles.staticSectionLabel}>🚫 Removed</Text>
            {removedJoined.map((req) => {
              const event = resolvePlazaEventFromRequest(req, allDiscoverEvents);
              if (!event) return null;
              return (
                <DismissableCard
                  key={`removed-${req.eventId}`}
                  event={event}
                  badge="🚫 You've been removed"
                  badgeColor="#fee2e2"
                  badgeTextColor="#dc2626"
                  onCardPress={() => openEventDetails(event)}
                  onDismiss={() => void handleDismiss(req.eventId, "removed")}
                />
              );
            })}
          </View>
        ) : null}

        {expiredJoined.length > 0 ? (
          <View style={styles.staticSection}>
            <Text style={styles.staticSectionLabel}>⏰ Expired</Text>
            {expiredJoined.map((req) => {
              const event = resolvePlazaEventFromRequest(req, allDiscoverEvents);
              if (!event) return null;
              return (
                <DismissableCard
                  key={`expired-${req.eventId}`}
                  event={event}
                  badge="⏰ This event has passed"
                  badgeColor="#f1f5f9"
                  badgeTextColor={MUTED}
                  onCardPress={() => openEventDetails(event)}
                  onDismiss={() => void handleDismiss(req.eventId, "expired")}
                />
              );
            })}
          </View>
        ) : null}

        {declinedJoined.length > 0 ? (
          <View style={styles.staticSection}>
            <Text style={styles.staticSectionLabel}>❌ Declined</Text>
            {declinedJoined.map((req) => {
              const event = resolvePlazaEventFromRequest(req, allDiscoverEvents);
              if (!event) return null;
              return (
                <DismissableCard
                  key={`declined-${req.eventId}`}
                  event={event}
                  badge="❌ Request Declined"
                  badgeColor="#fee2e2"
                  badgeTextColor="#dc2626"
                  onCardPress={() => openEventDetails(event)}
                  showRequestAgain
                  onRequestAgain={() => void handleRequestAgainById(req.eventId)}
                  onDismiss={() => void handleDismiss(req.eventId, "rejected")}
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Plaza ✨</Text>
        <Text style={styles.headerSubtitle}>
          Discover and create amazing sports events
        </Text>
      </View>

      <View style={styles.subTabRow}>
        {(
          [
            { key: "discover" as const, label: "Discover" },
            { key: "my" as const, label: "My Events" },
            { key: "joined" as const, label: "Joined" },
          ] as const
        ).map((tab) => {
          const active = subTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => switchSubTab(tab.key)}
              style={styles.subTabBtn}
            >
              <View style={styles.subTabLabelRow}>
                <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
                  {tab.label}
                </Text>
                {tab.key === "my" && myEventsBadge > 0 ? (
                  <View style={styles.subTabBadge}>
                    <Text style={styles.subTabBadgeText}>{myEventsBadge}</Text>
                  </View>
                ) : null}
                {tab.key === "joined" && joinedBadge > 0 ? (
                  <View style={styles.subTabBadge}>
                    <Text style={styles.subTabBadgeText}>{joinedBadge}</Text>
                  </View>
                ) : null}
              </View>
              {active ? <View style={styles.subTabUnderline} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tabBody}>
        {subTab === "discover" ? renderDiscover() : null}
        {subTab === "my" ? renderMyEvents() : null}
        {subTab === "joined" ? renderJoined() : null}
      </View>

      <Pressable
        style={[
          styles.fab,
          { bottom: 8, right: 20 },
        ]}
        onPress={openCreateModal}
      >
        <Ionicons name="add" size={28} color={WHITE} />
      </Pressable>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={styles.sportDropdownBackdrop}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.sportDropdownPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FILTER_SPORTS.map((sport) => (
                <Pressable
                  key={sport}
                  onPress={() => {
                    setSelectedSport(sport);
                    setShowDropdown(false);
                  }}
                  style={[
                    styles.sportDropdownItem,
                    selectedSport === sport && styles.sportDropdownItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sportDropdownItemText,
                      selectedSport === sport && styles.sportDropdownItemTextActive,
                    ]}
                  >
                    {sport}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={requestsModalEvent !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setRequestsModalEvent(null)}
      >
        <View style={styles.requestsModalOverlay}>
          <View
            style={[
              styles.requestsModalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.requestsModalHeader}>
              <Text style={styles.requestsModalTitle}>Join Requests</Text>
              <Pressable
                onPress={() => setRequestsModalEvent(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={28} color={TEXT} />
              </Pressable>
            </View>
            {modalEventFull ? (
              <View style={styles.requestsModalFullBanner}>
                <Text style={styles.requestsModalFullBannerText}>
                  ❌ Event is at full capacity. Cannot approve more members.
                </Text>
              </View>
            ) : null}
            {modalPendingRequests.length > 0 && !modalEventFull ? (
              <Text style={styles.requestsModalHint}>
                Approve at least 1 person to unlock group chat (you + 1 member).
              </Text>
            ) : null}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.requestsModalScroll}
            >
              {modalPendingRequests.length === 0 ? (
                <Text style={styles.requestsEmptyText}>No pending requests</Text>
              ) : (
                modalPendingRequests.map((req) => (
                  <View key={`${req.userId}-${req.requestedAt}`} style={styles.requestRow}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestAvatarText}>
                        {req.userInitial}
                      </Text>
                    </View>
                    <View style={styles.requestMeta}>
                      <Text style={styles.requestName}>{req.userName}</Text>
                      <Text style={styles.requestAgo}>
                        {formatRequestAgo(req.requestedAt)}
                      </Text>
                    </View>
                    <View style={styles.requestActions}>
                      <Pressable
                        style={[
                          styles.approveBtn,
                          modalEventFull && styles.approveBtnDisabled,
                        ]}
                        disabled={modalEventFull}
                        onPress={() => {
                          if (requestsModalEvent && !modalEventFull) {
                            void handleApproveRequest(
                              requestsModalEvent.id,
                              req.userId
                            );
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.approveBtnText,
                            modalEventFull && styles.approveBtnTextDisabled,
                          ]}
                        >
                          {modalEventFull ? "Event Full" : "Approve ✓"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.declineBtn}
                        onPress={() => {
                          if (requestsModalEvent) {
                            void handleDeclineRequest(
                              requestsModalEvent.id,
                              req.userId
                            );
                          }
                        }}
                      >
                        <Text style={styles.declineBtnText}>Decline ✗</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            {modalConfirmedCount >= 2 && requestsModalEvent ? (
              <Pressable
                style={styles.requestsGroupChatBtn}
                onPress={() => {
                  const event = requestsModalEvent;
                  setRequestsModalEvent(null);
                  openGroupChat(event);
                }}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={WHITE} />
                <Text style={styles.requestsGroupChatBtnText}>Open Group Chat</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={createVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKeyboardAvoid}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </Text>
                <Pressable onPress={closeModal} hitSlop={12}>
                  <Ionicons name="close" size={28} color={TEXT} />
                </Pressable>
              </View>

              <ScrollView
                ref={modalScrollRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                  styles.modalScroll,
                  styles.modalScrollKeyboard,
                ]}
              >
              <Text style={[styles.fieldLabel, styles.fieldLabelFirst]}>
                Event Name
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="Event name"
                placeholderTextColor={PLACEHOLDER}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Event Type</Text>
              <Pressable
                onPress={() => setShowEventTypeDropdown(true)}
                style={styles.dropdownTrigger}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !eventType && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {eventType || "Select event type"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={PLACEHOLDER} />
              </Pressable>

              <Text style={styles.fieldLabel}>Sport</Text>
              <Pressable
                onPress={() => setShowSportDropdown(true)}
                style={styles.dropdownTrigger}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !sport && styles.dropdownTriggerPlaceholder,
                  ]}
                >
                  {sport || "Select sport"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={PLACEHOLDER} />
              </Pressable>

              <Text style={styles.fieldLabel}>Max Participants</Text>
              <TextInput
                value={formMax}
                onChangeText={setFormMax}
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor={PLACEHOLDER}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <View style={styles.compactPickerWrap}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={PLACEHOLDER}
                  />
                  <View style={styles.compactPickerInner}>
                    <DateTimePicker
                      value={date || new Date()}
                      mode="date"
                      display="compact"
                      minimumDate={new Date()}
                      themeVariant="light"
                      accentColor={ACCENT_DARK}
                      onChange={(_event, selectedDate) => {
                        if (selectedDate) setDate(selectedDate);
                      }}
                      style={styles.compactPickerControl}
                    />
                  </View>
                </View>

                <View style={styles.compactPickerWrap}>
                  <Ionicons name="time-outline" size={18} color={PLACEHOLDER} />
                  <View style={styles.compactPickerInner}>
                    <DateTimePicker
                      value={time || new Date()}
                      mode="time"
                      display="compact"
                      themeVariant="light"
                      accentColor={ACCENT_DARK}
                      onChange={(_event, selectedTime) => {
                        if (selectedTime) setTime(selectedTime);
                      }}
                      style={styles.compactPickerControl}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.locationAutocompleteSection}>
                <View style={styles.locationInputWrap}>
                  <TextInput
                    placeholder="Enter venue name and address"
                    placeholderTextColor={PLACEHOLDER}
                    value={location}
                    onChangeText={(text) => {
                      setLocation(text);
                      void fetchLocationSuggestions(text);
                    }}
                    onFocus={scrollModalToEnd}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    style={styles.locationInput}
                  />
                </View>

                {showSuggestions && locationSuggestions.length > 0 ? (
                  <View style={styles.locationSuggestionsList}>
                    {locationSuggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion.place_id}
                        onPress={() => {
                          setLocation(suggestion.description);
                          setShowSuggestions(false);
                          setLocationSuggestions([]);
                        }}
                        style={styles.locationSuggestionRow}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={ACCENT_DARK}
                        />
                        <View style={styles.locationSuggestionTextWrap}>
                          <Text style={styles.locationSuggestionMain}>
                            {suggestion.structured_formatting?.main_text}
                          </Text>
                          <Text style={styles.locationSuggestionSecondary}>
                            {suggestion.structured_formatting?.secondary_text}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Event Details</Text>
              <View style={styles.detailsInputWrap}>
                <TextInput
                  placeholder="Describe event details..."
                  placeholderTextColor={PLACEHOLDER}
                  value={details}
                  onChangeText={setDetails}
                  onFocus={scrollModalToEnd}
                  multiline
                  textAlignVertical="top"
                  style={styles.detailsInput}
                />
              </View>
            </ScrollView>

            {renderSelectModal(
              showEventTypeDropdown,
              () => setShowEventTypeDropdown(false),
              EVENT_TYPES,
              eventType,
              setEventType
            )}
            {renderSelectModal(
              showSportDropdown,
              () => setShowSportDropdown(false),
              CREATE_EVENT_SPORTS,
              sport,
              setSport
            )}

            <View style={styles.modalFooter}>
              <Pressable style={styles.modalCancelBtn} onPress={closeModal}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalCreateBtn}
                onPress={() => void handleCreateOrUpdate()}
              >
                <Text style={styles.modalCreateBtnText}>
                  {editingEvent ? "Save Changes" : "Create Event"}
                </Text>
              </Pressable>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: TEXT,
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
    color: MUTED,
    textAlign: "center",
  },
  subTabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  subTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  subTabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subTabBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  subTabBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  subTabText: {
    fontSize: 15,
    fontWeight: "600",
    color: MUTED,
  },
  subTabTextActive: {
    color: ACCENT_DARK,
    fontWeight: "800",
  },
  subTabUnderline: {
    marginTop: 8,
    height: 3,
    width: "70%",
    borderRadius: 2,
    backgroundColor: ACCENT_DARK,
  },
  tabBody: {
    flex: 1,
  },
  tabPanel: {
    flex: 1,
  },
  tabScroll: {
    flex: 1,
  },
  filterCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  filterLabelSpaced: {
    marginTop: 8,
  },
  sportDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 160,
    marginTop: 4,
  },
  sportDropdownTriggerText: {
    fontSize: 14,
    color: TEXT,
    fontWeight: "600",
  },
  sportDropdownBackdrop: {
    flex: 1,
  },
  sportDropdownPanel: {
    position: "absolute",
    top: 160,
    left: 16,
    right: 16,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  sportDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    backgroundColor: WHITE,
  },
  sportDropdownItemActive: {
    backgroundColor: BG,
  },
  sportDropdownItemText: {
    fontSize: 15,
    color: TEXT,
    fontWeight: "400",
  },
  sportDropdownItemTextActive: {
    color: ACCENT_DARK,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  sortChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    backgroundColor: BG,
  },
  sortChipActive: {
    backgroundColor: ACCENT_DARK,
    borderColor: ACCENT_DARK,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
  },
  sortChipTextActive: {
    color: WHITE,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  collapsibleSection: {
    marginBottom: 8,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  collapsibleHeaderExpanded: {
    marginBottom: 8,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  collapsibleBody: {
    gap: 8,
  },
  collapsibleEmpty: {
    padding: 16,
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 12,
    marginBottom: 8,
  },
  collapsibleEmptyText: {
    color: PLACEHOLDER,
    fontSize: 14,
    fontStyle: "italic",
  },
  myEventsActiveEmpty: {
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  myEventsActiveEmptyText: {
    color: PLACEHOLDER,
    fontSize: 14,
    fontStyle: "italic",
  },
  staticSection: {
    marginBottom: 8,
    gap: 8,
  },
  staticSectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dismissableCard: {
    opacity: 0.85,
    marginVertical: 2,
  },
  joinedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  joinedSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  joinedAccentGreen: {
    borderLeftWidth: 4,
    borderLeftColor: "#15803d",
    borderRadius: 16,
    overflow: "hidden",
  },
  joinedAccentYellow: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  joinedAccentRed: {
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  joinedAccentExpired: {
    borderLeftWidth: 4,
    borderLeftColor: "#94a3b8",
  },
  joinedStatusCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  joinedStatusCardDimmed: {
    opacity: 0.7,
  },
  joinedStatusCardRemoved: {
    opacity: 0.6,
  },
  joinedStatusCardExpired: {
    opacity: 0.6,
  },
  joinedStatusTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
  },
  joinedStatusMeta: {
    fontSize: 14,
    fontWeight: "600",
    color: MUTED,
  },
  joinedBadgePending: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#fef9c3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinedBadgePendingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ca8a04",
  },
  joinedBadgeDeclined: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinedBadgeDeclinedText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#dc2626",
  },
  joinedBadgeRemoved: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#fee2e2",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  joinedBadgeRemovedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
  },
  joinedBadgeExpired: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  joinedBadgeExpiredText: {
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
  },
  pastEventCard: {
    opacity: 0.8,
    marginVertical: 6,
  },
  pastEventBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pastEventBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pastBadgeAttended: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#dcfce7",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pastBadgeAttendedText: {
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  pastBadgeMissed: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pastBadgeMissedText: {
    fontSize: 12,
    fontWeight: "700",
    color: MUTED,
  },
  joinedCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  joinedTextBtnGreen: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  joinedTextBtnGray: {
    fontSize: 14,
    fontWeight: "700",
    color: MUTED,
  },
  eventCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: TEXT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  eventAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  eventAvatarText: {
    color: WHITE,
    fontWeight: "800",
    fontSize: 14,
  },
  eventTopMeta: {
    flex: 1,
    marginLeft: 10,
  },
  eventUsername: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },
  sportTagPill: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sportTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  eventPostedAgo: {
    fontSize: 11,
    color: MUTED,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 6,
  },
  requestStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  requestStatusPending: {
    backgroundColor: "#fef9c3",
  },
  requestStatusConfirmed: {
    backgroundColor: "#dcfce7",
  },
  requestStatusRejected: {
    backgroundColor: "#fef2f2",
  },
  requestStatusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  requestStatusTextPending: {
    color: "#ca8a04",
  },
  requestStatusTextConfirmed: {
    color: ACCENT_DARK,
  },
  requestStatusTextRejected: {
    color: "#dc2626",
  },
  manageRequestsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: ACCENT_DARK,
  },
  manageRequestsBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  myEventGroupChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT_DARK,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  myEventGroupChatBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "800",
  },
  requestsModalFullBanner: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  requestsModalFullBannerText: {
    color: "#dc2626",
    fontWeight: "700",
    textAlign: "center",
  },
  requestsModalHint: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 18,
  },
  requestsGroupChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT_DARK,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  requestsGroupChatBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  pendingCountBadge: {
    backgroundColor: ACCENT_DARK,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pendingCountBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },
  requestsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  requestsModalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  requestsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  requestsModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT,
  },
  requestsModalScroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  requestsEmptyText: {
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 24,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  requestAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  requestMeta: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },
  requestAgo: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  requestActions: {
    gap: 6,
  },
  approveBtn: {
    backgroundColor: ACCENT_DARK,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnDisabled: {
    backgroundColor: "#e2e8f0",
  },
  approveBtnText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
  },
  approveBtnTextDisabled: {
    color: "#94a3b8",
  },
  declineBtn: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  declineBtnText: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "800",
  },
  eventImageWrap: {
    position: "relative",
    marginBottom: 10,
  },
  eventImagePlaceholder: {
    height: 160,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eventImageEmoji: {
    fontSize: 56,
  },
  spotsBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  spotsBadgeText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "700",
  },
  spotsBadgeFull: {
    backgroundColor: "#dc2626",
  },
  eventInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  eventInfoLeft: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
  },
  eventDistance: {
    fontSize: 13,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  eventActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionChip: {
    paddingVertical: 4,
  },
  actionChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  joinBtn: {
    marginLeft: "auto",
    backgroundColor: ACCENT_DARK,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  joinBtnText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },
  joinBtnJoined: {
    backgroundColor: "#e2e8f0",
  },
  joinBtnJoinedText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },
  cancelBtn: {
    marginLeft: "auto",
    borderWidth: 1.5,
    borderColor: "#dc2626",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cancelBtnText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "800",
  },
  joinedCountText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  myEventActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: ACCENT_DARK,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  modalKeyboardAvoid: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalScrollKeyboard: {
    paddingBottom: 120,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: ACCENT_DARK,
    marginBottom: 8,
    marginTop: 16,
  },
  fieldLabelFirst: {
    marginTop: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: TEXT,
    backgroundColor: WHITE,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: TEXT,
    flex: 1,
    marginRight: 8,
  },
  dropdownTriggerPlaceholder: {
    color: PLACEHOLDER,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  compactPickerWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  compactPickerInner: {
    flex: 1,
    backgroundColor: "transparent",
  },
  compactPickerControl: {
    flex: 1,
    backgroundColor: "transparent",
  },
  locationInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT,
  },
  locationAutocompleteSection: {
    zIndex: 999,
  },
  locationSuggestionsList: {
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },
  locationSuggestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationSuggestionTextWrap: {
    flex: 1,
  },
  locationSuggestionMain: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  locationSuggestionSecondary: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  detailsInputWrap: {
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
  },
  detailsInput: {
    fontSize: 15,
    color: TEXT,
    minHeight: 80,
  },
  selectModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  selectModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  selectModalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 8,
    paddingBottom: 8,
  },
  selectModalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  selectModalOptionText: {
    fontSize: 16,
    color: TEXT,
    fontWeight: "400",
    flex: 1,
  },
  selectModalOptionTextActive: {
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  selectModalCheckPlaceholder: {
    width: 22,
  },
  selectModalCancel: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  selectModalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: ACCENT_DARK,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineBtnText: {
    color: ACCENT_DARK,
    fontSize: 15,
    fontWeight: "800",
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: WHITE,
  },
  modalCancelBtnText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "600",
  },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: ACCENT_DARK,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCreateBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
  deleteBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800",
  },
});
