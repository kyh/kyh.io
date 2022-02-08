import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMediaQuery } from "@react-hook/media-query";
import styles from "@components/RoleNav.module.css";

const roles = [
  { href: "/", label: "UX Engineer" },
  { href: "/#eng", label: "Software Engineer" },
  { href: "/#design", label: "Designer" },
  { href: "/#ppl", label: "Manager" },
  { href: "/#ring", label: "Ring Bearer" },
];

const spring = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

export const RoleNav = () => {
  const router = useRouter();
  const matches = useMediaQuery("only screen and (max-width: 640px)");

  return (
    <nav className={styles.links}>
      {roles.map(({ href, label }, index) => {
        if (matches && index > 2) return null;
        return (
          <div className={styles.linkContainer} key={href}>
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
          </div>
        );
      })}
    </nav>
  );
};
