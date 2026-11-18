import type * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LinkButtonProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & { className?: string };

/** Locale-aware link styled like a button. */
export function LinkButton({ href, variant, size, className, ...props }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
