const CACHE_NAME = "sentinel-v1-cache";
const STATIC_ASSETS = ["/", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).catch(() => caches.match("/"));
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Sentinel Alert",
    body: "New safety update available.",
    url: "/"
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title ?? payload.title,
        body: parsed.body ?? payload.body,
        url: parsed.url ?? payload.url
      };
    } catch {
      // Keep default payload when parsing fails.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      data: {
        url: payload.url
      },
      vibrate: [100, 70, 100]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((client) => "focus" in client);
      if (existing) {
        existing.focus();
        if ("navigate" in existing) {
          return existing.navigate(targetUrl);
        }
        return Promise.resolve();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
