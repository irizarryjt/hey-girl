// Shareable guest link: we encode ONLY the public wedding details into the URL
// hash, so a guest who opens the link boots straight into a guest-only Hey Girl.
// No private data (budget, notes, guest list) ever touches the link.

const PUBLIC_KEYS = [
  'coupleNames', 'date', 'time', 'venueName', 'venueAddress',
  'dressCode', 'registryUrl', 'parking', 'hotelBlock', 'extraNotes',
]

function pickPublic(details = {}) {
  const out = {}
  for (const k of PUBLIC_KEYS) if (details[k]) out[k] = details[k]
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

export function buildGuestLink(details) {
  const payload = b64encode(JSON.stringify(pickPublic(details)))
  const base = `${location.origin}${location.pathname}`
  return `${base}?guest=1#w=${payload}`
}

// If the current URL is a guest link, return the decoded public details, else null.
export function getSharedDetails() {
  try {
    const params = new URLSearchParams(location.search)
    if (params.get('guest') !== '1') return null
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
    const w = hash.get('w')
    if (!w) return null
    const parsed = JSON.parse(b64decode(w))
    return pickPublic(parsed)
  } catch {
    return null
  }
}
