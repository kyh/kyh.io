import type { NodeProps } from "reactflow";
import { memo, useCallback } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "vaul";

import { Card } from "@/components/card";
import styles from "./card-node.module.css";

export type CardNodeData = {
  backgroundImage?: string;
  backgroundBlurData?: string;
  backgroundVideo?: string;
  title?: string;
  description?: string;
  links?: { url: string; text: string }[];
  assets?: {
    type: "img" | "video";
    url: string;
    alt: string;
  }[];
};

export const CardNode = memo(({ id, data }: NodeProps<CardNodeData>) => {
  const router = useRouter();
  const urlId = useSearchParams().get("id");

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        router.push(`/projects?id=${id}`);
      } else {
        router.push("/projects");
      }
    },
    [id, router],
  );

  return (
    <Card>
      <span className={`${styles.handle} handle`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </span>
      <NextLink href={`/projects?id=${id}`}>
        {data.backgroundImage && (
          <Image
            className={styles.bgImage}
            src={data.backgroundImage}
            alt={data.title ?? "Card Image"}
            blurDataURL={data.backgroundBlurData}
            placeholder="blur"
            width="400"
            height="300"
          />
        )}
        {data.backgroundVideo && (
          <video autoPlay muted loop className={styles.bgVideo}>
            <source src={data.backgroundVideo} type="video/webm" />
            Unsupported.
          </video>
        )}
      </NextLink>
      <Drawer.Root
        shouldScaleBackground
        open={urlId === id}
        onOpenChange={onOpenChange}
      >
        <Drawer.Portal>
          <Drawer.Overlay className={styles.drawerOverlay} />
          <Drawer.Content className={styles.drawerContent}>
            <div className={styles.drawerContentScroll}>
              <div className={styles.drawerBar} />
              <div className={styles.drawerBody}>
                {data.title && <Drawer.Title>{data.title}</Drawer.Title>}
                {data.description && (
                  <Drawer.Description>{data.description}</Drawer.Description>
                )}
                {data.links && (
                  <div className={styles.drawerLinksContainer}>
                    {data.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        className={styles.drawerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.text}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                          <path d="m21 3-9 9" />
                          <path d="M15 3h6v6" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
                {data.assets && (
                  <ul className={styles.drawerAssetsContainer}>
                    {data.assets.map((asset) =>
                      asset.type === "img" ? (
                        <li key={asset.url}>
                          <Image
                            className={styles.drawerAsset}
                            src={asset.url}
                            alt={asset.alt}
                            width="400"
                            height="300"
                          />
                        </li>
                      ) : (
                        <li key={asset.url}>
                          <video className={styles.drawerAsset}>
                            <source src={asset.url} type="video/webm" />
                            Unsupported.
                          </video>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </Card>
  );
});

CardNode.displayName = "CardNode";
