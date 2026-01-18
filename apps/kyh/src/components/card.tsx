type CardProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <article
      className={`overflow-hidden rounded-xl border border-[var(--dock-border-color)] bg-gradient-to-t from-[var(--dock-border-color)] to-[var(--dock-bg)] p-1 backdrop-blur-[10px] [&_*]:pointer-events-none [&_*]:rounded-lg [&_img]:h-full [&_img]:w-full ${className}`}
      {...props}
    >
      {children}
    </article>
  );
};
