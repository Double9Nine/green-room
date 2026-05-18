import type * as Location from "expo-location";

export type RegionGroup = "New York City" | "New Jersey";

export const REGIONS: RegionGroup[] = ["New York City", "New Jersey"];

export const AREAS_BY_REGION: Record<RegionGroup, string[]> = {
  "New York City": [
    "Manhattan",
    "Brooklyn",
    "Queens",
    "The Bronx",
    "Staten Island",
    "Long Island",
  ],
  "New Jersey": [
    "Jersey City",
    "Hoboken",
    "Newark",
    "Bayonne",
    "Union City",
    "Weehawken",
    "Edgewater",
    "Fort Lee",
  ],
};

export function formatAutoLabel(
  place: Location.LocationGeocodedAddress
): string {
  const neighborhood = place.district || place.subregion || "";
  const city = place.city || place.region || "";

  if (neighborhood && city && neighborhood !== city) {
    return `${neighborhood}, ${city}`;
  }

  return neighborhood || city || "";
}

export function mapPlaceToRegionArea(
  place: Location.LocationGeocodedAddress
): { region: RegionGroup; area: string } {
  const haystack = [
    place.name,
    place.district,
    place.subregion,
    place.city,
    place.region,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const area of AREAS_BY_REGION["New Jersey"]) {
    if (haystack.includes(area.toLowerCase())) {
      return { region: "New Jersey", area };
    }
  }

  for (const area of AREAS_BY_REGION["New York City"]) {
    const key = area.toLowerCase();
    if (haystack.includes(key) || (key === "the bronx" && haystack.includes("bronx"))) {
      return { region: "New York City", area };
    }
  }

  if (
    haystack.includes("new jersey") ||
    haystack.includes(", nj") ||
    haystack.endsWith(" nj")
  ) {
    return { region: "New Jersey", area: "Jersey City" };
  }

  return { region: "New York City", area: "Manhattan" };
}
