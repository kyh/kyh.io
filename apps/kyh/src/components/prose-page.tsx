import { Fragment } from "react";

import NextLink from "next/link";

import { ScrambleText } from "@/components/animate-text";
import { ProseText } from "@/components/prose-text";
import { Section, SectionHeading, Separator, SubHeading } from "@/components/section";
import type { ContentLink, PageContent } from "@/lib/page-content";

const LinkRow = ({ link }: { link: ContentLink }) => {
  const isInternal = link.href.startsWith("/");
  const body = (
    <>
      <span className="text-foreground-highlighted">{link.label}</span>
      <span>
        <ProseText text={link.description} />
      </span>
    </>
  );

  if (isInternal) {
    return (
      <NextLink href={link.href} className="list-row list-row-plain">
        {body}
      </NextLink>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="list-row list-row-plain"
    >
      {body}
    </a>
  );
};

/** Paired with `renderPageMarkdown`, which renders the same content as markdown. */
export const ProsePage = ({ content }: { content: PageContent }) => (
  <div className="relative isolate min-h-screen px-6 pt-30 pb-64">
    <main className="relative z-10 mx-auto flex w-full flex-col gap-10 sm:w-[560px]">
      <Section id="intro" delay={0.1}>
        <ScrambleText
          as="h1"
          trigger="both"
          className="text-foreground-highlighted mb-3 text-lg leading-none font-medium"
        >
          {content.heading}
        </ScrambleText>
        {content.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-foreground">
            <ProseText text={paragraph} />
          </p>
        ))}
      </Section>

      {content.sections.map((section, sectionIndex) => (
        <Fragment key={section.id}>
          <Separator />
          <Section id={section.id} delay={0.3 + sectionIndex * 0.2}>
            <SectionHeading id={section.id}>{section.heading}</SectionHeading>
            {section.blocks.map((block, blockIndex) => {
              const key = `${section.id}-${blockIndex}`;

              if (block.kind === "subheading") {
                return <SubHeading key={key}>{block.text}</SubHeading>;
              }

              if (block.kind === "links") {
                return (
                  <div key={key} className="-mx-2 flex flex-col">
                    {block.items.map((item) => (
                      <LinkRow key={item.href} link={item} />
                    ))}
                  </div>
                );
              }

              return (
                <p key={key} className="text-foreground">
                  <ProseText text={block.text} />
                </p>
              );
            })}
          </Section>
        </Fragment>
      ))}
    </main>
  </div>
);
