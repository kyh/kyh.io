import type { ReactNode } from "react";
import { cn } from "cn";

export interface FieldProps {
  className: string;
  id: string;
  name: string;
  placeholder?: string;
  type: "text";
}

interface Props {
  label: string;
  name: string;
  className?: string;
  placeholder?: string;
  children?: (fieldProps: FieldProps) => ReactNode;
}

export const FormField = ({ label, name, className = "", placeholder, children }: Props) => {
  const fieldProps: FieldProps = {
    className:
      "block w-full border-0 p-0 text-emerald-500 placeholder-slate-500 bg-transparent focus:ring-0",
    id: name,
    name,
    placeholder,
    type: "text",
  };

  return (
    <div
      className={cn(
        "relative rounded-md border border-slate-600 px-3 py-2 focus-within:z-10 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600",
        className,
      )}
    >
      <label htmlFor={name} className="block cursor-text pb-1 text-sm font-medium text-slate-50">
        {label}
      </label>
      {children ? children(fieldProps) : <input {...fieldProps} />}
    </div>
  );
};
