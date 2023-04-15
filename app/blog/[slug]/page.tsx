import { notFound } from "next/navigation";
import { Mdx } from "components/mdx";
import { allBlogs } from "~/contentlayer/generated";
import { AnimateText } from "~/components/animate-text";
import styles from "~/components/page.module.css";

export async function generateStaticParams() {
  return allBlogs.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<any | undefined> {
  const post = allBlogs.find((post) => post.slug === params?.slug);
  if (!post) return;

  const {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
    slug,
  } = post;
  const ogImage = image
    ? `https://kyh.io${image}`
    : `https://kyh.io/api/og?title=${title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      url: `https://kyh.io/blog/${slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Blog({ params }: { params: { slug: string } }) {
  const post = allBlogs.find((post) => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <main className={styles.container}>
      <script type="application/ld+json">
        {JSON.stringify(post.structuredData)}
      </script>
      <header className={styles.header}>
        <AnimateText className={styles.title}>{post.title}</AnimateText>
        <div>{post.publishedAt}</div>
      </header>
      <Mdx code={post.body.code} />
    </main>
  );
}
