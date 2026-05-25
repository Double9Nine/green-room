import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { upsertGroupChatConversation } from "../lib/groupChatConversationsStorage";
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
    await upsertGroupChatConversation({
      eventId,
      eventTitle,
      sportEmoji,
      organizer,
      lastMessage: getGroupChatPreviewText(loadedMessages),
      lastMessageTime: Date.now(),
    });
  }, [eventId, eventTitle, organizer, sportEmoji]);

  useFocusEffect(
    useCallback(() => {
      void loadAllMembers();
      void loadChatData();
    }, [loadAllMembers, loadChatData])
  );

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
      applyAndPersist((prev) => prev.filter((m) => m.id !== targetId));
      closeActionSheet();
    } else if (key === "convert") {
      if (isConverting) return;
      const target = messages.find((m) => m.id === targetId);
      if (target) void handleConvertVoice(target);
    }
  };

  const stackAvatars = confirmedMembers.slice(0, 4);
  const overflowCount = confirmedMembers.length - 4;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
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

          <View style={styles.avatarStack}>
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
          </View>
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
            {messages.map((msg) => {
              const isSent = msg.sent;
              const isLocation = msg.type === "location";
              const isPhoto = msg.type === "photo" || msg.type === "image";
              const isVoice = msg.type === "voice";
              const isVenue = msg.type === "venue";
              const isConverted = msg.isConvertedTranscript;
              const isRecalled = msg.recalled;
              const canLongPress = !isRecalled && !isConverted;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubbleRow,
                    isSent ? styles.bubbleRowSent : styles.bubbleRowReceived,
                    isConverted && styles.bubbleRowTranscript,
                  ]}
                >
                  {!isSent && !isConverted ? (
                    <View
                      style={[
                        styles.msgAvatar,
                        { backgroundColor: senderAvatarColor(msg.sender) },
                      ]}
                    >
                      <Text style={styles.msgAvatarText}>
                        {msg.initial || memberInitial(msg.sender)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.bubbleColumn}>
                    {!isSent && !isConverted ? (
                      <Text style={styles.senderName}>{msg.sender}</Text>
                    ) : null}

                    <Pressable
                      onLongPress={
                        canLongPress
                          ? () => handleLongPress(msg)
                          : undefined
                      }
                      onPress={
                        isPhoto && msg.imageUri && !isRecalled
                          ? () => setFullImageUri(msg.imageUri ?? null)
                          : undefined
                      }
                      delayLongPress={400}
                      style={[
                        richStyles.bubble,
                        isRecalled && richStyles.bubbleRecalled,
                        isConverted && !isRecalled && richStyles.bubbleConverted,
                        isSent &&
                          !isLocation &&
                          !isPhoto &&
                          !isVoice &&
                          !isVenue &&
                          !isConverted &&
                          !isRecalled &&
                          richStyles.bubbleSent,
                        !isSent &&
                          !isLocation &&
                          !isPhoto &&
                          !isVoice &&
                          !isVenue &&
                          !isConverted &&
                          !isRecalled &&
                          richStyles.bubbleReceived,
                        isVenue && !isRecalled && richStyles.bubbleVenue,
                        isLocation &&
                          isSent &&
                          !isRecalled &&
                          richStyles.bubbleLocation,
                        isLocation &&
                          !isSent &&
                          !isRecalled &&
                          richStyles.bubbleLocationReceived,
                        isPhoto &&
                          isSent &&
                          !isRecalled &&
                          richStyles.bubblePhotoSent,
                        isPhoto &&
                          !isSent &&
                          !isRecalled &&
                          richStyles.bubblePhotoReceived,
                        isVoice &&
                          isSent &&
                          !isRecalled &&
                          richStyles.bubbleVoiceSent,
                        isVoice &&
                          !isSent &&
                          !isRecalled &&
                          richStyles.bubbleVoice,
                      ]}
                    >
                      {renderRichBubbleContent(msg)}
                    </Pressable>

                    {!isConverted ? (
                      <Text
                        style={[
                          styles.messageTime,
                          isSent
                            ? styles.messageTimeSent
                            : styles.messageTimeReceived,
                        ]}
                      >
                        {msg.time}
                      </Text>
                    ) : null}
                  </View>
                </View>
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
    paddingVertical: 10,
    backgroundColor: DARK_GREEN,
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
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  bubbleRowSent: {
    justifyContent: "flex-end",
  },
  bubbleRowReceived: {
    justifyContent: "flex-start",
  },
  bubbleRowTranscript: {
    marginTop: -4,
    paddingLeft: 44,
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  msgAvatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e40af",
  },
  bubbleColumn: {
    maxWidth: "78%",
    flexShrink: 1,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED,
    marginBottom: 2,
    marginLeft: 4,
  },
  messageTime: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },
  messageTimeSent: {
    textAlign: "right",
    marginRight: 4,
  },
  messageTimeReceived: {
    marginLeft: 4,
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
