"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { User } from "~/lib/use-user-channel";
import styles from "./avatar-group.module.css";

type AvatarGroupProps = {
  currentUserId: string;
  users: Record<string, User>;
};

export const AvatarGroup = ({ currentUserId, users }: AvatarGroupProps) => {
  const usersArr = Object.entries(users);

  if (usersArr.length < 2) {
    return null;
  }

  return (
    <ul className={styles.container}>
      <AnimatePresence mode="popLayout">
        {usersArr.map(([userId, userData], index) => {
          const label = userId === currentUserId ? "You" : `User ${userId}`;
          return (
            <motion.li
              key={userId}
              title={label}
              className={styles.avatar}
              style={{
                zIndex: usersArr.length - index,
                background: `linear-gradient(${userData.hue}, ${userData.color})`,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring" }}
              layout
            >
              <span className="sr-only">{label}</span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
};
