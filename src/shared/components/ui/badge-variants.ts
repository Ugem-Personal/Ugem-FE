import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-border bg-background dark:bg-slate-900 text-foreground",
        success:
          "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
        warning:
          "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
        info:
          "border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
