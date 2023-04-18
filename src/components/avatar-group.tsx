"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import type { User } from "~/lib/use-user-channel";
import styles from "./avatar-group.module.css";
import { useState } from "react";

type AvatarGroupProps = {
  currentUserId: string;
  users: Record<string, User>;
};

export const AvatarGroup = ({ currentUserId, users }: AvatarGroupProps) => {
  const usersArr = Object.entries(users);
  const onlyMe = usersArr.length < 2;

  return (
    <ul className={`${styles.container} ${onlyMe ? styles.faded : ""}`}>
      <AnimatePresence mode="popLayout">
        {usersArr.map(([userId, userData], index) => {
          let label = userId === currentUserId ? "You" : `Visitor: ${userId}`;

          if (onlyMe) {
            label = "You're the only one here 🥺";
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
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring" }}
              layout
            >
              <Tooltip>
                <TooltipTrigger className={styles.avatarContent} />
                <TooltipContent
                  className={styles.avatarTooltipContent}
                  side="bottom"
                  align="end"
                  alignOffset={-16}
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
};
