import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => (
  <div className={`overflow-hidden rounded-sm border border-gray-700 px-4 py-3 ${className}`}>
    {children}
  </div>
);
