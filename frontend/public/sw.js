// Service Worker for Atmiya Dosa Hub POS & Kitchen KDS
const CACHE_NAME = 'atmiya-pos-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notification even when screen is locked or tab is closed
self.addEventListener('push', (event) => {
  let payload = {
    title: '🛎️ New Table Order Arrived!',
    body: 'A dining table has placed an order. Please start making it now!',
    tableNumber: 'Table',
    orderNumber: '',
    url: '/?tab=kitchen'
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
    vibrate: [400, 150, 400, 150, 500],
    tag: payload.tag || `order-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url || '/?tab=kitchen'
    },
    actions: [
      { action: 'open', title: 'Open Kitchen KDS' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Direct message from client to display notification in background
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_ORDER_NOTIFICATION') {
    const { title, body, tableNumber, orderNumber, tag, url } = event.data;
    const options = {
      body: body || `Table ${tableNumber} order has arrived! Please start making it.`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
      vibrate: [400, 150, 400, 150, 500],
      tag: tag || `order-${orderNumber || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: { url: url || '/?tab=kitchen' },
      actions: [
        { action: 'open', title: 'Open Kitchen KDS' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    self.registration.showNotification(title || `🛎️ Table ${tableNumber} Order Arrived!`, options);
  }
});

// Click listener to refocus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
