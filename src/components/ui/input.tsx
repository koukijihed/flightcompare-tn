import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-11 w-full rounded-xl border border-navy-200 bg-white px-3.5 text-sm text-navy-900 shadow-xs transition placeholder:text-navy-400 hover:border-navy-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-navy-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-navy-200 bg-white ps-3.5 pe-9 text-sm text-navy-900 shadow-xs transition hover:border-navy-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-navy-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
    />
  </div>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-semibold tracking-wide text-navy-600 uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {children}
    </p>
  );
}
