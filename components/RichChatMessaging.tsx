import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { GroupChatMessage } from "../lib/groupChatStorage";

export const MAX_VOICE_SEC = 60;
export const CANCEL_DRAG_DY = -50;
export const HOLD_VIBRATE_PATTERN = [0, 30, 20, 30] as const;

const ACCENT_GREEN = "#15803d";

export type SheetAction = {
  key: "recall" | "delete" | "convert";
  label: string;
  tone: "destructive" | "primary" | "default";
};

export function formatVoiceDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function permissionAlert(kind: "camera" | "photos" | "microphone") {
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

export function getSheetActions(msg: GroupChatMessage): SheetAction[] {
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

export function getSentMessagePreview(
  msg: Omit<GroupChatMessage, "id" | "createdAt" | "time">
): string | null {
  if (!msg.sent) return null;
  if (msg.type === "text") return msg.text?.trim() || "Message";
  if (msg.type === "photo" || msg.type === "image") return "Photo";
  if (msg.type === "voice") return "Voice message";
  if (msg.type === "venue") return `📍 ${msg.venueName ?? "Venue"}`;
  if (msg.type === "location") return msg.locationLabel ?? "Location";
  return "Message";
}

export function VenueMessageBubble({ msg }: { msg: GroupChatMessage }) {
  const bookingUrl = msg.venueUrl ?? "https://www.google.com";

  return (
    <View style={richStyles.venueBubbleInner}>
      <Text style={richStyles.venueBubbleName}>{msg.venueName}</Text>
      {msg.venueArea ? (
        <Text style={richStyles.venueBubbleArea}>{msg.venueArea}</Text>
      ) : null}
      <Text style={richStyles.venueBubbleMeta}>
        {msg.venueCourts} | {msg.venuePrice} | {msg.venueRating}
      </Text>
      {msg.venueAvailable ? (
        <Text style={richStyles.venueBubbleAvailable}>{msg.venueAvailable}</Text>
      ) : null}
      <Pressable onPress={() => void Linking.openURL(bookingUrl)}>
        <Text style={richStyles.venueBookLink}>Book Now →</Text>
      </Pressable>
    </View>
  );
}

export function VoiceMessageBubble({
  msg,
  isSent,
}: {
  msg: GroupChatMessage;
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
    <View style={richStyles.voiceBubbleInner}>
      <Text
        style={[
          richStyles.voiceMessageLine,
          isSent && richStyles.voiceMessageLineSent,
        ]}
      >
        Voice message · {durationLabel}
      </Text>

      <Pressable
        onPress={() => void togglePlay()}
        style={[
          richStyles.voicePlayBtn,
          isSent ? richStyles.voicePlayBtnSent : richStyles.voicePlayBtnReceived,
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
          richStyles.voiceProgressTrack,
          isSent && richStyles.voiceProgressTrackSent,
        ]}
      >
        <View
          style={[
            richStyles.voiceProgressFill,
            isSent && richStyles.voiceProgressFillSent,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

export function renderRichBubbleContent(msg: GroupChatMessage) {
  if (msg.recalled) {
    return <Text style={richStyles.recalledText}>Message recalled</Text>;
  }

  const isSent = msg.sent;

  if ((msg.type === "photo" || msg.type === "image") && msg.imageUri) {
    return (
      <Image source={{ uri: msg.imageUri }} style={richStyles.photoThumb} />
    );
  }

  if (msg.type === "location" && msg.locationLabel) {
    return (
      <View style={richStyles.locationBubbleInner}>
        <Ionicons
          name="location"
          size={18}
          color={isSent ? "#ffffff" : ACCENT_GREEN}
        />
        <Text
          style={[
            richStyles.locationBubbleText,
            !isSent && richStyles.locationBubbleTextReceived,
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
      <Text style={richStyles.convertedTranscriptText}> {msg.text}</Text>
    );
  }

  return (
    <Text
      style={[
        richStyles.bubbleText,
        isSent ? richStyles.bubbleTextSent : richStyles.bubbleTextReceived,
      ]}
    >
      {msg.text}
    </Text>
  );
}

export const richStyles = StyleSheet.create({
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
  bubbleVenue: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: ACCENT_GREEN,
    borderBottomRightRadius: 4,
    maxWidth: "88%",
    paddingVertical: 12,
  },
  bubbleConverted: {
    backgroundColor: "#e2e8f0",
    borderWidth: 0,
    paddingVertical: 8,
    maxWidth: "88%",
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
