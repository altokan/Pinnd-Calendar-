import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./firebase";

const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey:
        "BCGs7pE5hJY8x1tN2GJv_li3XqXTnAOOk6axHH-aes7EFz4LKzgmKPphYjJejjBx_NcM8S2wQW-SjRHB2ITN1cg",
    });

    console.log("FCM TOKEN:", token);

    return token;
  } catch (error) {
    console.error("FCM Error:", error);
  }
};

export const listenForegroundMessages = () => {
  onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);

    new Notification(
      payload.notification?.title || "Pinned Calendar",
      {
        body: payload.notification?.body,
        icon: "/icon-192.png",
      }
    );
  });
};
