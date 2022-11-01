import Link from "next/link";
import { motion } from "framer-motion";
import { data, useCurrentPageRole } from "@lib/role";
import styles from "./RoleNav.module.css";

const roles = Object.values(data).map((r) => r.link);

const spring = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

export const RoleNav = () => {
  const { link } = useCurrentPageRole();

  return (
    <ul className={styles.links}>
      {roles.map(({ href, label }) => {
        return (
          <li className={styles.linkContainer} key={href}>
            <Link href={href}>{label}</Link>
            {link.href === href && (
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
