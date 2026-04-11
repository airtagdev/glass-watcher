// Service Worker for push notifications
self.addEventListener("push", (event) => {
  let data = { title: "Price Alert", body: "An alert was triggered!" };
  try {
    data = event.data.json();
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/placeholder.svg",
      badge: "/placeholder.svg",
      vibrate: [200, 100, 200],
      data: data.url || "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || "/")
  );
});
