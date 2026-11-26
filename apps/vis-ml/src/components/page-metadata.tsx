import { useEffect } from "react";

const siteUrl = "https://vis-ml.kyh.io";

interface PageMetadataProps {
  title: string;
  description: string;
  path: string;
}

const setMetaContent = (selector: string, content: string) => {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
};

export const PageMetadata = ({ title, description, path }: PageMetadataProps) => {
  useEffect(() => {
    const canonicalUrl = new URL(path, siteUrl).toString();

    document.title = title;
    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute("href", canonicalUrl);
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
  }, [description, path, title]);

  return null;
};
