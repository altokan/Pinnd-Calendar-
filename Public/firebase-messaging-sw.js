importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

/* ================= PUSH RECEIVED ================= */

messaging.onBackgroundMessage(function(payload) {

  const title = payload.notification.title;

  const options = {
    body: payload.notification.body,
    icon: "/icon-192.png",
    data: {
      url: "/notifications"
    }
  };

  self.registration.showNotification(title, options);
});

/* ================= CLICK ACTION ================= */

self.addEventListener("notificationclick", function(event) {

  event.notification.close();

  event.waitUntil(
    clients.openWindow("/notifications")
  );

});
