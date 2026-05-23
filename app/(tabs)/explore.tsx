import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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
};

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
};

const DUMMY_EVENTS: PlazaEvent[] = [
  {
    id: 1,
    user: "Sarah M.",
    sport: "Tennis",
    title: "Morning Tennis Singles Match",
    location: "Central Park Tennis Courts, NY",
    distance: "0.8 mi",
    time: "Today, 9:00 AM",
    postedAgo: "1h ago",
    spots: 1,
    maxSpots: 2,
    likes: 18,
    comments: 6,
    details: "Looking for a 3.5+ player for a friendly singles match.",
  },
  {
    id: 2,
    user: "Mike L.",
    sport: "Pickleball",
    title: "Pickleball Beginner Meetup",
    location: "Hudson Yards Courts, NY",
    distance: "1.2 mi",
    time: "Today, 11:00 AM",
    postedAgo: "2h ago",
    spots: 3,
    maxSpots: 6,
    likes: 24,
    comments: 9,
    details: "All levels welcome! Paddles provided.",
  },
  {
    id: 3,
    user: "Emma R.",
    sport: "Padel",
    title: "Padel Doubles Session",
    location: "Padel Haus, Brooklyn",
    distance: "2.1 mi",
    time: "Tomorrow, 7:00 PM",
    postedAgo: "3h ago",
    spots: 2,
    maxSpots: 4,
    likes: 12,
    comments: 4,
    details: "Looking for two more players for a fun doubles game.",
  },
  {
    id: 4,
    user: "James K.",
    sport: "Running",
    title: "Central Park 5K Group Run",
    location: "Central Park, NY",
    distance: "0.5 mi",
    time: "Today, 6:30 AM",
    postedAgo: "30m ago",
    spots: 8,
    maxSpots: 15,
    likes: 31,
    comments: 11,
    details: "Easy pace group run. All levels welcome!",
  },
  {
    id: 5,
    user: "Carlos R.",
    sport: "Soccer",
    title: "Sunday Soccer Pickup Game",
    location: "Pier 40 Soccer Fields, NY",
    distance: "1.5 mi",
    time: "Sun, 10:00 AM",
    postedAgo: "4h ago",
    spots: 6,
    maxSpots: 14,
    likes: 42,
    comments: 15,
    details: "Casual pickup game. Bring your own cleats.",
  },
  {
    id: 6,
    user: "Marcus T.",
    sport: "Basketball",
    title: "3v3 Basketball Pickup",
    location: "West 4th Street Courts, NY",
    distance: "0.9 mi",
    time: "Tomorrow, 5:00 PM",
    postedAgo: "5h ago",
    spots: 2,
    maxSpots: 6,
    likes: 28,
    comments: 8,
    details: "Competitive but friendly 3v3. All skill levels.",
  },
  {
    id: 7,
    user: "Lisa C.",
    sport: "Volleyball",
    title: "Beach Volleyball Session",
    location: "Rockaway Beach, Queens",
    distance: "8.2 mi",
    time: "Sat, 1:00 PM",
    postedAgo: "6h ago",
    spots: 4,
    maxSpots: 12,
    likes: 35,
    comments: 13,
    details: "Fun beach volleyball session. Beginners welcome!",
  },
  {
    id: 8,
    user: "Amy W.",
    sport: "Badminton",
    title: "Casual Badminton Session",
    location: "YMCA Courts, Brooklyn",
    distance: "2.1 mi",
    time: "Tomorrow, 7:00 PM",
    postedAgo: "7h ago",
    spots: 3,
    maxSpots: 4,
    likes: 12,
    comments: 4,
    details: "Relaxed game, all levels welcome. Shuttlecocks provided.",
  },
  {
    id: 9,
    user: "David W.",
    sport: "Climbing",
    title: "Indoor Bouldering Session",
    location: "Brooklyn Boulders, Brooklyn",
    distance: "2.5 mi",
    time: "Tomorrow, 6:00 PM",
    postedAgo: "8h ago",
    spots: 5,
    maxSpots: 8,
    likes: 22,
    comments: 7,
    details: "Beginner to intermediate routes. Shoes available to rent.",
  },
  {
    id: 10,
    user: "Tom H.",
    sport: "Cycling",
    title: "Sunday Morning Bike Ride",
    location: "Hudson River Greenway, NY",
    distance: "0.3 mi",
    time: "Sun, 8:00 AM",
    postedAgo: "9h ago",
    spots: 6,
    maxSpots: 10,
    likes: 19,
    comments: 5,
    details: "15-mile scenic ride along the Hudson. Moderate pace.",
  },
  {
    id: 11,
    user: "Rachel K.",
    sport: "Kickball",
    title: "Kickball Pickup Game",
    location: "McCarren Park, Brooklyn",
    distance: "3.1 mi",
    time: "Sat, 3:00 PM",
    postedAgo: "10h ago",
    spots: 7,
    maxSpots: 16,
    likes: 38,
    comments: 12,
    details: "Super fun and casual kickball game. No experience needed!",
  },
  {
    id: 12,
    user: "Jake M.",
    sport: "Softball",
    title: "Co-ed Softball Game",
    location: "Heckscher Fields, Central Park",
    distance: "1.4 mi",
    time: "Sun, 11:00 AM",
    postedAgo: "11h ago",
    spots: 5,
    maxSpots: 18,
    likes: 27,
    comments: 9,
    details: "Friendly co-ed softball. Gloves provided for those who need.",
  },
  {
    id: 13,
    user: "Nina P.",
    sport: "Flag Football",
    title: "Flag Football Pickup Game",
    location: "Randalls Island, NY",
    distance: "4.2 mi",
    time: "Sat, 2:00 PM",
    postedAgo: "12h ago",
    spots: 4,
    maxSpots: 14,
    likes: 33,
    comments: 11,
    details: "7v7 flag football. All positions needed!",
  },
  {
    id: 14,
    user: "Steve B.",
    sport: "Bowling",
    title: "Bowling Night Out",
    location: "Bowlero Manhattan, NY",
    distance: "1.8 mi",
    time: "Fri, 8:00 PM",
    postedAgo: "13h ago",
    spots: 3,
    maxSpots: 8,
    likes: 41,
    comments: 16,
    details: "Fun bowling night. Shoes included. Drinks optional!",
  },
  {
    id: 15,
    user: "Jenny L.",
    sport: "Table Tennis",
    title: "Table Tennis Round Robin",
    location: "Fat Cat, Greenwich Village",
    distance: "1.1 mi",
    time: "Thu, 7:00 PM",
    postedAgo: "14h ago",
    spots: 4,
    maxSpots: 8,
    likes: 16,
    comments: 6,
    details: "Round robin format. All skill levels. $5 entry.",
  },
  {
    id: 16,
    user: "Alex D.",
    sport: "Social Event",
    title: "Sports Mixer & Happy Hour",
    location: "Slate NY, Midtown",
    distance: "2.3 mi",
    time: "Fri, 6:30 PM",
    postedAgo: "15h ago",
    spots: 12,
    maxSpots: 30,
    likes: 55,
    comments: 22,
    details: "Meet fellow sports lovers over drinks. No equipment needed!",
  },
  {
    id: 17,
    user: "Mia C.",
    sport: "Swimming",
    title: "Open Water Swimming Group",
    location: "Floating Pool, Brooklyn",
    distance: "3.5 mi",
    time: "Sat, 7:30 AM",
    postedAgo: "16h ago",
    spots: 5,
    maxSpots: 10,
    likes: 14,
    comments: 4,
    details: "Casual open water swim. Must be comfortable in open water.",
  },
  {
    id: 18,
    user: "Ben T.",
    sport: "Other",
    title: "Frisbee in the Park",
    location: "Prospect Park, Brooklyn",
    distance: "2.8 mi",
    time: "Sun, 3:00 PM",
    postedAgo: "17h ago",
    spots: 6,
    maxSpots: 12,
    likes: 21,
    comments: 7,
    details: "Ultimate frisbee casual game. No experience needed!",
  },
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

type EventCardProps = {
  event: PlazaEvent;
  mode: SubTab;
  joined: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onJoin: () => void;
  onUnjoin: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function EventCard({
  event,
  mode,
  joined,
  liked,
  onToggleLike,
  onJoin,
  onUnjoin,
  onEdit,
  onDelete,
}: EventCardProps) {
  const placeholder =
    SPORT_PLACEHOLDER[event.sport] ?? SPORT_PLACEHOLDER.Tennis;
  const full = event.spots >= event.maxSpots;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${event.title} — ${event.location} · ${event.time}`,
      });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <View style={styles.eventCard}>
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

      <View style={styles.eventImageWrap}>
        <View
          style={[styles.eventImagePlaceholder, { backgroundColor: placeholder.bg }]}
        >
          <Text style={styles.eventImageEmoji}>{placeholder.emoji}</Text>
        </View>
        <View style={styles.spotsBadge}>
          <Text style={styles.spotsBadgeText}>
            👥 {event.spots}/{event.maxSpots}
          </Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <Text style={styles.eventInfoLeft}>📍 {event.location}</Text>
        <Text style={styles.eventDistance}>{event.distance}</Text>
      </View>

      <View style={styles.eventInfoRow}>
        <Text style={styles.eventInfoLeft}>🕐 {event.time}</Text>
      </View>

      <View style={styles.eventActionsRow}>
        <Pressable onPress={onToggleLike} style={styles.actionChip} hitSlop={8}>
          <Text style={styles.actionChipText}>
            {liked ? "❤️" : "🤍"} {event.likes + (liked ? 1 : 0)}
          </Text>
        </Pressable>
        <View style={styles.actionChip}>
          <Text style={styles.actionChipText}>💬 {event.comments}</Text>
        </View>
        <Pressable onPress={() => void handleShare()} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={MUTED} />
        </Pressable>

        {mode === "discover" ? (
          joined ? (
            <View style={[styles.joinBtn, styles.joinBtnJoined]}>
              <Text style={styles.joinBtnJoinedText}>Joined ✓</Text>
            </View>
          ) : full ? (
            <View style={[styles.joinBtn, styles.joinBtnJoined]}>
              <Text style={styles.joinBtnJoinedText}>Full</Text>
            </View>
          ) : (
            <Pressable style={styles.joinBtn} onPress={onJoin}>
              <Text style={styles.joinBtnText}>Join Event</Text>
            </Pressable>
          )
        ) : null}

        {mode === "joined" ? (
          <Pressable style={styles.cancelBtn} onPress={onUnjoin}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>

      {mode === "my" ? (
        <>
          <Text style={styles.joinedCountText}>
            {event.spots} people joined
          </Text>
          <View style={styles.myEventActions}>
            <Pressable style={styles.outlineBtn} onPress={onEdit}>
              <Text style={styles.outlineBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState<SubTab>("discover");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Latest");
  const [myEvents, setMyEvents] = useState<PlazaEvent[]>([]);
  const [joinedIds, setJoinedIds] = useState<number[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [spotOverrides, setSpotOverrides] = useState<Record<number, number>>({});
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
      const [myRaw, joinedRaw] = await Promise.all([
        AsyncStorage.getItem(MY_EVENTS_KEY),
        AsyncStorage.getItem(JOINED_EVENTS_KEY),
      ]);
      if (myRaw) {
        const parsed = JSON.parse(myRaw) as PlazaEvent[];
        setMyEvents(Array.isArray(parsed) ? parsed : []);
      }
      if (joinedRaw) {
        const parsed = JSON.parse(joinedRaw) as number[];
        setJoinedIds(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setMyEvents([]);
      setJoinedIds([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStorage();
    }, [loadStorage])
  );

  const allDiscoverEvents = useMemo(() => {
    const dummyIds = new Set(DUMMY_EVENTS.map((e) => e.id));
    const created = myEvents.filter((e) => !dummyIds.has(e.id));
    return [...created, ...DUMMY_EVENTS].map((e) => ({
      ...e,
      spots: spotOverrides[e.id] ?? e.spots,
    }));
  }, [myEvents, spotOverrides]);

  const filteredDiscover = useMemo(() => {
    let list = [...allDiscoverEvents];
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

  const joinedEvents = useMemo(
    () =>
      allDiscoverEvents.filter((e) => joinedIds.includes(e.id)).map((e) => ({
        ...e,
        spots: spotOverrides[e.id] ?? e.spots,
      })),
    [allDiscoverEvents, joinedIds, spotOverrides]
  );

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
    const eventDate = date ?? new Date();
    const eventTime = time ?? new Date();
    const dateStr = formatDate(eventDate);
    const timeStr = formatTime(eventTime);

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

    const newEvent: PlazaEvent = {
      id: Date.now(),
      user: "You",
      sport,
      title: formName.trim(),
      location: location.trim(),
      distance: "0.1 mi",
      time: `${dateStr}, ${timeStr}`,
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
    closeModal();
    setSubTab("my");
  };

  const handleJoin = async (event: PlazaEvent) => {
    if (joinedIds.includes(event.id)) return;
    if (event.spots >= event.maxSpots) return;
    const nextJoined = [...joinedIds, event.id];
    await persistJoined(nextJoined);
    setSpotOverrides((prev) => ({
      ...prev,
      [event.id]: (prev[event.id] ?? event.spots) + 1,
    }));
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

  const handleUnjoin = async (eventId: number) => {
    const nextJoined = joinedIds.filter((id) => id !== eventId);
    await persistJoined(nextJoined);
    setSpotOverrides((prev) => {
      const event = allDiscoverEvents.find((e) => e.id === eventId);
      const current = prev[eventId] ?? event?.spots ?? 0;
      return { ...prev, [eventId]: Math.max(0, current - 1) };
    });
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
            joined={joinedIds.includes(event.id)}
            liked={likedIds.has(event.id)}
            onToggleLike={() => toggleLike(event.id)}
            onJoin={() => void handleJoin(event)}
            onUnjoin={() => void handleUnjoin(event.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderMyEvents = () => {
    if (myEvents.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptySubtitle}>Create your first event!</Text>
          <Pressable style={styles.emptyBtn} onPress={openCreateModal}>
            <Text style={styles.emptyBtnText}>Create Event</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.tabScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {myEvents.map((event) => {
          const merged =
            allDiscoverEvents.find((e) => e.id === event.id) ?? event;
          return (
            <EventCard
              key={event.id}
              event={{ ...merged, spots: spotOverrides[merged.id] ?? merged.spots }}
              mode="my"
              joined={joinedIds.includes(event.id)}
              liked={likedIds.has(event.id)}
              onToggleLike={() => toggleLike(event.id)}
              onJoin={() => {}}
              onUnjoin={() => {}}
              onEdit={() => openEditModal(merged)}
              onDelete={() => handleDelete(merged)}
            />
          );
        })}
      </ScrollView>
    );
  };

  const renderJoined = () => {
    if (joinedEvents.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No joined events yet</Text>
          <Text style={styles.emptySubtitle}>Discover events near you!</Text>
          <Pressable style={styles.emptyBtn} onPress={() => setSubTab("discover")}>
            <Text style={styles.emptyBtnText}>Explore Events</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.tabScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {joinedEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            mode="joined"
            joined
            liked={likedIds.has(event.id)}
            onToggleLike={() => toggleLike(event.id)}
            onJoin={() => {}}
            onUnjoin={() => void handleUnjoin(event.id)}
          />
        ))}
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
              onPress={() => setSubTab(tab.key)}
              style={styles.subTabBtn}
            >
              <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
                {tab.label}
              </Text>
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
    marginBottom: 10,
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
