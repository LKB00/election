// Election's service worker: only for "Tell me the result" alerts (one per poll, asked for by the person).
// It shows the alert and opens the poll when tapped. It does not cache pages.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Election', {
      body: data.body || '',
      icon: '/icon',
      badge: '/icon',
      data: { url: data.url || '/' },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data && event.notification.data.url ? event.notification.data.url : '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url === url && 'focus' in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
