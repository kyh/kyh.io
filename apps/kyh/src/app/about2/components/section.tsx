type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
};

export const Section = ({ children, className, id, delay = 0 }: SectionProps) => {
  const scrollMarginClasses = id
    ? "scroll-mt-[120px] sm:scroll-mt-[100px]"
    : "";
  const combinedClasses = ["flex flex-col gap-4", scrollMarginClasses, className]
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

export const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-foreground-highlighted leading-none font-medium">
    {children}
  </h2>
);
