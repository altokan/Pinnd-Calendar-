importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

/* ================= Firebase Config ================= */
/* استبدل القيم التالية بالقيم الحقيقية */

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

/* =================================================== */

const messaging = firebase.messaging();

/* ================= BACKGROUND PUSH ================= */

messaging.onBackgroundMessage(function (payload) {

  const title = payload.notification?.title || "Pinned Calendar";

  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: "/notifications"
    }
  };

  self.registration.showNotification(title, options);
});

/* ================= CLICK ACTION ================= */

self.addEventListener("notificationclick", function (event) {

  event.notification.close();

  const targetUrl = "/notifications";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function (clientList) {

      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];

        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
