import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { MATCH_SPORTS } from "@/constants/matchSports";
import type { VenueSharePayload } from "@/constants/nearbyVenues";
import {
  markConversationRead,
  updateConversationPreview,
  upsertConversation,
} from "@/lib/conversationsStorage";
import { convertVoiceToText } from "@/lib/convertVoiceToText";

const DARK_GREEN = "#052e16";
const ACCENT_GREEN = "#15803d";
const GOLD = "#d4af37";
const MAX_VOICE_SEC = 60;
const CANCEL_DRAG_DY = -50;
const HOLD_VIBRATE_PATTERN = [0, 30, 20, 30] as const;
type MessageType =
  | "text"
  | "photo"
  | "image"
  | "location"
  | "voice"
  | "venue";

type ChatMessage = {
  id: string;
  sent: boolean;
  type: MessageType;
  createdAt: number;
  recalled?: boolean;
  text?: string;
  imageUri?: string;
  locationLabel?: string;
  voiceDurationSec?: number;
  voiceUri?: string;
  isConvertedTranscript?: boolean;
  convertedFromMessageId?: string;
  venueName?: string;
  venueArea?: string;
  venueCourts?: number;
  venuePrice?: string;
  venueRating?: string;
  venueAvailable?: string;
  venueUrl?: string;
};

type SheetAction = {
  key: "recall" | "delete" | "convert";
  label: string;
  tone: "destructive" | "primary" | "default";
};

type PlayerRouteParams = {
  playerId: string;
  playerName: string;
  playerAge: string;
  playerLocation: string;
  playerSkill: string;
  playerPurpose: string;
  sportEmoji: string;
};

function buildPlayerParams(
  params: Record<string, string | string[] | undefined>
): PlayerRouteParams {
  const str = (key: string) => {
    const v = params[key];
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v[0]) return String(v[0]);
    return "";
  };
  return {
    playerId: str("playerId"),
    playerName: str("playerName") || "Player",
    playerAge: str("playerAge"),
    playerLocation: str("playerLocation"),
    playerSkill: str("playerSkill"),
    playerPurpose: str("playerPurpose"),
    sportEmoji: str("sportEmoji") || "🎾",
  };
}

function formatVoiceDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VenueMessageBubble({ msg }: { msg: ChatMessage }) {
  const bookingUrl = msg.venueUrl ?? "https://www.google.com";

  return (
    <View style={styles.venueBubbleInner}>
      <Text style={styles.venueBubbleName}>{msg.venueName}</Text>
      {msg.venueArea ? (
        <Text style={styles.venueBubbleArea}>{msg.venueArea}</Text>
      ) : null}
      <Text style={styles.venueBubbleMeta}>
        {msg.venueCourts} | {msg.venuePrice} | {msg.venueRating}
      </Text>
      {msg.venueAvailable ? (
        <Text style={styles.venueBubbleAvailable}>{msg.venueAvailable}</Text>
      ) : null}
      <Pressable onPress={() => void Linking.openURL(bookingUrl)}>
        <Text style={styles.venueBookLink}>Book Now →</Text>
      </Pressable>
    </View>
  );
}

function VoiceMessageBubble({
  msg,
  isSent,
}: {
  msg: ChatMessage;
  isSent: boolean;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(
    (msg.voiceDurationSec ?? 0) * 1000
  );

  const durationLabel = formatVoiceDuration(msg.voiceDurationSec ?? 0);
  const progress =
    durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    try {
      await sound.unloadAsync();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      void unloadSound();
    };
  }, [unloadSound]);

  const togglePlay = async () => {
    if (!msg.voiceUri) return;

    try {
      if (playing && soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setPlaying(true);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: msg.voiceUri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMs(status.positionMillis ?? 0);
          if (status.durationMillis != null) {
            setDurationMs(status.durationMillis);
          }
          if (status.didJustFinish) {
            setPlaying(false);
            setPositionMs(0);
            void sound.setPositionAsync(0);
          }
        }
      );

      soundRef.current = sound;
      setPlaying(true);
    } catch {
      Alert.alert("", "Could not play this voice message.");
      setPlaying(false);
    }
  };

  return (
    <View style={styles.voiceBubbleInner}>
      <Text
        style={[
          styles.voiceMessageLine,
          isSent && styles.voiceMessageLineSent,
        ]}
      >
        Voice message · {durationLabel}
      </Text>

      <Pressable
        onPress={() => void togglePlay()}
        style={[
          styles.voicePlayBtn,
          isSent ? styles.voicePlayBtnSent : styles.voicePlayBtnReceived,
        ]}
        disabled={!msg.voiceUri}
      >
        <Ionicons
          name={playing ? "pause" : "play"}
          size={16}
          color={isSent ? "#ffffff" : ACCENT_GREEN}
        />
      </Pressable>

      <View
        style={[
          styles.voiceProgressTrack,
          isSent && styles.voiceProgressTrackSent,
        ]}
      >
        <View
          style={[
            styles.voiceProgressFill,
            isSent && styles.voiceProgressFillSent,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

function getSheetActions(msg: ChatMessage): SheetAction[] {
  if (msg.recalled || msg.isConvertedTranscript) return [];

  if (msg.sent) {
    if (msg.type === "voice") {
      return [
        { key: "convert", label: "Convert to Text", tone: "primary" },
        { key: "recall", label: "Recall", tone: "destructive" },
      ];
    }
    return [{ key: "recall", label: "Recall", tone: "destructive" }];
  }

  if (msg.type === "voice") {
    return [
      { key: "convert", label: "Convert to Text", tone: "primary" },
      { key: "delete", label: "Delete", tone: "destructive" },
    ];
  }

  return [{ key: "delete", label: "Delete", tone: "destructive" }];
}

function getSentMessagePreview(
  msg: Omit<ChatMessage, "id" | "createdAt">
): string | null {
  if (!msg.sent) return null;
  if (msg.type === "text") return msg.text?.trim() || "Message";
  if (msg.type === "photo" || msg.type === "image") return "Photo";
  if (msg.type === "voice") return "Voice message";
  if (msg.type === "venue") return `📍 ${msg.venueName ?? "Venue"}`;
  if (msg.type === "location") return msg.locationLabel ?? "Location";
  return "Message";
}

function permissionAlert(kind: "camera" | "photos" | "microphone") {
  const labels = {
    camera: "camera",
    photos: "photo library",
    microphone: "microphone",
  };
  Alert.alert(
    "Permission needed",
    `Enable ${labels[kind]} access in Settings to use this feature.`,
    [{ text: "OK" }]
  );
}

export default function ChatConversationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const rawParams = useLocalSearchParams<{
    playerId?: string;
    playerName?: string;
    playerAge?: string;
    playerLocation?: string;
    playerSkill?: string;
    playerPurpose?: string;
    sportEmoji?: string;
  }>();

  const playerParams = useMemo(
    () => buildPlayerParams(rawParams),
    [rawParams]
  );

  const { playerName, playerLocation, playerSkill, sportEmoji } = playerParams;

  const conversationId = useMemo(
    () => playerParams.playerId || `convo-${Date.now()}`,
    [playerParams.playerId]
  );

  const matchSport = useMemo(
    () => MATCH_SPORTS.find((s) => s.emoji === sportEmoji),
    [sportEmoji]
  );

  const sportName = matchSport?.name ?? "your sport";
  const sportId = matchSport?.id ?? "tennis";

  const welcomeText = `Hey! I saw we matched for ${sportName}. Would love to play sometime! ${sportEmoji}`;

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      type: "text",
      text: welcomeText,
      sent: false,
      createdAt: Date.now(),
    },
  ]);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [voiceInputMode, setVoiceInputMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelZoneVisible, setCancelZoneVisible] = useState(false);
  const [cancelZoneHighlighted, setCancelZoneHighlighted] = useState(false);
  const [toast, setToast] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<
    string | null
  >(null);
  const [venueModalVisible, setVenueModalVisible] = useState(false);

  const headerTitle = `${sportEmoji} ${playerName}`;
  const subtitle = [playerSkill, playerLocation].filter(Boolean).join(" · ");
  const showSendButton =
    !voiceInputMode && !isRecording && inputText.trim().length > 0;

  voiceInputModeRef.current = voiceInputMode;

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
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

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const saveConversation = async () => {
      await upsertConversation({
        id: conversationId,
        playerName: playerParams.playerName,
        playerLocation: playerParams.playerLocation,
        playerSkill: playerParams.playerSkill,
        playerPurpose: playerParams.playerPurpose,
        playerAge: playerParams.playerAge,
        sportEmoji: playerParams.sportEmoji,
        lastMessage: welcomeText,
        lastMessageTime: Date.now(),
        unread: true,
      });
      await markConversationRead(conversationId);
    };
    void saveConversation();
  }, [conversationId, playerParams, welcomeText]);

  const syncConversationPreview = useCallback(
    (lastMessage: string) => {
      void updateConversationPreview(conversationId, lastMessage);
    },
    [conversationId]
  );

  const appendMessage = useCallback(
    (msg: Omit<ChatMessage, "id" | "createdAt">) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          id: `msg-${Date.now()}-${Math.random()}`,
          createdAt: Date.now(),
        },
      ]);
      scrollToEnd();
      const preview = getSentMessagePreview(msg);
      if (preview) {
        syncConversationPreview(preview);
      }
    },
    [scrollToEnd, syncConversationPreview]
  );

  const openProfile = () => {
    router.push({
      pathname: "/player-profile",
      params: { ...playerParams },
    });
  };

  const sendTextMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: "text",
        text,
        sent: true,
        createdAt: Date.now(),
      },
    ]);
    setInputText("");
    scrollToEnd();
    syncConversationPreview(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputText, scrollToEnd, syncConversationPreview]);

  const sendPhoto = useCallback(
    (uri: string) => {
      appendMessage({ type: "photo", imageUri: uri, sent: true });
    },
    [appendMessage]
  );

  const shareVenueInChat = useCallback(
    (venue: VenueSharePayload) => {
      appendMessage({
        type: "venue",
        sent: true,
        venueName: venue.venueName,
        venueArea: venue.venueArea,
        venueCourts: venue.venueCourts,
        venuePrice: venue.venuePrice,
        venueRating: venue.venueRating,
        venueAvailable: venue.venueAvailable,
        venueUrl: venue.venueUrl,
      });
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

  const hideCancelZone = useCallback((onHidden?: () => void) => {
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
  }, [cancelZoneSlide]);

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
        sent: true,
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
      clearRecordTimer();
      void stopRecordingInstance();
    };
  }, []);

  const closeActionSheet = () => setActionSheetMessageId(null);

  const handleLongPress = useCallback((message: ChatMessage) => {
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

  const handleConvertVoice = useCallback(
    async (target: ChatMessage) => {
      closeActionSheet();
      setIsConverting(true);

      try {
        if (!target.voiceUri) {
          throw new Error("Missing voice URI");
        }

        const transcribed = await convertVoiceToText(target.voiceUri);

        setMessages((prev) => {
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

          const transcript: ChatMessage = {
            id: `msg-${Date.now()}-transcript`,
            type: "text",
            text: transcribed,
            sent: target.sent,
            createdAt: Date.now(),
            isConvertedTranscript: true,
            convertedFromMessageId: target.id,
          };

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
    [scrollToEnd, showToast]
  );

  const handleSheetAction = (key: SheetAction["key"]) => {
    if (!actionSheetMessageId) return;
    const targetId = actionSheetMessageId;

    if (key === "recall") {
      setMessages((prev) =>
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
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
      closeActionSheet();
    } else if (key === "convert") {
      if (isConverting) return;
      const target = messages.find((m) => m.id === targetId);
      if (target) void handleConvertVoice(target);
    }
  };

  const renderBubbleContent = (msg: ChatMessage) => {
    if (msg.recalled) {
      return <Text style={styles.recalledText}>Message recalled</Text>;
    }

    const isSent = msg.sent;

    if (
      (msg.type === "photo" || msg.type === "image") &&
      msg.imageUri
    ) {
      return (
        <Image source={{ uri: msg.imageUri }} style={styles.photoThumb} />
      );
    }

    if (msg.type === "location" && msg.locationLabel) {
      return (
        <View style={styles.locationBubbleInner}>
          <Ionicons
            name="location"
            size={18}
            color={isSent ? "#ffffff" : ACCENT_GREEN}
          />
          <Text
            style={[
              styles.locationBubbleText,
              !isSent && styles.locationBubbleTextReceived,
            ]}
          >
            {msg.locationLabel}
          </Text>
        </View>
      );
    }

    if (msg.type === "voice") {
      return <VoiceMessageBubble msg={msg} isSent={isSent} />;
    }

    if (msg.type === "venue" && msg.venueName) {
      return <VenueMessageBubble msg={msg} />;
    }

    if (msg.isConvertedTranscript) {
      return (
        <Text style={styles.convertedTranscriptText}> {msg.text}</Text>
      );
    }

    return (
      <Text
        style={[
          styles.bubbleText,
          isSent ? styles.bubbleTextSent : styles.bubbleTextReceived,
        ]}
      >
        {msg.text}
      </Text>
    );
  };

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
              {headerTitle}
            </Text>
            {subtitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <Pressable onPress={openProfile} style={styles.avatar} hitSlop={8}>
            <Ionicons name="person" size={20} color={GOLD} />
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
                      styles.bubble,
                      isRecalled && styles.bubbleRecalled,
                      isConverted && !isRecalled && styles.bubbleConverted,
                      isSent &&
                        !isLocation &&
                        !isPhoto &&
                        !isVoice &&
                        !isVenue &&
                        !isConverted &&
                        !isRecalled &&
                        styles.bubbleSent,
                      !isSent &&
                        !isLocation &&
                        !isPhoto &&
                        !isVoice &&
                        !isVenue &&
                        !isConverted &&
                        !isRecalled &&
                        styles.bubbleReceived,
                      isVenue && !isRecalled && styles.bubbleVenue,
                      isLocation && isSent && !isRecalled && styles.bubbleLocation,
                      isLocation &&
                        !isSent &&
                        !isRecalled &&
                        styles.bubbleLocationReceived,
                      isPhoto && isSent && !isRecalled && styles.bubblePhotoSent,
                      isPhoto &&
                        !isSent &&
                        !isRecalled &&
                        styles.bubblePhotoReceived,
                      isVoice &&
                        isSent &&
                        !isRecalled &&
                        styles.bubbleVoiceSent,
                      isVoice &&
                        !isSent &&
                        !isRecalled &&
                        styles.bubbleVoice,
                    ]}
                  >
                    {renderBubbleContent(msg)}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          {cancelZoneVisible ? (
            <Animated.View
              style={[
                styles.cancelZone,
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
              <Text style={styles.cancelZoneTitle}>✕ Cancel</Text>
              <Text style={styles.cancelZoneSubtitle}>
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
              style={styles.iconBtn}
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
                style={[styles.inputCenter, styles.holdToTalkPill]}
                {...holdPanResponder.panHandlers}
              >
                <Text style={styles.holdToTalkText}>
                  {isRecording ? "Release to Send" : "Hold to Talk"}
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="#94a3b8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline={false}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={sendTextMessage}
                />

                {showSendButton ? (
                  <Pressable
                    onPress={sendTextMessage}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      pressed && styles.sendBtnPressed,
                    ]}
                  >
                    <Ionicons name="arrow-up" size={22} color="#ffffff" />
                  </Pressable>
                ) : (
                  <View style={styles.sendPlaceholder} />
                )}
              </>
            )}

            <Pressable
              onPress={() => setVenueModalVisible(true)}
              style={styles.iconBtn}
              hitSlop={6}
              disabled={isRecording}
            >
              <Ionicons
                name="location-outline"
                size={26}
                color={ACCENT_GREEN}
              />
            </Pressable>

            <Pressable onPress={openCamera} style={styles.iconBtn} hitSlop={6}>
              <Ionicons name="camera-outline" size={26} color={ACCENT_GREEN} />
            </Pressable>

            <Pressable onPress={openLibrary} style={styles.iconBtn} hitSlop={6}>
              <Ionicons name="image-outline" size={26} color={ACCENT_GREEN} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <ChatVenueFinderModal
        visible={venueModalVisible}
        sportEmoji={sportEmoji}
        sportId={sportId}
        playerName={playerName}
        onClose={() => setVenueModalVisible(false)}
        onShareVenue={shareVenueInChat}
      />

      <Modal
        visible={actionSheetMessageId != null}
        transparent
        animationType="slide"
        onRequestClose={closeActionSheet}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={styles.sheetBackdropPress}
            onPress={closeActionSheet}
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            {sheetActions.map((action, index) => (
              <Pressable
                key={action.key}
                style={[
                  styles.sheetOption,
                  index < sheetActions.length - 1 && styles.sheetOptionBorder,
                ]}
                onPress={() => handleSheetAction(action.key)}
              >
                <Text
                  style={[
                    styles.sheetOptionText,
                    action.tone === "destructive" &&
                      styles.sheetOptionDestructive,
                    action.tone === "primary" && styles.sheetOptionPrimary,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.sheetCancel} onPress={closeActionSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
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
          style={styles.fullImageBackdrop}
          onPress={() => setFullImageUri(null)}
        >
          {fullImageUri ? (
            <Image
              source={{ uri: fullImageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            style={styles.fullImageClose}
            onPress={() => setFullImageUri(null)}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DARK_GREEN,
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
    backgroundColor: DARK_GREEN,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212,175,55,0.25)",
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
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "#bbf7d0",
    fontSize: 12,
    lineHeight: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#065f46",
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bubbleRowSent: {
    justifyContent: "flex-end",
  },
  bubbleRowReceived: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  bubbleRecalled: {
    backgroundColor: "#e2e8f0",
    borderWidth: 0,
    paddingVertical: 8,
  },
  bubbleSent: {
    backgroundColor: ACCENT_GREEN,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
  },
  bubbleLocation: {
    backgroundColor: ACCENT_GREEN,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
  },
  bubbleLocationReceived: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
  },
  bubblePhotoSent: {
    padding: 4,
    backgroundColor: ACCENT_GREEN,
    borderBottomRightRadius: 4,
  },
  bubblePhotoReceived: {
    padding: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
  },
  bubbleVoice: {
    backgroundColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
    minWidth: 200,
    borderWidth: 0,
  },
  bubbleVoiceSent: {
    backgroundColor: ACCENT_GREEN,
    borderBottomRightRadius: 4,
    minWidth: 200,
    borderWidth: 0,
  },
  recalledText: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#94a3b8",
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 21,
  },
  bubbleTextSent: {
    color: "#ffffff",
  },
  bubbleTextReceived: {
    color: "#0f172a",
  },
  bubbleRowTranscript: {
    marginTop: -4,
  },
  bubbleConverted: {
    backgroundColor: "#e2e8f0",
    borderWidth: 0,
    paddingVertical: 8,
    maxWidth: "88%",
  },
  convertedTranscriptText: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#475569",
    lineHeight: 20,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  locationBubbleInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationBubbleText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  locationBubbleTextReceived: {
    color: "#0f172a",
  },
  bubbleVenue: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: ACCENT_GREEN,
    borderBottomRightRadius: 4,
    maxWidth: "88%",
    paddingVertical: 12,
  },
  venueBubbleInner: {
    gap: 6,
    minWidth: 220,
  },
  venueBubbleName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  venueBubbleArea: {
    fontSize: 13,
    fontWeight: "600",
    color: ACCENT_GREEN,
  },
  venueBubbleMeta: {
    fontSize: 14,
    color: "#0f172a",
    marginTop: 2,
  },
  venueBubbleAvailable: {
    fontSize: 13,
    color: "#64748b",
  },
  venueBookLink: {
    color: "#15803d",
    fontWeight: "700",
    fontSize: 15,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  voiceBubbleInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  voiceMessageLine: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    flexShrink: 1,
  },
  voiceMessageLineSent: {
    color: "#ffffff",
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  voicePlayBtnSent: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  voicePlayBtnReceived: {
    backgroundColor: "#cbd5e1",
  },
  voiceProgressTrack: {
    flex: 1,
    minWidth: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    overflow: "hidden",
  },
  voiceProgressTrackSent: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  voiceProgressFill: {
    height: "100%",
    backgroundColor: ACCENT_GREEN,
    borderRadius: 2,
  },
  voiceProgressFillSent: {
    backgroundColor: "#ffffff",
  },
  cancelZone: {
    width: "100%",
    height: 120,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#dc2626",
  },
  cancelZoneTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
  },
  cancelZoneSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 12,
    zIndex: 9999,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  iconBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#0f172a",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  sendPlaceholder: {
    width: 40,
    height: 40,
  },
  sendBtnPressed: {
    opacity: 0.9,
  },
  inputCenter: {
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  holdToTalkPill: {
    backgroundColor: ACCENT_GREEN,
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  holdToTalkText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  sheetOption: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
  },
  sheetOptionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  sheetOptionText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  sheetOptionDestructive: {
    color: "#dc2626",
  },
  sheetOptionPrimary: {
    color: "#2563eb",
  },
  sheetCancel: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  sheetCancelText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
  fullImageClose: {
    position: "absolute",
    top: 56,
    right: 20,
    padding: 8,
  },
});
