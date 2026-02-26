import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

/* -------------------------------------------------- */
/* ✅ Firebase Web Push VAPID KEY                     */
/* -------------------------------------------------- */

const VAPID_KEY =
  "BCGs7pE5hJY8x1tN2GJv_li3XqXTnAOOk6axHH-aes7EFz4LKzgmKPphYjJejjBx_NcM8S2wQW-SjRHB2ITN1cg";

/* -------------------------------------------------- */
/* ✅ Request Notification Permission                 */
/* -------------------------------------------------- */

export async function requestPushPermission() {
  try {
    if (!messaging) {
      console.warn("Messaging not supported");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    console.log("🔥 FCM TOKEN:", token);

    return token;
  } catch (error) {
    console.error("Push permission error:", error);
  }
}

/* -------------------------------------------------- */
/* ✅ Listen For Foreground Notifications             */
/* -------------------------------------------------- */

export function listenForegroundNotifications() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log("Foreground Notification:", payload);

    if (Notification.permission === "granted") {
      new Notification(
        payload.notification?.title || "Pinned Calendar",
        {
          body: payload.notification?.body,
          icon: "/icon-192.png",
        }
      );
    }
  });
}
