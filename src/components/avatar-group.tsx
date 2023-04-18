import type { User } from "~/lib/use-user-channel";
import styles from "./avatar-group.module.css";

type AvatarGroupProps = {
  users: Record<string, User>;
};

export const AvatarGroup = ({ users }: AvatarGroupProps) => {
  return (
    <div className={styles.container}>
      {Object.entries(users).map(([userId, userData], idx) => {
        return (
          <div key={userId} className={styles.container}>
            <div
              key={userId}
              className={styles.avatar}
              style={{
                border: `1px solid ${userData.hue}`,
                background: userData.color,
                transform: `translateX(${
                  Math.abs(idx - (Object.keys(users).length - 1)) * -20
                }px)`,
              }}
            >
              <div
                style={{ background: userData.color }}
                className={styles.avatarContent}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
