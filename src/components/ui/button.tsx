import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
  {
    variants: {
      variant: {
        default:
          "bg-navy-900 text-white shadow-sm hover:bg-navy-800 active:bg-navy-950",
        accent:
          "bg-sky-500 text-white shadow-sm hover:bg-sky-600 active:bg-sky-700",
        turquoise:
          "bg-turquoise-500 text-white shadow-sm hover:bg-turquoise-600 active:bg-turquoise-700",
        outline:
          "border border-navy-200 bg-white text-navy-900 hover:border-navy-300 hover:bg-navy-50",
        ghost: "text-navy-700 hover:bg-navy-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
        subtle: "bg-navy-100 text-navy-900 hover:bg-navy-200",
        link: "text-sky-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
