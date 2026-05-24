import AsyncStorage from "@react-native-async-storage/async-storage";

import { getCurrentUser as loadCurrentUserProfile } from "./getCurrentUser";

export type MemberStatus = "none" | "pending" | "confirmed" | "rejected";

export type EventRequest = {
  eventId: number;
  userId: string;
  userName: string;
  userInitial: string;
  status: MemberStatus;
  requestedAt: number;
};

export const EVENT_REQUESTS_KEY = "eventRequests";
export const EVENT_MEMBERS_KEY = "eventMembers";
export const PENDING_REQUESTS_KEY = "pendingRequests";
export const CURRENT_USER_ID = "currentUser";

export type EventRequestsByEvent = Record<string, EventRequest[]>;

export async function getCurrentUser(): Promise<{
  name: string;
  initial: string;
  userId: string;
}> {
  const user = await loadCurrentUserProfile();
  return {
    ...user,
    userId: CURRENT_USER_ID,
  };
}

export async function loadEventRequests(): Promise<EventRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as EventRequest[]) : [];
  } catch {
    return [];
  }
}

export async function saveEventRequests(requests: EventRequest[]): Promise<void> {
  await AsyncStorage.setItem(EVENT_REQUESTS_KEY, JSON.stringify(requests));
}

export async function loadPendingRequests(): Promise<EventRequestsByEvent> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as EventRequestsByEvent) : {};
  } catch {
    return {};
  }
}

export async function savePendingRequests(
  map: EventRequestsByEvent
): Promise<void> {
  await AsyncStorage.setItem(PENDING_REQUESTS_KEY, JSON.stringify(map));
}

export async function loadEventMembers(): Promise<EventRequestsByEvent> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_MEMBERS_KEY);
    return raw ? (JSON.parse(raw) as EventRequestsByEvent) : {};
  } catch {
    return {};
  }
}

export async function saveEventMembers(
  map: EventRequestsByEvent
): Promise<void> {
  await AsyncStorage.setItem(EVENT_MEMBERS_KEY, JSON.stringify(map));
}

export async function getMyStatusForEvent(
  eventId: number
): Promise<MemberStatus> {
  const requests = await loadEventRequests();
  return getMyStatusFromList(requests, eventId);
}

export function getMyStatusFromList(
  requests: EventRequest[],
  eventId: number
): MemberStatus {
  const mine = requests.find(
    (r) => r.eventId === eventId && r.userId === CURRENT_USER_ID
  );
  return mine?.status ?? "none";
}

export async function submitJoinRequest(
  eventId: number,
  user: { name: string; initial: string; userId: string }
): Promise<void> {
  const request: EventRequest = {
    eventId,
    userId: user.userId,
    userName: user.name,
    userInitial: user.initial,
    status: "pending",
    requestedAt: Date.now(),
  };

  const requests = await loadEventRequests();
  const without = requests.filter(
    (r) => !(r.eventId === eventId && r.userId === user.userId)
  );
  await saveEventRequests([...without, request]);

  const pending = await loadPendingRequests();
  const key = String(eventId);
  const list = pending[key] ?? [];
  const pendingWithout = list.filter((r) => r.userId !== user.userId);
  await savePendingRequests({
    ...pending,
    [key]: [...pendingWithout, request],
  });
}

export async function cancelJoinRequest(eventId: number): Promise<void> {
  const requests = await loadEventRequests();
  await saveEventRequests(
    requests.filter(
      (r) => !(r.eventId === eventId && r.userId === CURRENT_USER_ID)
    )
  );

  const pending = await loadPendingRequests();
  const key = String(eventId);
  await savePendingRequests({
    ...pending,
    [key]: (pending[key] ?? []).filter((r) => r.userId !== CURRENT_USER_ID),
  });
}

export async function approveJoinRequest(
  eventId: number,
  userId: string
): Promise<void> {
  const confirmed: EventRequest = {
    eventId,
    userId,
    userName: "",
    userInitial: "",
    status: "confirmed",
    requestedAt: Date.now(),
  };

  const pending = await loadPendingRequests();
  const key = String(eventId);
  const pendingList = pending[key] ?? [];
  const target = pendingList.find((r) => r.userId === userId);
  if (target) {
    confirmed.userName = target.userName;
    confirmed.userInitial = target.userInitial;
    confirmed.requestedAt = target.requestedAt;
  }

  await savePendingRequests({
    ...pending,
    [key]: pendingList.filter((r) => r.userId !== userId),
  });

  const members = await loadEventMembers();
  const memberList = members[key] ?? [];
  if (!memberList.some((m) => m.userId === userId)) {
    await saveEventMembers({
      ...members,
      [key]: [...memberList, confirmed],
    });
  }

  const requests = await loadEventRequests();
  const updated = requests.map((r) =>
    r.eventId === eventId && r.userId === userId
      ? { ...r, status: "confirmed" as MemberStatus }
      : r
  );
  if (!updated.some((r) => r.eventId === eventId && r.userId === userId)) {
    updated.push(confirmed);
  }
  await saveEventRequests(updated);
}

export async function declineJoinRequest(
  eventId: number,
  userId: string
): Promise<void> {
  const pending = await loadPendingRequests();
  const key = String(eventId);
  await savePendingRequests({
    ...pending,
    [key]: (pending[key] ?? []).filter((r) => r.userId !== userId),
  });

  const requests = await loadEventRequests();
  await saveEventRequests(
    requests.map((r) =>
      r.eventId === eventId && r.userId === userId
        ? { ...r, status: "rejected" as MemberStatus }
        : r
    )
  );
}

export async function leaveEvent(eventId: number): Promise<void> {
  const members = await loadEventMembers();
  const key = String(eventId);
  await saveEventMembers({
    ...members,
    [key]: (members[key] ?? []).filter((r) => r.userId !== CURRENT_USER_ID),
  });

  const requests = await loadEventRequests();
  await saveEventRequests(
    requests.filter(
      (r) => !(r.eventId === eventId && r.userId === CURRENT_USER_ID)
    )
  );
}

export async function removeEventMember(
  eventId: number,
  userId: string
): Promise<void> {
  const members = await loadEventMembers();
  const key = String(eventId);
  await saveEventMembers({
    ...members,
    [key]: (members[key] ?? []).filter((r) => r.userId !== userId),
  });

  const requests = await loadEventRequests();
  await saveEventRequests(
    requests.filter((r) => !(r.eventId === eventId && r.userId === userId))
  );
}

export function getPendingForEvent(
  map: EventRequestsByEvent,
  eventId: number
): EventRequest[] {
  return map[String(eventId)] ?? [];
}

export function getConfirmedForEvent(
  map: EventRequestsByEvent,
  eventId: number
): EventRequest[] {
  return map[String(eventId)] ?? [];
}

/** Organizer + approved members from AsyncStorage (no demo fillers). */
export function buildConfirmedMembersList(
  event: { organizer: string; user: string },
  membersMap: EventRequestsByEvent,
  eventId: number
): EventDisplayMember[] {
  const organizerName = event.organizer || event.user;
  const approved = getConfirmedForEvent(membersMap, eventId);
  return [
    {
      name: organizerName,
      isOrganizer: true,
      skill: skillForMember(organizerName),
    },
    ...approved.map((r) => ({
      name: r.userName,
      isOrganizer: false,
      skill: skillForMember(r.userName),
    })),
  ];
}

export function countOccupiedSpots(
  confirmedCount: number,
  includeOrganizer = true
): number {
  return includeOrganizer ? 1 + confirmedCount : confirmedCount;
}

/** Real spots (organizer + approved). Discover cards marked full use listed spots until someone joins. */
export function getOccupiedForCapacity(
  event: {
    spots?: number;
    maxSpots: number;
    createdByMe?: boolean;
  },
  confirmed: EventRequest[]
): number {
  const realOccupied = countOccupiedSpots(confirmed.length, true);
  if (confirmed.length > 0) {
    return realOccupied;
  }
  const listed = event.spots ?? 0;
  const max = event.maxSpots;
  if (!event.createdByMe && max > 0 && listed >= max) {
    return max;
  }
  return realOccupied;
}

export function isEventAtCapacity(
  event: {
    spots?: number;
    maxSpots: number;
    createdByMe?: boolean;
  },
  confirmed: EventRequest[]
): boolean {
  const max = event.maxSpots;
  if (max <= 0) return false;
  return getOccupiedForCapacity(event, confirmed) >= max;
}

export type EventDisplayMember = {
  name: string;
  isOrganizer: boolean;
  skill: string;
};

const MEMBER_FILLERS: { name: string; skill: string }[] = [
  { name: "Alex M.", skill: "3.0 Intermediate" },
  { name: "Jessica K.", skill: "4.0 Advanced" },
  { name: "Mike R.", skill: "2.5 Beginner+" },
  { name: "Chris L.", skill: "3.5 Intermediate" },
  { name: "Dana P.", skill: "4.0 Advanced" },
  { name: "Emma T.", skill: "3.0 Intermediate" },
  { name: "Ryan B.", skill: "3.5 Intermediate" },
  { name: "Lisa H.", skill: "4.0 Advanced" },
  { name: "Jordan W.", skill: "2.5 Beginner+" },
  { name: "Kim S.", skill: "3.0 Intermediate" },
  { name: "Pat N.", skill: "3.5 Intermediate" },
  { name: "Sam D.", skill: "4.0 Advanced" },
];

const FILLER_SKILL_BY_NAME: Record<string, string> = Object.fromEntries(
  MEMBER_FILLERS.map((m) => [m.name, m.skill])
);

function skillForMember(name: string): string {
  return FILLER_SKILL_BY_NAME[name] ?? "3.0 Intermediate";
}

/** Build member list and spots count so UI always shows the same number. */
export function resolveEventSpotsAndMembers(
  event: {
    organizer: string;
    user: string;
    spots: number;
    maxSpots: number;
  },
  confirmed: EventRequest[],
  isDummySeed: boolean
): { spotsTaken: number; members: EventDisplayMember[] } {
  const organizerName = event.organizer || event.user;
  const usedNames = new Set<string>([organizerName]);

  const organizer: EventDisplayMember = {
    name: organizerName,
    isOrganizer: true,
    skill: skillForMember(organizerName),
  };

  const fromStorage: EventDisplayMember[] = confirmed.map((r) => {
    usedNames.add(r.userName);
    return {
      name: r.userName,
      isOrganizer: false,
      skill: skillForMember(r.userName),
    };
  });

  const members: EventDisplayMember[] = [organizer, ...fromStorage];

  let targetCount: number;
  if (confirmed.length > 0) {
    targetCount = members.length;
  } else if (isDummySeed) {
    targetCount = Math.min(Math.max(1, event.spots), event.maxSpots);
  } else {
    targetCount = members.length;
  }

  const fillersNeeded = Math.max(0, targetCount - members.length);
  if (fillersNeeded > 0) {
    for (const filler of MEMBER_FILLERS) {
      if (members.length >= targetCount) break;
      if (usedNames.has(filler.name)) continue;
      usedNames.add(filler.name);
      members.push({
        name: filler.name,
        isOrganizer: false,
        skill: filler.skill,
      });
    }
  }

  const capped = members.slice(0, event.maxSpots);
  return { spotsTaken: capped.length, members: capped };
}

export function formatRequestAgo(requestedAt: number): string {
  const mins = Math.floor((Date.now() - requestedAt) / 60000);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

export type GroupChatMessage = {
  id: string;
  name: string;
  initial: string;
  text: string;
};

const GROUP_CHAT_SNIPPETS: Record<string, string> = {
  "Alex M.":
    "Perfect! I'll bring extra equipment. What's the skill level we're targeting?",
  "Jessica K.": "Count me in! Should I bring anything specific?",
  "Mike R.": "Great location choice! See everyone there 👍",
  "Chris L.": "Running a few minutes late — save me a spot!",
  "Dana P.": "Thanks for organizing! Really excited for this one.",
  "Emma T.": "First time joining this group — any tips for the courts?",
  "Ryan B.": "Weather looks perfect. See you all soon!",
  "Lisa H.": "I'll be there 10 min early to warm up.",
  "Jordan W.": "Can someone share the exact meeting point?",
  "Kim S.": "Just confirmed — looking forward to it!",
  "Pat N.": "Happy to help with setup if needed.",
  "Sam D.": "Great turnout! This is going to be fun.",
};

const ORGANIZER_CHAT_DEFAULT =
  "Looking forward to playing with everyone! See you at the event.";

function memberInitial(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** One preview message per member — same roster as the member list. */
export function buildGroupChatMessages(
  members: EventDisplayMember[]
): GroupChatMessage[] {
  return members.map((member, index) => ({
    id: `${member.name.replace(/\s+/g, "-").toLowerCase()}-${index}`,
    name: member.name,
    initial: memberInitial(member.name),
    text: member.isOrganizer
      ? ORGANIZER_CHAT_DEFAULT
      : (GROUP_CHAT_SNIPPETS[member.name] ?? "Can't wait — see you at the event!"),
  }));
}

const DEMO_SEED_STORAGE_KEY = "demoEventSeedVersion";
const DEMO_SEED_VERSION = 1;

/** Open this Discover event to test group chat as a confirmed member. */
export const DEMO_CHAT_TEST_EVENT_ID = 2;

type DemoMemberDef = {
  userId: string;
  userName: string;
  userInitial: string;
};

const DEMO_CONFIRMED_BY_EVENT: Record<number, DemoMemberDef[]> = {
  2: [
    { userId: "demo-alex-m", userName: "Alex M.", userInitial: "A" },
    { userId: "demo-jessica-k", userName: "Jessica K.", userInitial: "J" },
  ],
  3: [{ userId: "demo-mike-r", userName: "Mike R.", userInitial: "M" }],
  5: [
    { userId: "demo-chris-l", userName: "Chris L.", userInitial: "C" },
    { userId: "demo-dana-p", userName: "Dana P.", userInitial: "D" },
    { userId: "demo-emma-t", userName: "Emma T.", userInitial: "E" },
    { userId: "demo-ryan-b", userName: "Ryan B.", userInitial: "R" },
    { userId: "demo-lisa-h", userName: "Lisa H.", userInitial: "L" },
  ],
};

const DEMO_PENDING_FOR_HOST: DemoMemberDef[] = [
  { userId: "demo-pending-taylor", userName: "Taylor B.", userInitial: "T" },
  { userId: "demo-pending-jordan", userName: "Jordan W.", userInitial: "J" },
];

function confirmedRequest(
  eventId: number,
  def: DemoMemberDef,
  requestedAt: number
): EventRequest {
  return {
    eventId,
    userId: def.userId,
    userName: def.userName,
    userInitial: def.userInitial,
    status: "confirmed",
    requestedAt,
  };
}

function pendingRequest(
  eventId: number,
  def: DemoMemberDef,
  requestedAt: number
): EventRequest {
  return {
    eventId,
    userId: def.userId,
    userName: def.userName,
    userInitial: def.userInitial,
    status: "pending",
    requestedAt,
  };
}

function upsertRequest(
  requests: EventRequest[],
  next: EventRequest
): EventRequest[] {
  const without = requests.filter(
    (r) => !(r.eventId === next.eventId && r.userId === next.userId)
  );
  return [...without, next];
}

function mergeDemoMembers(
  existing: EventRequest[],
  defs: DemoMemberDef[],
  eventId: number
): EventRequest[] {
  const demoIds = new Set(defs.map((d) => d.userId));
  const kept = existing.filter((m) => !demoIds.has(m.userId));
  const now = Date.now();
  const seeded = defs.map((def, i) =>
    confirmedRequest(eventId, def, now - (defs.length - i) * 3600000)
  );
  return [...kept, ...seeded];
}

const DEMO_PENDING_SEEDED_KEY = "demoPendingSeededEventIds";

async function loadDemoPendingSeededIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_PENDING_SEEDED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

async function markDemoPendingSeeded(eventId: number): Promise<void> {
  const ids = await loadDemoPendingSeededIds();
  if (ids.includes(eventId)) return;
  await AsyncStorage.setItem(
    DEMO_PENDING_SEEDED_KEY,
    JSON.stringify([...ids, eventId])
  );
}

/** Demo pending requests once per new event (create flow only). */
export async function seedDemoPendingForEvent(eventId: number): Promise<void> {
  const seededIds = await loadDemoPendingSeededIds();
  if (seededIds.includes(eventId)) return;

  const pending = await loadPendingRequests();
  const key = String(eventId);
  if ((pending[key] ?? []).some((r) => r.userId.startsWith("demo-pending"))) {
    await markDemoPendingSeeded(eventId);
    return;
  }

  let requests = await loadEventRequests();
  const now = Date.now();
  const pendingReqs = DEMO_PENDING_FOR_HOST.map((def, i) =>
    pendingRequest(
      eventId,
      def,
      now - (DEMO_PENDING_FOR_HOST.length - i) * 600000
    )
  );
  for (const req of pendingReqs) {
    requests = upsertRequest(requests, req);
  }
  await savePendingRequests({ ...pending, [key]: pendingReqs });
  await saveEventRequests(requests);
  await markDemoPendingSeeded(eventId);
}

/**
 * Seeds approved members (and sample pending requests) once so counts,
 * member list, and group chat stay in sync with the request system.
 */
export async function ensureDemoEventSeed(): Promise<void> {
  const stored = await AsyncStorage.getItem(DEMO_SEED_STORAGE_KEY);
  const needsMemberSeed = stored !== String(DEMO_SEED_VERSION);

  if (!needsMemberSeed) {
    return;
  }

  let members = await loadEventMembers();
  let requests = await loadEventRequests();
  let pending = await loadPendingRequests();

  for (const [eventIdStr, defs] of Object.entries(DEMO_CONFIRMED_BY_EVENT)) {
    const eventId = Number(eventIdStr);
    const key = String(eventId);
    members[key] = mergeDemoMembers(members[key] ?? [], defs, eventId);
    for (const def of defs) {
      const req = confirmedRequest(
        eventId,
        def,
        Date.now() - 2 * 3600000
      );
      requests = upsertRequest(requests, req);
    }
  }

  await saveEventMembers(members);
  await saveEventRequests(requests);
  await savePendingRequests(pending);
  await AsyncStorage.setItem(DEMO_SEED_STORAGE_KEY, String(DEMO_SEED_VERSION));
}
