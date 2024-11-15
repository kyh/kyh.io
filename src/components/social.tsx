import styles from "./social.module.css";

export const social = {
  github: "https://github.com/kyh",
  linkedin: "https://www.linkedin.com/in/kyh",
  dribbble: "https://dribbble.com/kaiyuhsu",
  twitter: "https://twitter.com/kaiyuhsu",
};

export const GithubLink = () => (
  <a
    className={styles.git}
    href={social.github}
    aria-label="GitHub"
    target="_blank"
    rel="noreferrer noopener"
  >
    <svg width="16" height="16" viewBox="0 0 32 32">
      <path d="M16.003,0C7.17,0,0.008,7.162,0.008,15.997  c0,7.067,4.582,13.063,10.94,15.179c0.8,0.146,1.052-0.328,1.052-0.752c0-0.38,0.008-1.442,0-2.777  c-4.449,0.967-5.371-2.107-5.371-2.107c-0.727-1.848-1.775-2.34-1.775-2.34c-1.452-0.992,0.109-0.973,0.109-0.973  c1.605,0.113,2.451,1.649,2.451,1.649c1.427,2.443,3.743,1.737,4.654,1.329c0.146-1.034,0.56-1.739,1.017-2.139  c-3.552-0.404-7.286-1.776-7.286-7.906c0-1.747,0.623-3.174,1.646-4.292C7.28,10.464,6.73,8.837,7.602,6.634  c0,0,1.343-0.43,4.398,1.641c1.276-0.355,2.645-0.532,4.005-0.538c1.359,0.006,2.727,0.183,4.005,0.538  c3.055-2.07,4.396-1.641,4.396-1.641c0.872,2.203,0.323,3.83,0.159,4.234c1.023,1.118,1.644,2.545,1.644,4.292  c0,6.146-3.74,7.498-7.304,7.893C19.479,23.548,20,24.508,20,26c0,2,0,3.902,0,4.428c0,0.428,0.258,0.901,1.07,0.746  C27.422,29.055,32,23.062,32,15.997C32,7.162,24.838,0,16.003,0z" />
    </svg>
  </a>
);

export const DribbbleLink = () => (
  <a
    className={styles.dribbble}
    href={social.dribbble}
    aria-label="Dribbble"
    target="_blank"
    rel="noreferrer noopener"
  >
    <svg width="16" height="16" viewBox="0 0 32 32">
      <path d="M0 16q0-4.352 2.144-8.032t5.824-5.824 8.032-2.144 8.032 2.144 5.824 5.824 2.144 8.032-2.144 8.032-5.824 5.824-8.032 2.144-8.032-2.144-5.824-5.824-2.144-8.032zM2.656 16q0 4.992 3.36 8.8 1.536-3.008 4.864-5.728t6.496-3.424q-0.48-1.12-0.928-2.016-5.504 1.76-11.904 1.76-1.248 0-1.856-0.032 0 0.128 0 0.32t-0.032 0.32zM3.072 12.704q0.704 0.064 2.080 0.064 5.344 0 10.144-1.44-2.432-4.32-5.344-7.2-2.528 1.28-4.32 3.552t-2.56 5.024zM7.84 26.528q3.616 2.816 8.16 2.816 2.368 0 4.704-0.896-0.64-5.472-2.496-10.592-2.944 0.64-5.92 3.232t-4.448 5.44zM12.736 3.104q2.816 2.912 5.216 7.264 4.352-1.824 6.56-4.64-3.712-3.072-8.512-3.072-1.632 0-3.264 0.448zM19.104 12.64q0.48 1.024 1.088 2.592 2.368-0.224 5.152-0.224 1.984 0 3.936 0.096-0.256-4.352-3.136-7.744-2.080 3.104-7.040 5.28zM20.992 17.472q1.632 4.736 2.208 9.728 2.528-1.632 4.128-4.192t1.92-5.536q-2.336-0.16-4.256-0.16-1.76 0-4 0.16z" />
    </svg>
  </a>
);

export const TwitterLink = () => (
  <a
    className={styles.twitter}
    href={social.twitter}
    aria-label="Twitter"
    target="_blank"
    rel="noreferrer noopener"
  >
    <svg width="16" height="16" viewBox="0 0 39 32">
      <path d="M0 28.384q0.96 0.096 1.92 0.096 5.632 0 10.048-3.456-2.624-0.032-4.704-1.6t-2.848-4q0.64 0.128 1.504 0.128 1.12 0 2.144-0.288-2.816-0.544-4.64-2.784t-1.856-5.12v-0.096q1.696 0.96 3.68 0.992-1.664-1.088-2.624-2.88t-0.992-3.84q0-2.176 1.12-4.064 3.008 3.744 7.36 5.952t9.28 2.496q-0.224-1.056-0.224-1.856 0-3.328 2.368-5.696t5.728-2.368q3.488 0 5.888 2.56 2.784-0.576 5.12-1.984-0.896 2.912-3.52 4.48 2.336-0.288 4.608-1.28-1.536 2.4-4 4.192v1.056q0 3.232-0.928 6.464t-2.88 6.208-4.64 5.28-6.432 3.68-8.096 1.344q-6.688 0-12.384-3.616z" />
    </svg>
  </a>
);

export const LinkedInLink = () => (
  <a
    className={styles.linkedin}
    href={social.linkedin}
    aria-label="LinkedIn"
    target="_blank"
    rel="noreferrer noopener"
  >
    <svg viewBox="0 0 17 17" width="16" height="16">
      <path d="M14.0142 0.965088H2.51824C1.92097 0.965088 1.34816 1.20235 0.925831 1.62468C0.503499 2.04702 0.266235 2.61982 0.266235 3.21709V14.7131C0.266235 15.3104 0.503499 15.8832 0.925831 16.3055C1.34816 16.7278 1.92097 16.9651 2.51824 16.9651H14.0142C14.6115 16.9651 15.1843 16.7278 15.6066 16.3055C16.029 15.8832 16.2662 15.3104 16.2662 14.7131V3.21709C16.2662 2.61982 16.029 2.04702 15.6066 1.62468C15.1843 1.20235 14.6115 0.965088 14.0142 0.965088ZM5.60024 13.7491C5.60024 13.7891 5.57324 13.8491 5.52024 13.9301C5.44024 13.9841 5.37924 14.0101 5.33924 14.0101H3.48924C3.44924 14.0101 3.38924 13.9841 3.30924 13.9301C3.25524 13.8501 3.22824 13.7901 3.22824 13.7491V7.25509C3.22824 7.21509 3.25524 7.15509 3.30824 7.07509C3.38824 7.02109 3.44824 6.99409 3.48924 6.99409H5.33924C5.37924 6.99409 5.43924 7.02109 5.51924 7.07409C5.57324 7.15409 5.60024 7.21409 5.60024 7.25509V13.7491ZM5.29924 5.88809C5.18426 6.00567 5.04642 6.09845 4.89421 6.16071C4.742 6.22297 4.57865 6.25339 4.41424 6.25009C4.06524 6.25009 3.77124 6.13009 3.52924 5.88809C3.41161 5.77315 3.31879 5.63532 3.25653 5.4831C3.19427 5.33088 3.16388 5.16751 3.16724 5.00309C3.16724 4.66809 3.28824 4.38009 3.52924 4.13909C3.64292 4.01844 3.78007 3.92231 3.93226 3.85661C4.08445 3.79091 4.24847 3.75701 4.41424 3.75701C4.58 3.75701 4.74402 3.79091 4.89621 3.85661C5.0484 3.92231 5.18555 4.01844 5.29924 4.13909C5.53924 4.37909 5.66024 4.66909 5.66024 5.00309C5.66024 5.35209 5.54024 5.64709 5.29924 5.88809ZM13.4612 13.7491C13.4609 13.7831 13.4537 13.8167 13.4399 13.8478C13.4262 13.879 13.4062 13.907 13.3812 13.9301C13.3581 13.955 13.3301 13.975 13.299 13.9888C13.2679 14.0025 13.2343 14.0098 13.2002 14.0101H11.3102C11.2702 14.0101 11.2102 13.9841 11.1302 13.9301C11.0762 13.8501 11.0492 13.7901 11.0492 13.7491V9.78909C11.0492 9.45309 10.9892 9.19209 10.8682 9.00409C10.7202 8.84409 10.4792 8.76409 10.1442 8.76409C9.71524 8.76409 9.40724 8.89009 9.21924 9.14509C9.04524 9.40009 8.95824 9.76209 8.95824 10.2311V13.7491C8.95792 13.7831 8.95066 13.8167 8.93691 13.8478C8.92315 13.879 8.90319 13.907 8.87824 13.9301C8.85498 13.9552 8.82683 13.9752 8.79553 13.989C8.76423 14.0027 8.73043 14.0099 8.69624 14.0101H6.84624C6.80624 14.0101 6.74623 13.9841 6.66623 13.9301C6.61224 13.8501 6.58624 13.7901 6.58624 13.7491V7.25509C6.58624 7.21509 6.61224 7.15509 6.66623 7.07509C6.74623 7.02109 6.80624 6.99409 6.84624 6.99409H8.63624C8.69024 6.99409 8.74323 7.00709 8.79624 7.03409C8.82423 7.04809 8.85124 7.09409 8.87724 7.17409V7.27509L8.89723 7.31509V7.47609C9.34023 7.04809 9.95024 6.83309 10.7272 6.83309C11.5982 6.83309 12.2682 7.04109 12.7372 7.45609C13.2202 7.89809 13.4612 8.53609 13.4612 9.36609V13.7491Z" />
    </svg>
  </a>
);

export const SocialLinks = ({ className = "" }: { className?: string }) => (
  <div className={`${styles.socials} ${className}`}>
    <GithubLink />
    <DribbbleLink />
    <TwitterLink />
    <LinkedInLink />
  </div>
);
