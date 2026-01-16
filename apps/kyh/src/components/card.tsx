type CardProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <article
      className={`overflow-hidden p-1 rounded-xl border border-[var(--dock-border-color)] backdrop-blur-[10px] bg-gradient-to-t from-[var(--dock-border-color)] to-[var(--dock-bg)] [&_*]:pointer-events-none [&_*]:rounded-lg [&_img]:w-full [&_img]:h-full ${className}`}
      {...props}
    >
      {children}
    </article>
  );
};
