"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import type { User } from "~/lib/use-user-channel";
import styles from "./avatar-group.module.css";

type AvatarGroupProps = {
  currentUserId: string;
  users: Record<string, User>;
};

export const AvatarGroup = ({ currentUserId, users }: AvatarGroupProps) => {
  const pathname = usePathname();
  const usersArr = Object.entries(users)
    .sort(([, userData]) => (userData.path === pathname ? -1 : 1))
    .sort(([userId]) => (userId === currentUserId ? -1 : 1));
  const onlyMe = usersArr.length < 2;

  return (
    <ul className={styles.container}>
      <AnimatePresence mode="popLayout">
        {usersArr.map(([userId, userData], index) => {
          const isMe = userId === currentUserId;
          const anotherPage = userData.path && userData.path !== pathname;

          let label = isMe ? "You" : "Visitor";
          if (onlyMe) {
            label = "You're the only one here 🥺";
          } else if (!isMe && anotherPage) {
            label += " (on another page)";
          }

          return (
            <motion.li
              key={userId}
              className={styles.avatar}
              style={{
                zIndex: usersArr.length - index,
                background: `linear-gradient(${userData.hue}, ${userData.color})`,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: anotherPage || onlyMe ? 0.2 : 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ ease: "easeOut", duration: 0.2 }}
              layout
            >
              <Popover>
                <PopoverTrigger className={styles.avatarContent} />
                <PopoverContent
                  className={styles.avatarPopoverContent}
                  side="bottom"
                  align="end"
                  alignOffset={-16}
                >
                  {label}
                </PopoverContent>
              </Popover>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
};
