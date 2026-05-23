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

const BADMINTON: VenueTemplate[] = [
  { name: "Manhattan Badminton Center", courts: 12, price: "$20/hr", rating: "4.7 ⭐", available: "Today 4PM-9PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Shuttle Club", courts: 8, price: "$18/hr", rating: "4.6 ⭐", available: "Today 6PM-10PM", bookUrl: BOOK_URL },
  { name: "Queens Badminton House", courts: 10, price: "$16/hr", rating: "4.5 ⭐", available: "Tomorrow 9AM-5PM", bookUrl: BOOK_URL },
  { name: "Jersey City Badminton", courts: 6, price: "$14/hr", rating: "4.4 ⭐", available: "Today 5PM-8PM", bookUrl: BOOK_URL },
];

const PICKLEBALL: VenueTemplate[] = [
  { name: "Brooklyn Pickleball Club", courts: 8, price: "$22/hr", rating: "4.8 ⭐", available: "Today 5PM-9PM", bookUrl: BOOK_URL },
  { name: "Jersey City Pickle Courts", courts: 6, price: "$18/hr", rating: "4.6 ⭐", available: "Today 4PM-8PM", bookUrl: BOOK_URL },
  { name: "Queens Paddle House", courts: 10, price: "$16/hr", rating: "4.5 ⭐", available: "Tomorrow 10AM-2PM", bookUrl: BOOK_URL },
  { name: "Hoboken Pickle Hub", courts: 4, price: "$20/hr", rating: "4.7 ⭐", available: "Today 6PM-9PM", bookUrl: BOOK_URL },
];

const BOULDERING: VenueTemplate[] = [
  { name: "Brooklyn Boulders Gowanus", courts: 40, price: "$32/day", rating: "4.8 ⭐", available: "Today 10AM-10PM", bookUrl: BOOK_URL },
  { name: "Central Rock Manhattan", courts: 35, price: "$35/day", rating: "4.7 ⭐", available: "Today 12PM-9PM", bookUrl: BOOK_URL },
  { name: "Gravity Vault Hoboken", courts: 28, price: "$30/day", rating: "4.6 ⭐", available: "Tomorrow 9AM-8PM", bookUrl: BOOK_URL },
  { name: "The Cliffs LIC", courts: 32, price: "$34/day", rating: "4.9 ⭐", available: "Today 11AM-9PM", bookUrl: BOOK_URL },
];

const GOLF: VenueTemplate[] = [
  { name: "Chelsea Piers Golf Club", courts: 52, price: "$45/hr", rating: "4.8 ⭐", available: "Today 3PM-9PM", bookUrl: BOOK_URL },
  { name: "Randall's Island Driving Range", courts: 40, price: "$25/hr", rating: "4.6 ⭐", available: "Today 5PM-8PM", bookUrl: BOOK_URL },
  { name: "Brooklyn Golf Center", courts: 30, price: "$30/hr", rating: "4.7 ⭐", available: "Tomorrow 9AM-5PM", bookUrl: BOOK_URL },
  { name: "Liberty National Practice", courts: 20, price: "$55/hr", rating: "4.9 ⭐", available: "Today 4PM-7PM", bookUrl: BOOK_URL },
];

const RUNNING: VenueTemplate[] = [
  { name: "Central Park Loop Meetup", courts: 1, price: "Free", rating: "4.8 ⭐", available: "Today 6AM-8AM", bookUrl: BOOK_URL },
  { name: "Brooklyn Bridge Run Club", courts: 1, price: "Free", rating: "4.7 ⭐", available: "Today 7PM-8PM", bookUrl: BOOK_URL },
  { name: "Hudson River Greenway", courts: 1, price: "Free", rating: "4.9 ⭐", available: "Tomorrow 7AM-9AM", bookUrl: BOOK_URL },
  { name: "Jersey City Waterfront Path", courts: 1, price: "Free", rating: "4.6 ⭐", available: "Today 5:30PM-7PM", bookUrl: BOOK_URL },
];

const TEMPLATES_BY_SPORT: Record<string, VenueTemplate[]> = {
  tennis: TENNIS,
  badminton: BADMINTON,
  pickleball: PICKLEBALL,
  bouldering: BOULDERING,
  golf: GOLF,
  running: RUNNING,
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
  if (sportId === "golf") return "Bays";
  if (sportId === "bouldering") return "Walls";
  if (sportId === "running") return "Routes";
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
