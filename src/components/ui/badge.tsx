import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  children,
  variant = "default",
  ...props
}) => {
  const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-brand-100 text-brand-800 border border-brand-200",
    secondary: "bg-slate-100 text-slate-700 border border-slate-200",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    destructive: "bg-red-100 text-red-800 border border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
