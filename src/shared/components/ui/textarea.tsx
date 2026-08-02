import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-xl border border-input bg-white px-3.5 py-3 text-base text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground/75 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
