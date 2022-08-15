import Link from "next/link";
import { useRef } from "react";
import {
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import useRaf from "@rooks/use-raf";
import { ThemeToggle } from "@components/ThemeToggle";
import styles from "./Dock.module.css";

const iconAttrs = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as "round",
  strokeLinejoin: "round" as "round",
  ["aria-hidden"]: true,
};

const links = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg {...iconAttrs}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/about",
    label: "About",
    icon: (
      <svg {...iconAttrs}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg {...iconAttrs}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
];

export const Dock = () => {
  const mouseX = useMotionValue<null | number>(null);

  return (
    <nav className={styles.container}>
      <ul
        className={styles.list}
        onMouseMove={(event) => mouseX.set(event.nativeEvent.x)}
        onMouseLeave={() => mouseX.set(null)}
      >
        {links.map(({ href, label, icon }) => (
          <DockItem key={href} mouseX={mouseX}>
            <Link href={href}>
              <a className={styles.link} title={label}>
                <span className="sr-only">{label}</span>
                {icon}
              </a>
            </Link>
          </DockItem>
        ))}
        <DockItem mouseX={mouseX}>
          <ThemeToggle />
        </DockItem>
      </ul>
    </nav>
  );
};

const baseWidth = 48;
const distanceLimit = baseWidth * 2;
const beyondTheDistanceLimit = distanceLimit + 1;

const distanceInput = [
  -distanceLimit,
  -distanceLimit / 1.25,
  -distanceLimit / 2,
  0,
  distanceLimit / 2,
  distanceLimit / 1.25,
  distanceLimit,
];

const sizeOutput = [
  baseWidth,
  baseWidth * 1.1,
  baseWidth * 1.3,
  baseWidth * 1.5,
  baseWidth * 1.3,
  baseWidth * 1.1,
  baseWidth,
];

const DockItem = ({
  children,
  mouseX,
}: {
  children: React.ReactNode;
  mouseX: MotionValue;
}) => {
  const distance = useMotionValue(beyondTheDistanceLimit);
  const size = useSpring(useTransform(distance, distanceInput, sizeOutput), {
    damping: 25,
    stiffness: 250,
  });

  const ref = useRef<HTMLLIElement>(null);

  useRaf(() => {
    const el = ref.current;
    const mouseXVal = mouseX.get();
    if (el && mouseXVal !== null) {
      const rect = el.getBoundingClientRect();

      // get the x coordinate of the img DOMElement's center
      // the left x coordinate plus the half of the width
      const imgCenterX = rect.left + rect.width / 2;

      // difference between the x coordinate value of the mouse pointer
      // and the img center x coordinate value
      const distanceDelta = mouseXVal - imgCenterX;
      distance.set(distanceDelta);
      return;
    }

    distance.set(beyondTheDistanceLimit);
  }, true);

  return (
    <motion.li
      ref={ref}
      className={styles.item}
      style={{ width: size, height: size }}
    >
      {children}
    </motion.li>
  );
};
