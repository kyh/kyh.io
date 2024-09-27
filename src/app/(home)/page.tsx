import { AnimateSection } from "@/components/animate-text";
import { Link } from "@/components/link";
import { social } from "@/components/social";
import styles from "@/styles/page.module.css";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

const HomePage = () => {
  return (
    <main className={`${styles.container} ${styles.relative}`}>
      <Header />
      <AnimateSection as="p" delay={0.1}>
        Hello world. You can call me Kai since we&apos;re pretty much friends
        now. I enjoy <Link href="/showcase">creating things</Link> for the
        internet. By day, I get to do that through <Link>investing</Link>,{" "}
        <Link href="https://founding.kyh.io">advising</Link>, and{" "}
        <Link href={social.github}>building products</Link> you may not have
        heard of, yet. Welcome to my corner of the web.
      </AnimateSection>
      <Footer />
    </main>
  );
};

export default HomePage;
