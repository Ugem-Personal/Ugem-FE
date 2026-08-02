import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs shadow-destructive/20 hover:bg-destructive/90",
        outline:
          "border border-input bg-background dark:bg-slate-900 text-foreground shadow-2xs hover:border-ring/45 hover:bg-accent dark:hover:bg-slate-800 hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent dark:hover:bg-slate-800 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:decoration-2",
        accent:
          "bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-xs shadow-cyan-600/25 hover:bg-cyan-700 dark:hover:bg-cyan-400",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
