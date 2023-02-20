"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { roleData } from "~/lib/role";
import styles from "./role-nav.module.css";

const roles = Object.values(roleData).map((r) => r.link);

const spring = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

type RoleNavProps = {
  currentRole: string;
};

export const RoleNav = ({ currentRole }: RoleNavProps) => {
  return (
    <ul className={styles.links}>
      {roles.map(({ href, label }) => {
        return (
          <li className={styles.linkContainer} key={href}>
            <Link href={href}>{label}</Link>
            {currentRole === href && (
              <motion.div
                layoutId="underline"
                className={styles.underline}
                initial={false}
                transition={spring}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};
