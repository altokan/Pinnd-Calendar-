/* Firebase Messaging Service Worker */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDKmuJk62Q-cfSBUF9fzfWskx7Kq5yChHc",
  authDomain: "calender-new-app.firebaseapp.com",
  projectId: "calender-new-app",
  storageBucket: "calender-new-app.firebasestorage.app",
  messagingSenderId: "436086002651",
  appId: "1:436086002651:web:42a2d5c406634037d40dfe"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log("Background Message:", payload);

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png"
    }
  );
});
