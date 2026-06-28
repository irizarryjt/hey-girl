// Shareable guest link: we encode ONLY the public wedding details into the URL
// hash, so a guest who opens the link boots straight into a guest-only Hey Girl.
// No private data (budget, notes, guest list) ever touches the link.

const PUBLIC_KEYS = [
  'coupleNames', 'date', 'time', 'venueName', 'venueAddress',
  'dressCode', 'parking', 'hotelBlock', 'extraNotes',
]

// Curate what a guest may see — registry + size only when the couple opted in.
// Mirrors the server's publicGuestPayload for the local (no-Supabase) fallback.
function curatePublic(details = {}, approxSize) {
  const out = {}
  for (const k of PUBLIC_KEYS) if (details[k]) out[k] = details[k]
  const hasRegistry = details.hasRegistry !== false
  out.hasRegistry = hasRegistry
  if (hasRegistry) {
    out.registries = (Array.isArray(details.registries) ? details.registries : [])
      .filter((r) => r && r.url)
      .map((r) => ({ name: r.name || '', url: r.url }))
    if (details.allowStickToRegistryInquiry) out.stickToRegistry = !!details.stickToRegistry
  } else {
    out.registryMessage = details.registryMessage || ''
  }
  if (details.allowSizeInquiry && typeof approxSize === 'number') out.approxSize = approxSize
  return out
}

// Unicode-safe base64
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64decode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(s)))
}

// Preferred (Supabase) link: an opaque share token. The guest's browser fetches
// the public details from the server, so nothing private is ever in the URL.
export function buildGuestLink(token) {
  const base = `${location.origin}/`
  return `${base}?guest=1&w=${encodeURIComponent(token)}`
}

// Local-only fallback (no Supabase): encode the curated public details into the URL hash.
export function buildLocalGuestLink(details, approxSize) {
  const payload = b64encode(JSON.stringify(curatePublic(details, approxSize)))
  return `${location.origin}/?guest=1#w=${payload}`
}

// Read a share TOKEN from a guest link (?guest=1&w=token). Returns null if absent.
export function getSharedToken() {
  try {
    const params = new URLSearchParams(location.search)
    if (params.get('guest') !== '1') return null
    return params.get('w') || null
  } catch {
    return null
  }
}

// Legacy: decode public details embedded in the URL hash (local fallback links).
export function getSharedDetails() {
  try {
    const params = new URLSearchParams(location.search)
    if (params.get('guest') !== '1') return null
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
    const w = hash.get('w')
    if (!w) return null
    // Already curated at encode time — return as-is (no private data is ever encoded).
    const parsed = JSON.parse(b64decode(w))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
