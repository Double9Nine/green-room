export type NearbyVenue = {
  name: string;
  area: string;
  courts: number;
  price: string;
  rating: string;
  available: string;
  bookUrl: string;
};

export type VenueSharePayload = {
  venueName: string;
  venueArea: string;
  venueCourts: number;
  venuePrice: string;
  venueRating: string;
  venueAvailable: string;
  venueUrl: string;
};

export function venueToSharePayload(venue: NearbyVenue): VenueSharePayload {
  return {
    venueName: venue.name,
    venueArea: venue.area,
    venueCourts: venue.courts,
    venuePrice: venue.price,
    venueRating: venue.rating,
    venueAvailable: venue.available,
    venueUrl: venue.bookUrl,
  };
}

const BOOK_URL = "https://www.google.com";

type VenueTemplate = Omit<NearbyVenue, "area">;

const TENNIS: VenueTemplate[] = [
  { name: "Central Park Tennis Center", courts: 26, price: "$15/hr", rating: "4.8 ⭐", available: "Today 3PM-8PM", bookUrl: BOOK_URL },
  { name: "Prospect Park Tennis", courts: 10, price: "$12/hr", rating: "4.6 ⭐", available: "Today 5PM-9PM", bookUrl: BOOK_URL },
  { name: "Hudson County Tennis", courts: 8, price: "$10/hr", rating: "4.5 ⭐", available: "Tomorrow 9AM-6PM", bookUrl: BOOK_URL },
  { name: "Hoboken Tennis Club", courts: 6, price: "$18/hr", rating: "4.7 ⭐", available: "Today 6PM-10PM", bookUrl: BOOK_URL },
  { name: "Riverside Tennis Courts", courts: 10, price: "$20/hr", rating: "4.9 ⭐", available: "Today 4PM-9PM", bookUrl: BOOK_URL },
  { name: "Queens Tennis Hub", courts: 12, price: "$14/hr", rating: "4.4 ⭐", available: "Tomorrow 10AM-4PM", bookUrl: BOOK_URL },
];

const BASKETBALL: VenueTemplate[] = [
  { name: "West 4th Street Courts", courts: 4, price: "Free", rating: "4.7 ⭐", available: "Today 4PM-9PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Bridge Park Courts", courts: 6, price: "Free", rating: "4.8 ⭐", available: "Today 5PM-10PM", bookUrl: BOOK_URL },
  { name: "Berry Park Basketball", courts: 2, price: "$8/hr", rating: "4.5 ⭐", available: "Tomorrow 9AM-1PM", bookUrl: BOOK_URL },
  { name: "Jersey City Rec Center", courts: 4, price: "$10/hr", rating: "4.6 ⭐", available: "Today 6PM-9PM", bookUrl: BOOK_URL },
  { name: "Hoboken Waterfront Courts", courts: 3, price: "$12/hr", rating: "4.7 ⭐", available: "Today 3PM-8PM", bookUrl: BOOK_URL },
];

const SOCCER: VenueTemplate[] = [
  { name: "Pier 40 Soccer Fields", courts: 2, price: "$45/hr", rating: "4.8 ⭐", available: "Today 5PM-9PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Bridge Park Fields", courts: 2, price: "$40/hr", rating: "4.7 ⭐", available: "Tomorrow 8AM-12PM", bookUrl: BOOK_URL },
  { name: "Randall's Island Soccer", courts: 4, price: "$50/hr", rating: "4.9 ⭐", available: "Today 4PM-8PM", bookUrl: BOOK_URL },
  { name: "Liberty State Park Fields", courts: 3, price: "$35/hr", rating: "4.6 ⭐", available: "Today 6PM-10PM", bookUrl: BOOK_URL },
  { name: "Red Bull Arena Training", courts: 2, price: "$55/hr", rating: "4.8 ⭐", available: "Tomorrow 2PM-6PM", bookUrl: BOOK_URL },
];

const VOLLEYBALL: VenueTemplate[] = [
  { name: "Chelsea Piers Volleyball", courts: 8, price: "$22/hr", rating: "4.8 ⭐", available: "Today 5PM-9PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Volleyball Center", courts: 6, price: "$18/hr", rating: "4.6 ⭐", available: "Today 7PM-10PM", bookUrl: BOOK_URL },
  { name: "Queens Volleyball Club", courts: 5, price: "$16/hr", rating: "4.5 ⭐", available: "Tomorrow 10AM-2PM", bookUrl: BOOK_URL },
  { name: "Jersey City Volleyball Hub", courts: 4, price: "$15/hr", rating: "4.7 ⭐", available: "Today 4PM-8PM", bookUrl: BOOK_URL },
  { name: "Hoboken Beach Volleyball", courts: 4, price: "$20/hr", rating: "4.9 ⭐", available: "Today 6PM-9PM", bookUrl: BOOK_URL },
];

const BADMINTON: VenueTemplate[] = [
  { name: "Manhattan Badminton Center", courts: 12, price: "$20/hr", rating: "4.7 ⭐", available: "Today 4PM-9PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Shuttle Club", courts: 8, price: "$18/hr", rating: "4.6 ⭐", available: "Today 6PM-10PM", bookUrl: BOOK_URL },
  { name: "Queens Badminton House", courts: 10, price: "$16/hr", rating: "4.5 ⭐", available: "Tomorrow 9AM-5PM", bookUrl: BOOK_URL },
  { name: "Jersey City Badminton", courts: 6, price: "$14/hr", rating: "4.4 ⭐", available: "Today 5PM-8PM", bookUrl: BOOK_URL },
];

const TABLE_TENNIS: VenueTemplate[] = [
  { name: "Spin NYC Table Tennis", courts: 16, price: "$25/hr", rating: "4.8 ⭐", available: "Today 5PM-10PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Ping Pong Club", courts: 10, price: "$18/hr", rating: "4.6 ⭐", available: "Today 4PM-9PM", bookUrl: BOOK_URL },
  { name: "Queens Table Tennis Center", courts: 12, price: "$16/hr", rating: "4.5 ⭐", available: "Tomorrow 11AM-4PM", bookUrl: BOOK_URL },
  { name: "Hoboken Paddle House", courts: 8, price: "$20/hr", rating: "4.7 ⭐", available: "Today 6PM-9PM", bookUrl: BOOK_URL },
];

const SQUASH: VenueTemplate[] = [
  { name: "Manhattan Squash Club", courts: 8, price: "$35/hr", rating: "4.8 ⭐", available: "Today 5PM-9PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Squash Center", courts: 6, price: "$30/hr", rating: "4.6 ⭐", available: "Tomorrow 8AM-12PM", bookUrl: BOOK_URL },
  { name: "Jersey City Squash", courts: 4, price: "$28/hr", rating: "4.7 ⭐", available: "Today 4PM-8PM", bookUrl: BOOK_URL },
  { name: "Hoboken Racquet Club", courts: 5, price: "$32/hr", rating: "4.9 ⭐", available: "Today 6PM-10PM", bookUrl: BOOK_URL },
];

const GOLF: VenueTemplate[] = [
  { name: "Chelsea Piers Golf Club", courts: 52, price: "$45/hr", rating: "4.8 ⭐", available: "Today 3PM-9PM", bookUrl: BOOK_URL },
  { name: "Randall's Island Driving Range", courts: 40, price: "$25/hr", rating: "4.6 ⭐", available: "Today 5PM-8PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Golf Center", courts: 30, price: "$30/hr", rating: "4.7 ⭐", available: "Tomorrow 9AM-5PM", bookUrl: BOOK_URL },
  { name: "Liberty National Practice", courts: 20, price: "$55/hr", rating: "4.9 ⭐", available: "Today 4PM-7PM", bookUrl: BOOK_URL },
];

const TEMPLATES_BY_SPORT: Record<string, VenueTemplate[]> = {
  tennis: TENNIS,
  basketball: BASKETBALL,
  soccer: SOCCER,
  volleyball: VOLLEYBALL,
  badminton: BADMINTON,
  table_tennis: TABLE_TENNIS,
  squash: SQUASH,
  golf: GOLF,
};

const AREA_PRESETS: Record<string, string[]> = {
  Manhattan: ["Manhattan", "Brooklyn", "Queens", "Jersey City", "Hoboken"],
  Brooklyn: ["Brooklyn", "Manhattan", "Queens", "Jersey City", "Hoboken"],
  Queens: ["Queens", "Brooklyn", "Manhattan", "Long Island", "Jersey City"],
  "The Bronx": ["The Bronx", "Manhattan", "Queens", "Brooklyn", "Jersey City"],
  "Staten Island": ["Staten Island", "Brooklyn", "Manhattan", "Jersey City"],
  "Long Island": ["Long Island", "Queens", "Brooklyn", "Manhattan"],
  "Jersey City": ["Jersey City", "Hoboken", "Manhattan", "Brooklyn", "Newark"],
  Hoboken: ["Hoboken", "Jersey City", "Manhattan", "Weehawken", "Brooklyn"],
  Newark: ["Newark", "Jersey City", "Hoboken", "Bayonne", "Manhattan"],
  Bayonne: ["Bayonne", "Jersey City", "Hoboken", "Newark"],
  "Union City": ["Union City", "Jersey City", "Hoboken", "Manhattan"],
  Weehawken: ["Weehawken", "Hoboken", "Jersey City", "Edgewater"],
  Edgewater: ["Edgewater", "Fort Lee", "Hoboken", "Jersey City"],
  "Fort Lee": ["Fort Lee", "Edgewater", "Manhattan", "Jersey City"],
};

export function getFacilityLabel(sportId: string): string {
  if (sportId === "soccer") return "Fields";
  if (sportId === "golf") return "Bays";
  if (sportId === "table_tennis") return "Tables";
  return "Courts";
}

export function getVenuesForSport(
  sportId: string,
  selectedArea: string
): NearbyVenue[] {
  const templates = TEMPLATES_BY_SPORT[sportId] ?? TENNIS;
  const areas = AREA_PRESETS[selectedArea] ?? [
    selectedArea,
    "Manhattan",
    "Brooklyn",
    "Jersey City",
    "Hoboken",
    "Queens",
  ];

  return templates.slice(0, 6).map((template, index) => ({
    ...template,
    area: areas[index % areas.length] ?? selectedArea,
  }));
}

export function formatVenueShareMessage(
  venue: NearbyVenue,
  sportId: string
): string {
  const facility = getFacilityLabel(sportId);
  return `📍 ${venue.name} - ${venue.area}\n${facility}: ${venue.courts} | ${venue.price} | ${venue.rating}\nAvailable: ${venue.available}\nBook: ${venue.bookUrl}`;
}
