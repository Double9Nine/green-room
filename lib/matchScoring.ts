import { SKILL_LEVELS } from '@/constants/skillLevels'

const MATCH_LEVEL_SPORT_IDS = ['tennis', 'badminton', 'pickleball', 'golf']

// Haversine distance in miles
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Bidirectional overlap score
function bidirectionalOverlap(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 1
  if (setA.length === 0 || setB.length === 0) return 0.5
  const overlap = setA.filter(a => setB.includes(a)).length
  if (overlap === 0) return 0
  const aScore = overlap / setA.length
  const bScore = overlap / setB.length
  return (aScore + bScore) / 2
}

// Get valid skill levels based on preference
export function getValidSkillLevels(
  sportId: string,
  userSkillLevel: string,
  preference: string
): string[] | null {
  // Only apply for sports with level preference
  if (!MATCH_LEVEL_SPORT_IDS.includes(sportId)) return null
  if (!preference || preference.includes('Any')) return null

  const levels = SKILL_LEVELS[sportId]
  if (!levels) return null

  const userIndex = levels.findIndex(l => l === userSkillLevel)
  if (userIndex === -1) return null

  if (preference.includes('Same')) {
    return [levels[userIndex]]
  }

  if (preference.includes('±1') || preference.includes('+/-1') || preference.includes('+-1')) {
    const valid: string[] = []
    if (userIndex > 0) valid.push(levels[userIndex - 1])
    valid.push(levels[userIndex])
    if (userIndex < levels.length - 1) valid.push(levels[userIndex + 1])
    return valid
  }

  return null
}

export type MatchFilters = {
  sport: string
  skillLevelPreference: string
  userSkillLevel: string
  availability: string[]
  genderPreference: string[]
  purpose: string[]
  userTags: string[]
  userLat: number | null
  userLng: number | null
  maxDistance: number
}

export type CandidateProfile = {
  id: string
  name: string
  age?: number
  location: string
  sport: string
  skill_level: string
  availability: string[]
  purpose: string
  tags: string[]
  photo_url: string | null
  games_played: number
  gender?: string
  lat?: number
  lng?: number
}

export type ScoredPlayer = {
  id: string
  name: string
  age: number
  location: string
  skill: string
  availability: string
  purpose: string
  tags: string[]
  photo: string | null
  gamesPlayed: number
  matchScore: number
  matchReasons: string[]
}

export function scoreCandidate(
  candidate: CandidateProfile,
  filters: MatchFilters
): { score: number; reasons: string[] } | null {

  // Hard filter: skill level (only for tennis/badminton/pickleball/golf)
  if (MATCH_LEVEL_SPORT_IDS.includes(filters.sport)) {
    const validLevels = getValidSkillLevels(
      filters.sport,
      filters.userSkillLevel,
      filters.skillLevelPreference
    )
    if (validLevels && !validLevels.includes(candidate.skill_level)) return null
  }

  // Hard filter: distance
  let distScore = 15
  if (filters.userLat && filters.userLng && candidate.lat && candidate.lng) {
    const dist = haversineDistance(
      filters.userLat, filters.userLng,
      candidate.lat, candidate.lng
    )
    if (dist > filters.maxDistance) return null
    distScore = Math.round(25 * (1 - dist / filters.maxDistance))
  }

  let score = 0
  const reasons: string[] = []

  // 1. Availability (30%) - bidirectional
  const availOverlap = bidirectionalOverlap(
    filters.availability,
    candidate.availability ?? []
  )
  const availScore = Math.round(availOverlap * 30)
  score += availScore
  if (availOverlap > 0.6) reasons.push('🕐 Schedule match')

  // 2. Purpose (25%) - exact match
  const purposeMatch = filters.purpose.length > 0 &&
    filters.purpose.some(p =>
      (candidate.purpose ?? '').toLowerCase().includes(p.toLowerCase()) ||
      p.toLowerCase().includes((candidate.purpose ?? '').toLowerCase())
    )
  if (purposeMatch) {
    score += 25
    reasons.push('💪 Same goal')
  }

  // 3. Distance (25%)
  score += distScore
  if (distScore > 18) reasons.push('📍 Nearby')

  // 4. Tags (10%) - bidirectional
  const tagOverlap = bidirectionalOverlap(
    filters.userTags,
    candidate.tags ?? []
  )
  score += Math.round(tagOverlap * 10)
  if (tagOverlap > 0.4) reasons.push('✨ Same vibe')

  // 5. Games played (10%)
  const gamesPlayed = candidate.games_played ?? 0
  const gamesScore = Math.min(10, 5 + gamesPlayed * 0.5)
  score += Math.round(gamesScore)

  // Profile completeness bonus
  if (candidate.photo_url) score += 3
  if (candidate.purpose) score += 2
  if (candidate.tags?.length > 0) score += 2

  // Add skill level reason
  if (MATCH_LEVEL_SPORT_IDS.includes(filters.sport)) {
    reasons.push('🎯 Same level')
  }

  return { score, reasons: reasons.slice(0, 3) }
}
