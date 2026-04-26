# green-room

Green Room is a mobile-first sports matching app that helps users find nearby players with similar skill levels, connect through chat, and discover places to play.

---

## Features
- User onboarding
- Profile setup
- Match players by sport, skill level, and location
- Gamified matching experience with player cards
- Real-time chat between matched users
- Venue recommendations
- Direct booking links for recommended venues
- Secure payment redirect for court / facility reservations
- Dashboard with navigation:
  - Explore
  - Match
  - Chat
  - Profile

---

## User Flow
1. Onboarding  
2. Create Profile  
3. Enter Dashboard  
4. Start Matching  
5. Connect with Players  
6. Chat & Plan  
7. View Recommended Venues  
8. Book & Pay Through Venue Link  
9. Play

---

## Planning & Booking Flow
After users match and begin chatting, Green Room can recommend nearby venues based on:
- Selected sport
- User location
- Distance preference
- Venue rating
- Availability

Each venue card includes:
- Venue name
- Distance
- Price
- Rating
- Available times
- Book Now button

When users tap **Book Now**, they are redirected to the venue's official booking or payment page via in-app browser.

---

## Tech Stack

### Framework
- Expo (React Native)
- TypeScript

### UI
- NativeWind (Tailwind CSS for React Native)

### Navigation
- Expo Router (file-based routing)

### Backend
- Supabase (auth, database, real-time chat)

### Maps & Location
- react-native-maps
- Google Maps API

### Booking
- Expo WebBrowser (redirect to venue booking pages)

---

## Project Structure
```bash
green-room/
├── app/
│   ├── (auth)/
│   │   ├── onboarding.tsx
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── explore.tsx
│   │   ├── match.tsx
│   │   ├── chat.tsx
│   │   └── profile.tsx
│   └── _layout.tsx
├── components/
├── hooks/
├── lib/
│   └── supabase.ts
├── types/
├── assets/
├── package.json
└── README.md
```

---

## Publishing
- Target platform: iOS (iPhone)
- Distribution: Apple App Store via Expo EAS Build