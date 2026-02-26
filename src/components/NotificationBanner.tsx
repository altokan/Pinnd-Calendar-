import { useEffect, useState } from "react";
import { requestPushPermission } from "../services/firebase-messaging";

export default function NotificationBanner() {
  const [visible, setVisible] = useState(false);

  /* ---------------------------------- */
  /* Check if banner should appear      */
  /* ---------------------------------- */

  useEffect(() => {
    const dismissed = localStorage.getItem("notifications-dismissed");
    const enabled = localStorage.getItem("notifications-enabled");

    // يظهر فقط إذا لم يتم القبول أو الإلغاء سابقاً
    if (!dismissed && enabled !== "true") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  /* ---------------------------------- */
  /* Enable Notifications               */
  /* ---------------------------------- */

  const enableNotifications = async () => {
    await requestPushPermission();

    localStorage.setItem("notifications-enabled", "true");
    localStorage.setItem("notifications-dismissed", "true");

    setVisible(false);
  };

  /* ---------------------------------- */
  /* Close Banner                       */
  /* ---------------------------------- */

  const closeBanner = () => {
    localStorage.setItem("notifications-dismissed", "true");
    setVisible(false);
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center px-4 pt-4">
      <div className="w-full max-w-4xl rounded-3xl shadow-xl backdrop-blur-lg bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 p-6 animate-slide-down">

        <div className="flex items-center justify-between gap-4">
          
          <div>
            <h2 className="text-lg font-semibold">
              Enable Notifications
            </h2>

            <p className="text-sm text-stone-600 dark:text-stone-400">
              Stay updated with new events, reminders and admin messages.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={closeBanner}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700"
            >
              Later
            </button>

            <button
              onClick={enableNotifications}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Enable
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
