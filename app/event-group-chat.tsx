import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ChatVenueFinderModal } from "@/components/ChatVenueFinderModal";
import {
  CANCEL_DRAG_DY,
  getSheetActions,
  HOLD_VIBRATE_PATTERN,
  MAX_VOICE_SEC,
  permissionAlert,
  renderRichBubbleContent,
  richStyles,
  type SheetAction,
} from "@/components/RichChatMessaging";
import { MATCH_SPORTS } from "@/constants/matchSports";
import type { VenueSharePayload } from "@/constants/nearbyVenues";
import { getCurrentUser, type CurrentUser } from "../lib/getCurrentUser";
import { convertVoiceToText } from "../lib/convertVoiceToText";
import {
  GROUP_CHAT_CONVERSATIONS_KEY,
  upsertGroupChatConversation,
} from "../lib/groupChatConversationsStorage";
import { incrementUnreadGroup } from "../lib/notificationStore";
import {
  applyMessagesForViewer,
  getGroupChatPreviewText,
  loadGroupChatMessages,
  normalizeGroupChatMessage,
  saveGroupChatMessages,
  type GroupChatMessage,
} from "../lib/groupChatStorage";
import { EVENT_MEMBERS_KEY } from "../lib/eventRequestStorage";

const BG = "#f0fdf4";
const WHITE = "#ffffff";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ACCENT_GREEN = "#15803d";
const DARK_GREEN = "#052e16";
const GOLD = "#d4af37";
const AVATAR_BLUE = "#dbeafe";

const SENDER_AVATAR_COLORS = [
  "#bfdbfe",
  "#fecaca",
  "#fde68a",
  "#e9d5ff",
  "#bbf7d0",
  "#fbcfe8",
];

type ChatMember = {
  name: string;
  initial: string;
  isOrganizer: boolean;
};

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function memberInitial(name: string | undefined): string {
  if (!name || typeof name !== "string") return "?";
  return (name.trim()[0] ?? "?").toUpperCase();
}

function senderAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return SENDER_AVATAR_COLORS[Math.abs(hash) % SENDER_AVATAR_COLORS.length];
}

export default function EventGroupChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    eventId?: string;
    eventTitle?: string;
    sportEmoji?: string;
    organizer?: string;
  }>();

  const eventId = params.eventId ?? "";
  const eventTitle = params.eventTitle ?? "Event";
  const sportEmoji = params.sportEmoji ?? "🎾";
  const organizer = params.organizer ?? "Organizer";

  const matchSport = useMemo(
    () => MATCH_SPORTS.find((s) => s.emoji === sportEmoji),
    [sportEmoji]
  );
  const sportId = matchSport?.id ?? "tennis";

  const [confirmedMembers, setConfirmedMembers] = useState<ChatMember[]>([]);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    name: "You",
    initial: "Y",
  });
  const [inputText, setInputText] = useState("");
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [voiceInputMode, setVoiceInputMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelZoneVisible, setCancelZoneVisible] = useState(false);
  const [cancelZoneHighlighted, setCancelZoneHighlighted] = useState(false);
  const [toast, setToast] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<
    string | null
  >(null);
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isFinishingRef = useRef(false);
  const voiceInputModeRef = useRef(false);
  const startRecordingRef = useRef<() => Promise<void>>(async () => {});
  const cancelRecordingRef = useRef<() => Promise<void>>(async () => {});
  const stopAndSendRecordingRef = useRef<() => Promise<void>>(async () => {});
  const showCancelZoneRef = useRef<() => void>(() => {});
  const hideCancelZoneRef = useRef<(onHidden?: () => void) => void>(() => {});
  const cancelZoneSlide = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSendButton =
    !voiceInputMode && !isRecording && inputText.trim().length > 0;

  voiceInputModeRef.current = voiceInputMode;

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const showToast = useCallback((message: string, durationMs = 2500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToast("");
      toastTimeoutRef.current = null;
    }, durationMs);
  }, []);

  const persistMessages = useCallback(
    async (next: GroupChatMessage[]) => {
      if (!eventId) return;
      await saveGroupChatMessages(eventId, next);
      await upsertGroupChatConversation({
        eventId,
        eventTitle,
        sportEmoji,
        organizer,
        lastMessage: getGroupChatPreviewText(next),
        lastMessageTime: Date.now(),
      });
    },
    [eventId, eventTitle, organizer, sportEmoji]
  );

  const loadAllMembers = useCallback(async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);

    const membersRaw = await AsyncStorage.getItem(EVENT_MEMBERS_KEY);
    const allMembers = membersRaw ? JSON.parse(membersRaw) : {};
    const approvedRaw = (allMembers[eventId] || []).filter(
      (m: { name?: string; userName?: string }) => m && (m.name || m.userName)
    );
    const approvedMembers: ChatMember[] = approvedRaw.map(
      (m: {
        name?: string;
        userName?: string;
        userInitial?: string;
        initial?: string;
      }) => ({
        name: m.userName ?? m.name ?? "",
        initial:
          m.userInitial ||
          m.initial ||
          memberInitial(m.userName ?? m.name),
        isOrganizer: false,
      })
    );

    const allConfirmed: ChatMember[] = [
      {
        name: organizer,
        initial: memberInitial(organizer),
        isOrganizer: true,
      },
      ...approvedMembers.filter((m) => m.name !== organizer),
    ];

    setConfirmedMembers(allConfirmed);
  }, [eventId, organizer]);

  const loadChatData = useCallback(async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);

    const loadedMessages = await loadGroupChatMessages(eventId);
    const forViewer = applyMessagesForViewer(loadedMessages, user.name);
    setMessages(forViewer);

    const existingRaw = await AsyncStorage.getItem(GROUP_CHAT_CONVERSATIONS_KEY);
    const existingList = existingRaw ? JSON.parse(existingRaw) : [];
    const existingConvo = existingList.find(
      (c: { eventId?: string }) => c.eventId === eventId
    );

    if (!existingConvo) {
      await upsertGroupChatConversation({
        eventId,
        eventTitle,
        sportEmoji,
        organizer,
        lastMessage: "",
        lastMessageTime: Date.now(),
      });
    }
  }, [eventId, eventTitle, organizer, sportEmoji]);

  useFocusEffect(
    useCallback(() => {
      void loadAllMembers();
      void loadChatData();
    }, [loadAllMembers, loadChatData])
  );

  useEffect(() => {
    AsyncStorage.getItem("userProfile").then((raw) => {
      if (raw) setMyProfile(JSON.parse(raw));
    });
  }, []);

  const appendMessage = useCallback(
    (
      partial: Omit<
        GroupChatMessage,
        "id" | "sender" | "initial" | "sent" | "time" | "createdAt"
      > & { sent?: boolean }
    ) => {
      const user = currentUser;
      const isSent = partial.sent ?? true;
      if (!isSent) {
        void incrementUnreadGroup();
      }
      const newMsg = normalizeGroupChatMessage({
        ...partial,
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: user.name,
        initial: user.initial,
        sent: isSent,
        time: formatMessageTime(new Date()),
        createdAt: Date.now(),
      });

      setMessages((prev) => {
        const next = [...prev, newMsg];
        void persistMessages(
          next.map((m) => ({
            ...m,
            sent:
              m.sent ||
              m.sender.trim().toLowerCase() === user.name.trim().toLowerCase(),
          }))
        );
        return next;
      });
      scrollToEnd();
    },
    [currentUser, persistMessages, scrollToEnd]
  );

  const sendTextMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text || !eventId) return;
    appendMessage({ type: "text", text });
    setInputText("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [appendMessage, eventId, inputText]);

  const sendPhoto = useCallback(
    (uri: string) => {
      appendMessage({ type: "photo", imageUri: uri });
    },
    [appendMessage]
  );

  const shareVenueInChat = useCallback(
    (venue: VenueSharePayload) => {
      appendMessage({
        type: "venue",
        venueName: venue.venueName,
        venueArea: venue.venueArea,
        venueCourts: venue.venueCourts,
        venuePrice: venue.venuePrice,
        venueRating: venue.venueRating,
        venueAvailable: venue.venueAvailable,
        venueUrl: venue.venueUrl,
      });
      setVenueModalVisible(false);
    },
    [appendMessage]
  );

  const openCamera = async () => {
    try {
      const existing = await ImagePicker.getCameraPermissionsAsync();
      const permission = existing.granted
        ? existing
        : await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        permissionAlert("camera");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        sendPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert("", "Could not open the camera.");
    }
  };

  const openLibrary = async () => {
    try {
      const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
      const permission = existing.granted
        ? existing
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permissionAlert("photos");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        sendPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert("", "Could not open your photo library.");
    }
  };

  const clearRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const stopRecordingInstance = async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return null;
    try {
      await rec.stopAndUnloadAsync();
      return rec.getURI();
    } catch {
      return null;
    }
  };

  const resetRecordingUi = useCallback(() => {
    setIsRecording(false);
    setCancelZoneHighlighted(false);
    setVoiceInputMode(false);
  }, []);

  const showCancelZone = useCallback(() => {
    Animated.spring(cancelZoneSlide, {
      toValue: 1,
      useNativeDriver: true,
      tension: 72,
      friction: 11,
    }).start();
  }, [cancelZoneSlide]);

  const hideCancelZone = useCallback(
    (onHidden?: () => void) => {
      Animated.spring(cancelZoneSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 11,
      }).start(({ finished }) => {
        if (finished) {
          setCancelZoneVisible(false);
          onHidden?.();
        }
      });
    },
    [cancelZoneSlide]
  );

  const startRecording = useCallback(async () => {
    if (!voiceInputModeRef.current || recordingRef.current) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        permissionAlert("microphone");
        hideCancelZoneRef.current(() => resetRecordingUi());
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      recordStartRef.current = Date.now();
      isRecordingRef.current = true;

      clearRecordTimer();
      recordTimerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - recordStartRef.current) / 1000);
        if (sec >= MAX_VOICE_SEC) {
          void stopAndSendRecordingRef.current();
        }
      }, 1000);
    } catch {
      Alert.alert("", "Could not start recording.");
      isRecordingRef.current = false;
      recordingRef.current = null;
      hideCancelZoneRef.current(() => resetRecordingUi());
    }
  }, [resetRecordingUi]);

  const cancelRecording = useCallback(async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    clearRecordTimer();
    isRecordingRef.current = false;
    await stopRecordingInstance();
    isFinishingRef.current = false;
    hideCancelZone(() => {
      resetRecordingUi();
      showToast("Cancelled", 1800);
    });
  }, [hideCancelZone, resetRecordingUi, showToast]);

  const stopAndSendRecording = useCallback(async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    clearRecordTimer();
    isRecordingRef.current = false;

    const uri = await stopRecordingInstance();
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - recordStartRef.current) / 1000)
    );

    isFinishingRef.current = false;

    const sendVoice = () => {
      if (elapsed < 1 || !uri) return;
      appendMessage({
        type: "voice",
        voiceUri: uri,
        voiceDurationSec: Math.min(elapsed, MAX_VOICE_SEC),
      });
    };

    hideCancelZone(() => {
      resetRecordingUi();
      sendVoice();
    });
  }, [appendMessage, hideCancelZone, resetRecordingUi]);

  startRecordingRef.current = startRecording;
  cancelRecordingRef.current = cancelRecording;
  stopAndSendRecordingRef.current = stopAndSendRecording;
  showCancelZoneRef.current = () => {
    setCancelZoneVisible(true);
    showCancelZone();
  };
  hideCancelZoneRef.current = hideCancelZone;

  const holdPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (!voiceInputModeRef.current) return;
        Vibration.vibrate([...HOLD_VIBRATE_PATTERN]);
        setCancelZoneHighlighted(false);
        setIsRecording(true);
        showCancelZoneRef.current();
        void startRecordingRef.current();
      },
      onPanResponderMove: (_, gesture) => {
        setCancelZoneHighlighted(gesture.dy < CANCEL_DRAG_DY);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < CANCEL_DRAG_DY) {
          void cancelRecordingRef.current();
        } else {
          void stopAndSendRecordingRef.current();
        }
      },
      onPanResponderTerminate: (_, gesture) => {
        if (gesture.dy < CANCEL_DRAG_DY) {
          void cancelRecordingRef.current();
        } else {
          void stopAndSendRecordingRef.current();
        }
      },
    })
  ).current;

  const toggleVoiceInputMode = () => {
    if (isRecordingRef.current) return;
    setVoiceInputMode((on) => {
      if (on) return false;
      inputRef.current?.blur();
      return true;
    });
  };

  const cancelZoneTranslateY = cancelZoneSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  const cancelZoneOpacity = cancelZoneSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      clearRecordTimer();
      void stopRecordingInstance();
    };
  }, []);

  const closeActionSheet = () => setActionSheetMessageId(null);

  const handleLongPress = useCallback((message: GroupChatMessage) => {
    if (message.recalled || message.isConvertedTranscript) return;
    setActionSheetMessageId(message.id);
  }, []);

  const actionSheetTarget = useMemo(
    () => messages.find((m) => m.id === actionSheetMessageId) ?? null,
    [messages, actionSheetMessageId]
  );

  const sheetActions = useMemo(
    () => (actionSheetTarget ? getSheetActions(actionSheetTarget) : []),
    [actionSheetTarget]
  );

  const applyAndPersist = useCallback(
    (updater: (prev: GroupChatMessage[]) => GroupChatMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        void persistMessages(next);
        return next;
      });
    },
    [persistMessages]
  );

  const handleConvertVoice = useCallback(
    async (target: GroupChatMessage) => {
      closeActionSheet();
      setIsConverting(true);

      try {
        if (!target.voiceUri) {
          throw new Error("Missing voice URI");
        }

        const transcribed = await convertVoiceToText(target.voiceUri);

        applyAndPersist((prev) => {
          const idx = prev.findIndex((m) => m.id === target.id);
          if (idx === -1) return prev;

          const existing = prev[idx + 1];
          if (
            existing?.isConvertedTranscript &&
            existing.convertedFromMessageId === target.id
          ) {
            return prev.map((m, i) =>
              i === idx + 1 ? { ...m, text: transcribed } : m
            );
          }

          const transcript = normalizeGroupChatMessage({
            id: `msg-${Date.now()}-transcript`,
            type: "text",
            text: transcribed,
            sender: target.sender,
            initial: target.initial,
            sent: target.sent,
            time: formatMessageTime(new Date()),
            createdAt: Date.now(),
            isConvertedTranscript: true,
            convertedFromMessageId: target.id,
          });

          const next = [...prev];
          next.splice(idx + 1, 0, transcript);
          return next;
        });
        scrollToEnd();
      } catch {
        showToast("Could not convert, please try again");
      } finally {
        setIsConverting(false);
        closeActionSheet();
      }
    },
    [applyAndPersist, scrollToEnd, showToast]
  );

  const handleSheetAction = (key: SheetAction["key"]) => {
    if (!actionSheetMessageId) return;
    const targetId = actionSheetMessageId;

    if (key === "recall") {
      applyAndPersist((prev) =>
        prev.map((m) => {
          if (m.id === targetId) {
            return { ...m, recalled: true };
          }
          if (m.convertedFromMessageId === targetId) {
            return { ...m, recalled: true };
          }
          return m;
        })
      );
      closeActionSheet();
    } else if (key === "delete") {
      closeActionSheet();
      Alert.alert(
        "Delete Message",
        "This will remove the message from your view only.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              applyAndPersist((prev) =>
                prev.filter((m) => m.id !== targetId)
              );
            },
          },
        ]
      );
    } else if (key === "convert") {
      if (isConverting) return;
      const target = messages.find((m) => m.id === targetId);
      if (target) void handleConvertVoice(target);
    }
  };

  const stackAvatars = confirmedMembers.slice(0, 4);
  const overflowCount = confirmedMembers.length - 4;

  const shouldShowTime = (index: number): boolean => {
    if (index === 0) return true;
    const curr = messages[index];
    const prev = messages[index - 1];
    if (!curr.createdAt || !prev.createdAt) return true;
    return curr.createdAt - prev.createdAt > 60 * 1000;
  };

  const formatMessageTimestamp = (createdAt: number): string => {
    if (!createdAt) return "";
    const now = new Date();
    const msgDate = new Date(createdAt);
    const nowDay = new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    ).getTime();
    const msgDay = new Date(
      msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()
    ).getTime();
    const diffDays = Math.round((nowDay - msgDay) / (1000 * 60 * 60 * 24));
    const timeStr = msgDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (diffDays === 0) return timeStr;
    if (diffDays === 1) return `Yesterday ${timeStr}`;
    if (diffDays < 7)
      return `${msgDate.toLocaleDateString("en-US", { weekday: "short" })} ${timeStr}`;
    return `${msgDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${timeStr}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#052e16" }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBack}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={GOLD} />
            <Text style={styles.headerBackText}>Back</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sportEmoji} {eventTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              {confirmedMembers.length} members
            </Text>
          </View>

          <Pressable
            style={styles.avatarStack}
            onPress={() => setShowMembersModal(true)}
            hitSlop={8}
          >
            {stackAvatars.length === 0 ? (
              <View style={[styles.stackAvatar, styles.stackAvatarOrganizer]}>
                <Text style={styles.stackAvatarTextOrganizer}>?</Text>
              </View>
            ) : (
              stackAvatars.map((member, index) => (
                <View
                  key={`${member.name}-${index}`}
                  style={[
                    styles.stackAvatar,
                    index === 0
                      ? styles.stackAvatarOrganizer
                      : styles.stackAvatarMember,
                    index > 0 && styles.stackAvatarOverlap,
                    { zIndex: confirmedMembers.length - index },
                  ]}
                >
                  <Text
                    style={
                      index === 0
                        ? styles.stackAvatarTextOrganizer
                        : styles.stackAvatarTextMember
                    }
                  >
                    {member.initial || member.name?.[0] || "?"}
                  </Text>
                </View>
              ))
            )}
            {overflowCount > 0 ? (
              <View
                style={[
                  styles.stackAvatar,
                  styles.stackAvatarOverflow,
                  styles.stackAvatarOverlap,
                ]}
              >
                <Text style={styles.stackAvatarTextOverflow}>
                  +{overflowCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
          >
            {messages.length === 0 ? (
              <Text style={styles.chatEmptyText}>
                No messages yet. Say hi to the group!
              </Text>
            ) : null}
            {messages.map((msg, index) => {
              const canLongPress = !msg.recalled && !msg.isConvertedTranscript;
              const isPhoto = msg.type === "photo" || msg.type === "image";

              return (
                <React.Fragment key={msg.id}>
                  {shouldShowTime(index) ? (
                    <Text style={styles.timeLabel}>
                      {formatMessageTimestamp(msg.createdAt)}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubbleRow,
                      msg.sent
                        ? styles.bubbleRowSent
                        : styles.bubbleRowReceived,
                    ]}
                  >
                    {!msg.sent ? (
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/player-profile",
                            params: {
                              playerName: msg.sender ?? "Member",
                              playerSkill: "",
                              sportEmoji,
                              hideAvailability: "true",
                            },
                          })
                        }
                        style={[
                          styles.msgAvatar,
                          { backgroundColor: senderAvatarColor(msg.sender) },
                        ]}
                      >
                        <Text style={styles.msgAvatarText}>
                          {msg.initial ||
                            msg.sender?.[0]?.toUpperCase() ||
                            "?"}
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onLongPress={
                        canLongPress ? () => handleLongPress(msg) : undefined
                      }
                      onPress={
                        isPhoto && msg.imageUri && !msg.recalled
                          ? () => setFullImageUri(msg.imageUri ?? null)
                          : undefined
                      }
                      delayLongPress={400}
                      style={[
                        styles.bubble,
                        msg.recalled && styles.bubbleRecalled,
                        msg.sent && !msg.recalled && styles.bubbleSent,
                        !msg.sent && !msg.recalled && styles.bubbleReceived,
                      ]}
                    >
                      {!msg.sent ? (
                        <Text style={styles.senderName}>{msg.sender}</Text>
                      ) : null}
                      {renderRichBubbleContent(msg)}
                    </Pressable>

                    {msg.sent ? (
                      <Pressable
                        onPress={() => router.push("/my-profile")}
                        style={styles.msgAvatar}
                      >
                        {myProfile?.photo ? (
                          <Image
                            source={{ uri: myProfile.photo }}
                            style={{ width: 32, height: 32, borderRadius: 16 }}
                          />
                        ) : (
                          <View
                            style={[
                              styles.msgAvatar,
                              { backgroundColor: "#15803d" },
                            ]}
                          >
                            <Text style={styles.msgAvatarText}>
                              {currentUser.initial}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>

          {cancelZoneVisible ? (
            <Animated.View
              style={[
                richStyles.cancelZone,
                {
                  opacity: cancelZoneOpacity,
                  transform: [{ translateY: cancelZoneTranslateY }],
                  backgroundColor: cancelZoneHighlighted
                    ? "#b91c1c"
                    : "#dc2626",
                },
              ]}
              pointerEvents="none"
            >
              <Text style={richStyles.cancelZoneTitle}>✕ Cancel</Text>
              <Text style={richStyles.cancelZoneSubtitle}>
                Slide here to cancel
              </Text>
            </Animated.View>
          ) : null}

          <View
            style={[
              styles.inputBar,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <Pressable
              onPress={toggleVoiceInputMode}
              style={richStyles.iconBtn}
              hitSlop={6}
              disabled={isRecording}
            >
              <Ionicons
                name={voiceInputMode ? "mic" : "mic-outline"}
                size={26}
                color={ACCENT_GREEN}
              />
            </Pressable>

            {voiceInputMode ? (
              <View
                style={[richStyles.inputCenter, richStyles.holdToTalkPill]}
                {...holdPanResponder.panHandlers}
              >
                <Text style={richStyles.holdToTalkText}>
                  {isRecording ? "Release to Send" : "Hold to Talk"}
                </Text>
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                style={richStyles.input}
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                multiline={false}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={sendTextMessage}
              />
            )}

            <Pressable
              onPress={() => setVenueModalVisible(true)}
              style={richStyles.iconBtn}
              hitSlop={6}
              disabled={isRecording}
            >
              <Ionicons
                name="location-outline"
                size={26}
                color={ACCENT_GREEN}
              />
            </Pressable>

            <Pressable onPress={openCamera} style={richStyles.iconBtn} hitSlop={6}>
              <Ionicons name="camera-outline" size={26} color={ACCENT_GREEN} />
            </Pressable>

            <Pressable onPress={openLibrary} style={richStyles.iconBtn} hitSlop={6}>
              <Ionicons name="image-outline" size={26} color={ACCENT_GREEN} />
            </Pressable>

            {!voiceInputMode && showSendButton ? (
              <Pressable
                onPress={sendTextMessage}
                style={({ pressed }) => [
                  richStyles.sendBtn,
                  pressed && richStyles.sendBtnPressed,
                ]}
              >
                <Ionicons name="arrow-up" size={22} color={WHITE} />
              </Pressable>
            ) : !voiceInputMode ? (
              <View style={richStyles.sendPlaceholder} />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {toast ? (
        <View style={richStyles.toast} pointerEvents="none">
          <Text style={richStyles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <ChatVenueFinderModal
        visible={venueModalVisible}
        sportEmoji={sportEmoji}
        sportId={sportId}
        playerName={currentUser.name}
        onClose={() => setVenueModalVisible(false)}
        onShareVenue={shareVenueInChat}
      />

      <Modal
        visible={actionSheetMessageId != null}
        transparent
        animationType="slide"
        onRequestClose={closeActionSheet}
      >
        <View style={richStyles.sheetBackdrop}>
          <Pressable
            style={richStyles.sheetBackdropPress}
            onPress={closeActionSheet}
          />
          <View
            style={[
              richStyles.sheet,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            {sheetActions.map((action, index) => (
              <Pressable
                key={action.key}
                style={[
                  richStyles.sheetOption,
                  index < sheetActions.length - 1 && richStyles.sheetOptionBorder,
                ]}
                onPress={() => handleSheetAction(action.key)}
              >
                <Text
                  style={[
                    richStyles.sheetOptionText,
                    action.tone === "destructive" &&
                      richStyles.sheetOptionDestructive,
                    action.tone === "primary" && richStyles.sheetOptionPrimary,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable style={richStyles.sheetCancel} onPress={closeActionSheet}>
              <Text style={richStyles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={fullImageUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImageUri(null)}
      >
        <Pressable
          style={richStyles.fullImageBackdrop}
          onPress={() => setFullImageUri(null)}
        >
          {fullImageUri ? (
            <Image
              source={{ uri: fullImageUri }}
              style={richStyles.fullImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            style={richStyles.fullImageClose}
            onPress={() => setFullImageUri(null)}
          >
            <Ionicons name="close" size={28} color={WHITE} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showMembersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMembersModal(false)}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setShowMembersModal(false)}
        />
        <View
          style={{
            backgroundColor: WHITE,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: "60%",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 16, color: TEXT }}>
            Members ({confirmedMembers.length})
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {confirmedMembers.map((member, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: BORDER,
                }}
              >
                <Pressable
                  onPress={() => {
                    setShowMembersModal(false);
                    router.push({
                      pathname: "/player-profile",
                      params: {
                        playerName: member.name,
                        playerSkill: "",
                        sportEmoji,
                        hideAvailability: "true",
                      },
                    });
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: member.isOrganizer ? ACCENT_GREEN : "#bfdbfe",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: member.isOrganizer ? WHITE : "#1e40af",
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      {member.name?.[0] ?? "?"}
                    </Text>
                  </View>
                </Pressable>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT }}>
                    {member.name}
                  </Text>
                  {member.isOrganizer ? (
                    <Text style={{ fontSize: 12, color: ACCENT_GREEN, fontWeight: "600" }}>
                      Organizer
                    </Text>
                  ) : null}
                </View>

                {member.isOrganizer && currentUser.name !== organizer ? (
                  <Pressable
                    onPress={() => {
                      setShowMembersModal(false);
                      router.push({
                        pathname: "/chat-conversation",
                        params: {
                          playerName: member.name,
                          playerSkill: "",
                          playerLocation: "",
                          sportEmoji,
                          playerId: `organizer-${eventId}`,
                          isOrganizerChat: "true",
                          eventId: String(eventId),
                          fromGroupChat: "true",
                        },
                      });
                    }}
                    style={{
                      backgroundColor: ACCENT_GREEN,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: WHITE, fontSize: 12, fontWeight: "700" }}>
                      Private Chat
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setShowMembersModal(false)}
            style={{ paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: MUTED, fontWeight: "600" }}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: "#052e16",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.25)",
    gap: 8,
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 72,
  },
  headerBackText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 72,
    justifyContent: "flex-end",
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
  },
  stackAvatarOrganizer: {
    backgroundColor: ACCENT_GREEN,
  },
  stackAvatarMember: {
    backgroundColor: AVATAR_BLUE,
  },
  stackAvatarOverflow: {
    backgroundColor: BORDER,
  },
  stackAvatarOverlap: {
    marginLeft: -10,
  },
  stackAvatarTextOrganizer: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "800",
  },
  stackAvatarTextMember: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "800",
  },
  stackAvatarTextOverflow: {
    fontSize: 10,
    fontWeight: "800",
    color: MUTED,
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexGrow: 1,
  },
  chatEmptyText: {
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
    paddingVertical: 32,
  },
  timeLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginVertical: 4,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  bubbleRowSent: {
    justifyContent: "flex-end",
  },
  bubbleRowReceived: {
    justifyContent: "flex-start",
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  msgAvatarText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleRecalled: {
    backgroundColor: "#e2e8f0",
    borderWidth: 0,
    paddingVertical: 8,
  },
  bubbleSent: {
    backgroundColor: "#15803d",
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 2,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
});
