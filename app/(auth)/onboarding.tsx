import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type SlideConfig = {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
};

export default function OnboardingScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setActiveSlide(page);
  };

  const goToSlideTwo = () => {
    scrollRef.current?.scrollTo({ x: screenWidth, animated: true });
    setActiveSlide(1);
  };

  const slides: SlideConfig[] = [
    {
      id: 0,
      icon: "🏃",
      title: "Welcome to Green Room",
      subtitle: "Find players. Book courts. Play.",
      cta: "Get Started",
      onPress: goToSlideTwo,
    },
    {
      id: 1,
      icon: "👤",
      title: "Set Up Your Profile",
      subtitle: "Tell us your sport, skill level and location to start matching",
      cta: "Create Profile",
      onPress: () => router.push("/(auth)/create-profile" as never),
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.scrollContainer}
      >
        {slides.map((slide) => (
          <OnboardingSlide key={slide.id} slide={slide} screenWidth={screenWidth} />
        ))}
      </ScrollView>

      <View style={styles.dotRow}>
        {slides.map((slide) => (
          <Dot key={slide.id} active={activeSlide === slide.id} />
        ))}
      </View>
    </View>
  );
}

function OnboardingSlide({ slide, screenWidth }: { slide: SlideConfig; screenWidth: number }) {
  return (
    <LinearGradient
      colors={["#22c55e", "#16a34a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.slideGradient, { width: screenWidth }]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>{slide.icon}</Text>
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>

        <Pressable
          onPress={slide.onPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{slide.cta}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function Dot({ active }: { active: boolean }) {
  return <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#16a34a",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  slideGradient: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 80,
    gap: 20,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#14532d",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconText: {
    fontSize: 56,
  },
  title: {
    textAlign: "center",
    color: "#052e16",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    textAlign: "center",
    color: "#14532d",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 28,
    maxWidth: 320,
  },
  button: {
    marginTop: 6,
    minWidth: 220,
    borderRadius: 999,
    backgroundColor: "#15803d",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: "#14532d",
    shadowColor: "#14532d",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  dotRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 999,
  },
  dotActive: {
    width: 30,
    backgroundColor: "#14532d",
  },
  dotInactive: {
    width: 10,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
