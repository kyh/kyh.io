import { cloneElement } from "react";

type Props = {
  label: string;
  name: string;
  className?: string;
  placeholder?: string;
  children?: any;
};

export const FormField = ({
  label,
  name,
  className = "",
  placeholder,
  children,
}: Props) => {
  const fieldProps = {
    id: name,
    type: "text",
    className:
      "block w-full border-0 p-0 text-emerald-500 placeholder-slate-500 bg-transparent focus:ring-0",
    name,
    placeholder,
  };

  const field = children ? (
    cloneElement(children, fieldProps)
  ) : (
    <input {...fieldProps} />
  );

  return (
    <div
      className={`relative rounded-md border border-slate-600 px-3 py-2 focus-within:z-10 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 ${className}`}
    >
      <label
        htmlFor={name}
        className="block cursor-text pb-1 text-sm font-medium text-slate-50"
      >
        {label}
      </label>
      {field}
    </div>
  );
};
