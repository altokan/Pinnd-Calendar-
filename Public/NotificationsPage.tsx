import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function NotificationsPage() {

  const [visible, setVisible] = useState(true);

  /* اختفاء بعد 15 ثانية */
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="max-w-xl mx-auto mt-10">

      <div className="card-modern p-6 relative">

        <button
          onClick={() => setVisible(false)}
          className="absolute right-4 top-4"
        >
          <X size={18}/>
        </button>

        <h2 className="text-xl font-bold mb-2">
          Notifications
        </h2>

        <p className="text-sm text-stone-500">
          You opened this page from a push notification.
        </p>

      </div>

    </div>
  );
}
