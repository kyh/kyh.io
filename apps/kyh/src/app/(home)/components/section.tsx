import { ScrambleText } from "@/components/animate-text";
import { HashIcon } from "@/components/icons";

export const SectionHeading = ({
  children,
  id,
}: {
  children: string;
  id?: string;
}) => (
  <div className="group -ml-5 flex items-center gap-2">
    {id && (
      <a
        href={`#${id}`}
        className="text-foreground-faded hover:text-foreground-highlighted -m-1 -translate-y-0.75 rounded-sm p-1 opacity-0 transition group-hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--bg-color)_50%,transparent)] focus-visible:opacity-100"
        aria-label={`Link to ${children} section`}
      >
        <HashIcon />
      </a>
    )}
    <ScrambleText
      id={id}
      as="h2"
      trigger="hover"
      className="text-foreground-highlighted scroll-mt-[120px] leading-none font-medium sm:scroll-mt-[100px]"
    >
      {children}
    </ScrambleText>
  </div>
);

type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
};

export const Section = ({
  children,
  className,
  id,
  delay = 0,
}: SectionProps) => {
  const scrollMarginClasses = id
    ? "scroll-mt-[120px] sm:scroll-mt-[100px]"
    : "";
  const combinedClasses = [
    "flex flex-col gap-4",
    scrollMarginClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="animate-section">
      <section
        id={id}
        className={combinedClasses}
        style={{ animationDelay: `${delay}s` }}
      >
        {children}
      </section>
    </div>
  );
};

export const Separator = () => (
  <div role="separator" className="bg-border h-px" />
);
