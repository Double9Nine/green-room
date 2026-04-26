import { Text, View } from "react-native";

export default function MatchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">Match</Text>
      <Text className="mt-2 text-center text-slate-600">
        Swipe and connect with players at your level.
      </Text>
    </View>
  );
}
