import { Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">Profile</Text>
      <Text className="mt-2 text-center text-slate-600">
        Manage your sports, skill level, and preferences.
      </Text>
    </View>
  );
}
