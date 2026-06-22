// Local (on-device) notifications via the PWA service worker. This is a
// front-end-only opt-in — no server push subscription. For true scheduled push
// when the app is closed, you'd add a push service + backend later.

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

// Ask the browser for permission. Returns true if granted.
export async function enableNotifications() {
  if (!notifySupported()) return { ok: false, reason: 'unsupported' }
  let perm = Notification.permission
  if (perm === 'default') {
    try {
      perm = await Notification.requestPermission()
    } catch {
      perm = Notification.permission
    }
  }
  return { ok: perm === 'granted', reason: perm }
}

export async function showNotification(title, body) {
  if (!notifySupported() || Notification.permission !== 'granted') return
  const opts = { body, icon: '/icon-192.png', badge: '/icon-192.png' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg && reg.showNotification) {
      reg.showNotification(title, opts)
      return
    }
  } catch {}
  try {
    new Notification(title, opts)
  } catch {}
}
