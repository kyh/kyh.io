import { AnimateSection } from "~/components/animate-text";
import { RoleNav } from "~/components/role-nav";
import { Counter, CountersContainer } from "~/components/counter";
import { getCurrentPageRole } from "~/lib/role";
import { Scene } from "~/components/scene";
import styles from "~/components/page.module.css";

export default function HomePage({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}) {
  const role = getCurrentPageRole(searchParams);

  return (
    <main className={`${styles.container} ${styles.relative}`}>
      <Scene currentStat={role.stat} />
      <header className={styles.header}>
        <AnimateSection as="h1" className={styles.title}>
          Kaiyu Hsu
        </AnimateSection>
        <AnimateSection delay={0.1}>
          <RoleNav currentRole={role.link.href} />
        </AnimateSection>
      </header>
      <CountersContainer>
        <Counter text={role.stat.value} />
        {role.stat.href ? (
          <a href={role.stat.href} target="_blank" rel="noopener noreferrer">
            {role.stat.label[0] === "+" ? "" : <>&nbsp;</>}
            {role.stat.label}
          </a>
        ) : (
          <span>
            {role.stat.label[0] === "+" ? "" : <>&nbsp;</>}
            {role.stat.label}
          </span>
        )}
      </CountersContainer>
    </main>
  );
}
