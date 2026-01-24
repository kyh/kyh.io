import { ScrambleText } from "@/components/animate-text";
import { Logo } from "@/components/icons";
import { Link } from "@/components/link";
import { getPublicAssetUrl } from "@/lib/public-assets";
import { ConnectList } from "./_components/connect-list";
import { Section, SectionHeading, Separator } from "./_components/section";
import { ShapesCanvas } from "./_components/shapes-canvas";
import { SideQuests } from "./_components/side-quests";
import { TimeCounter } from "./_components/time-counter";
import { ViewAsMenu } from "./_components/view-as-menu";
import { WorkList } from "./_components/work-list";

const Page = () => {
  return (
    <div className="relative isolate min-h-screen px-6 pt-30 pb-64">
      <div className="relative z-10 mx-auto flex w-full flex-col gap-10 sm:w-[560px]">
        <header className="flex items-center justify-between gap-2 py-4">
          <div
            className="text-foreground-highlighted flex items-center"
            aria-label="Home"
          >
            <Logo />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <ViewAsMenu />
            <TimeCounter />
          </div>
        </header>

        <Section id="intro" delay={0.1}>
          <ScrambleText
            as="h1"
            trigger="both"
            className="text-foreground-highlighted mb-3 text-lg leading-none font-medium"
          >
            Kaiyu Hsu
          </ScrambleText>
          <p className="text-foreground">
            Hello world. You can call me Kai since we&apos;re pretty much
            friends now. I enjoy <Link href="/showcase">creating things</Link>{" "}
            for the internet. By day, I get to do that through investing,
            advising, and building products you may not have heard of, yet.
          </p>
          <p>Welcome to my corner of the web.</p>
        </Section>

        <Separator />

        <Section id="highlights" delay={0.3}>
          <SectionHeading id="highlights">Highlights</SectionHeading>
          <ul className="arrow-list">
            <li>Oversaw product growth from dozens to millions of users</li>
            <li>
              Published research on{" "}
              <Link
                href="https://www.ahajournals.org/doi/10.1161/circ.136.suppl_1.21029"
                src={getPublicAssetUrl("research.webp")}
              >
                growth and retention
              </Link>
            </li>
            <li>
              Led software development at various{" "}
              <Link
                href="https://amazon.com"
                src={getPublicAssetUrl("amazon.webp")}
              >
                large
              </Link>{" "}
              <Link
                href="https://grow.google/"
                src={getPublicAssetUrl("google.webp")}
              >
                organizations
              </Link>
            </li>
            <li>
              Helped build the frontend framework for the{" "}
              <Link
                href="https://techcrunch.com/2020/09/01/amazons-big-redesign-on-ios-to-reach-all-u-s-users-by-month-end/"
                src={getPublicAssetUrl("amazon-redesign.webp")}
              >
                worlds largest retailer
              </Link>
            </li>
            <li>
              Contributing member of{" "}
              <Link
                href="https://github.com/orgs/usdigitalresponse"
                src={getPublicAssetUrl("usdr.webp")}
              >
                USDR
              </Link>{" "}
              and the{" "}
              <Link
                href="https://github.com/orgs/nodejs"
                src={getPublicAssetUrl("nodejs.webp")}
              >
                OpenJS
              </Link>{" "}
              Foundation
            </li>
            <li>
              Took startups through{" "}
              <Link
                href="https://www.crunchbase.com/organization/cardiogram"
                src={getPublicAssetUrl("cardiogram.webp")}
              >
                acquisitions
              </Link>
              ,{" "}
              <Link
                href="https://retailtouchpoints.com/features/news-briefs/slyce-to-go-public-following-merger"
                src={getPublicAssetUrl("slyce.webp")}
              >
                IPOs
              </Link>
              , and several{" "}
              <Link
                href="https://techcrunch.com/2020/03/03/atrium-shuts-down/"
                src={getPublicAssetUrl("atrium.webp")}
              >
                failures
              </Link>
            </li>
          </ul>
        </Section>

        <Separator />

        <Section id="work" delay={0.5}>
          <SectionHeading id="work">Work Life</SectionHeading>
          <WorkList />
        </Section>

        <Separator />

        <Section id="side-quests" delay={0.7}>
          <SectionHeading id="side-quests">Side Quests</SectionHeading>
          <SideQuests />
        </Section>

        <Separator />

        <Section id="other-activities" delay={0.9}>
          <SectionHeading id="other-activities">
            Other Activities
          </SectionHeading>
          <p className="text-foreground mt-1">
            Beyond work, I love to learn about economics, psychology, and
            business. You&apos;ll occasionally find me dabbling in the open
            source world, drawing things, building apps, and designing games.
            But honestly, I spend most of my days procrastinating.
          </p>
        </Section>

        <Separator />

        <Section id="connect" delay={1.1}>
          <SectionHeading id="connect">Connect</SectionHeading>
          <ConnectList />
        </Section>
      </div>

      <div className="absolute right-0 bottom-0 left-0 z-0">
        <ShapesCanvas />
      </div>
    </div>
  );
};

export default Page;
