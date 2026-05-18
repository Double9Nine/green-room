type AudioFileMeta = {
  uri: string;
  type: string;
  name: string;
};

function getAudioFileMeta(uri: string): AudioFileMeta {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".caf")) {
    return { uri, type: "audio/x-caf", name: "voice.caf" };
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".m4a")) {
    return { uri, type: "audio/m4a", name: "voice.m4a" };
  }
  if (lower.endsWith(".3gp")) {
    return { uri, type: "audio/3gpp", name: "voice.3gp" };
  }
  return { uri, type: "audio/m4a", name: "voice.m4a" };
}

export async function convertVoiceToText(audioUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_OPENAI_API_KEY");
  }

  const file = getAudioFileMeta(audioUri);
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as unknown as Blob);
  formData.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim();
  if (!text) {
    throw new Error("Empty transcription");
  }

  return text;
}
