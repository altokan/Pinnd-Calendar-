import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

const VAPID_KEY =
  "BCGs7pE5hJY8x1tN2GJv_li3XqXTnAOOk6axHH-aes7EFz4LKzgmKPphYjJejjBx_NcM8S2wQW-SjRHB2ITN1cg";

export async function requestPushPermission() {
  if (!messaging) return;

  const permission = await Notification.requestPermission();

  if (permission !== "granted") return;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
  });

  console.log("🔥 FCM TOKEN:", token);
}

export function listenForegroundNotifications() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    new Notification(payload.notification?.title || "Pinned Calendar", {
      body: payload.notification?.body,
      icon: "/icon-192.png",
    });
  });
}
