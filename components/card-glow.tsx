"use client";

export const CardGlow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const onMouseMove = ({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent) => {
    Array.from(currentTarget.children).forEach((child) => {
      const { left, top } = child.getBoundingClientRect();
      const x = clientX - left;
      const y = clientY - top;
      (child as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
      (child as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
    });
  };

  return (
    <section className={className} onMouseMove={onMouseMove}>
      {children}
    </section>
  );
};
