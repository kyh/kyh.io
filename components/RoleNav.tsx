import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { data } from "@lib/role";
import styles from "./RoleNav.module.css";

const roles = Object.values(data).map((r) => r.link);

const spring = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

export const RoleNav = () => {
  const router = useRouter();

  return (
    <ul className={styles.links}>
      {roles.map(({ href, label }) => {
        return (
          <li className={styles.linkContainer} key={href}>
            <Link href={href}>
              <a>{label}</a>
            </Link>
            {router.asPath === href && (
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
