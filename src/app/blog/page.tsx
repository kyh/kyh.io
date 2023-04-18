import { allBlogs } from "~/contentlayer/generated";
import styles from "~/components/page.module.css";
import { AnimateText } from "~/components/animate-text";
import { Link } from "~/components/link";

export const metadata = {
  title: "Blog",
  description: "My thoughts on product, software, design, and more.",
};

export default async function BlogPage() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <AnimateText className={styles.title}>Blog</AnimateText>
      </header>
      <section className={styles.grid}>
        {allBlogs
          .sort((a, b) =>
            new Date(a.publishedAt) > new Date(b.publishedAt) ? -1 : 1
          )
          .map((post) => (
            <div>
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                {post.title}
              </Link>
            </div>
          ))}
      </section>
    </main>
  );
}
