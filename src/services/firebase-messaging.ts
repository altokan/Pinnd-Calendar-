import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./firebase";

/* ---------------------------------- */
/* Firebase Messaging Init            */
/* ---------------------------------- */

let messaging: any = null;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch {
    messaging = null;
  }
}

/* ---------------------------------- */
/* VAPID KEY                          */
/* ---------------------------------- */

const VAPID_KEY =
  "BCGs7pE5hJY8x1tN2GJv_li3XqXTnAOOk6axHH-aes7EFz4LKzgmKPphYjJejjBx_NcM8S2wQW-SjRHB2ITN1cg";

/* ---------------------------------- */
/* Request Permission                 */
/* ---------------------------------- */

export async function requestPushPermission() {
  try {
    if (!messaging) return;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification denied");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    console.log("🔥 FCM TOKEN:", token);

    return token;
  } catch (error) {
    console.error("Push error:", error);
  }
}

/* ---------------------------------- */
/* Foreground Notifications           */
/* ---------------------------------- */

export function listenForegroundNotifications() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);

    new Notification(payload.notification?.title || "Pinned Calendar", {
      body: payload.notification?.body,
      icon: "/icon-192.png",
    });
  });
}
