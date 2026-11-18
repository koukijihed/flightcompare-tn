import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-navy-200 bg-navy-50 text-navy-700",
        success:
          "border-turquoise-200 bg-turquoise-50 text-turquoise-700",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        danger: "border-red-200 bg-red-50 text-red-700",
        sky: "border-sky-200 bg-sky-50 text-sky-700",
        outline: "border-navy-200 bg-white text-navy-600",
        demo: "border-dashed border-amber-300 bg-amber-50 text-amber-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

type AlertVariant = "info" | "warning" | "danger";

const alertStyles: Record<AlertVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const alertIcons = {
  info: Info,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = alertIcons[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        alertStyles[variant],
        className,
      )}
      role={variant === "danger" ? "alert" : "status"}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
      </div>
    </div>
  );
}
