import { Text, View } from "react-native";

export default function ChatScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">Chat</Text>
      <Text className="mt-2 text-center text-slate-600">
        Message your matches and lock in a game.
      </Text>
    </View>
  );
}
