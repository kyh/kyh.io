import { theme } from "../../styles/tokens.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { fontSizes, fontWeights, spacing } from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { ScrambleText } from "@/components/animate-text";
import { Logo } from "@/components/icons";
import { Link } from "@/components/link";
import { getPublicAssetUrl } from "@/lib/public-assets";
import { ConnectList } from "./_components/connect-list";
import { Section, SectionHeading, Separator } from "./_components/section";
import { FigureCanvas } from "./_components/figure-canvas";
import { SideQuests } from "./_components/side-quests";
import { TimeCounter } from "./_components/time-counter";
import { ViewAsMenu } from "./_components/view-as-menu";
import { WorkList } from "./_components/work-list";

const styles = stylex.create({
  page: {
    position: "relative",
    isolation: "isolate",
    minHeight: "100vh",
    paddingInline: spacing[6],
    /* off Tailwind's named scale; matches what `pt-30` computed */
    paddingTop: `calc(${spacing.unit} * 30)`,
    paddingBottom: spacing[64],
  },
  column: {
    position: "relative",
    zIndex: 10,
    marginInline: "auto",
    display: "flex",
    width: { default: "100%", [mediaUp.sm]: "560px" },
    flexDirection: "column",
    gap: spacing[10],
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    paddingBlock: spacing[4],
  },
  home: { color: theme.foregroundHighlighted, display: "flex", alignItems: "center" },
  headerRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: spacing[1.5],
  },
  lede: {
    color: theme.foregroundHighlighted,
    marginBottom: spacing[3],
    fontSize: fontSizes.lg,
    lineHeight: 1,
    fontWeight: fontWeights.medium,
  },
  body: { color: theme.foreground },
  bodySpaced: { color: theme.foreground, marginTop: spacing[1] },
  footerLayer: { position: "absolute", right: 0, bottom: 0, left: 0, zIndex: 0 },
});

const Page = () => {
  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.column)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.home)} aria-label="Home">
            <Logo />
          </div>
          <div {...stylex.props(styles.headerRight)}>
            <ViewAsMenu />
            <TimeCounter />
          </div>
        </header>

        <Section id="intro" delay={0.1}>
          <ScrambleText as="h1" trigger="both" className={stylex.props(styles.lede).className}>
            Kaiyu Hsu
          </ScrambleText>
          <p {...stylex.props(styles.body)}>
            Hello world. You can call me Kai since we&apos;re pretty much friends now. I enjoy{" "}
            <Link href="/showcase">creating things</Link> for the internet. By day, I get to do that
            through investing, advising, and building products you may not have heard of, yet.
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
              <Link href="https://amazon.com" src={getPublicAssetUrl("amazon.webp")}>
                large
              </Link>{" "}
              <Link href="https://grow.google/" src={getPublicAssetUrl("google.webp")}>
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
              <Link href="https://github.com/orgs/nodejs" src={getPublicAssetUrl("nodejs.webp")}>
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
          <SectionHeading id="other-activities">Other Activities</SectionHeading>
          <p {...stylex.props(styles.bodySpaced)}>
            Beyond work, I love to learn about economics, psychology, and business. You&apos;ll
            occasionally find me dabbling in the open source world, drawing things, building apps,
            and designing games. But honestly, I spend most of my days procrastinating.
          </p>
        </Section>

        <Separator />

        <Section id="connect" delay={1.1}>
          <SectionHeading id="connect">Connect</SectionHeading>
          <ConnectList />
        </Section>
      </div>

      <div {...stylex.props(styles.footerLayer)}>
        <FigureCanvas />
      </div>
    </div>
  );
};

export default Page;
