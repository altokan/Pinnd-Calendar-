import React, { useEffect, useState } from "react";
import { db } from "../services/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "firebase/firestore";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function NotificationsPage() {

  const [notifications, setNotifications] = useState<any[]>([]);

  /* ================= FETCH ================= */

  useEffect(() => {

    const q = query(
      collection(db, "admin_notifications"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      setNotifications(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsub();

  }, []);

  /* ================= AUTO CLOSE ================= */

  const closeNotification = async (id: string) => {

    await updateDoc(
      doc(db, "admin_notifications", id),
      { viewed: true }
    );

  };

  /* ================= AUTO HIDE 15s ================= */

  useEffect(() => {

    const timer = setTimeout(() => {
      notifications.forEach(n => {
        if (!n.viewed) closeNotification(n.id);
      });
    }, 15000);

    return () => clearTimeout(timer);

  }, [notifications]);

  /* ================= UI ================= */

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">

      <h2 className="text-2xl font-bold">
        Notifications
      </h2>

      <AnimatePresence>

        {notifications.map(n => (

          !n.viewed && (

            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative card-modern p-6"
            >

              {/* CLOSE BUTTON */}
              <button
                onClick={() => closeNotification(n.id)}
                className="absolute top-3 right-3"
              >
                <X size={18} />
              </button>

              <h3 className="font-bold text-lg">
                {n.title}
              </h3>

              <p className="text-stone-600 mt-2">
                {n.body}
              </p>

            </motion.div>

          )

        ))}

      </AnimatePresence>

    </div>
  );
}
