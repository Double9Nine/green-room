import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function LoginScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">Login</Text>
      <Text className="mt-2 text-center text-slate-600">
        Auth UI placeholder for Supabase email or OAuth login.
      </Text>
      <Link href="/(tabs)/explore" className="mt-6 rounded-full bg-emerald-600 px-6 py-3 text-white">
        Enter App
      </Link>
    </View>
  );
}
