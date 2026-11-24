import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// Boutons à la manière d'iOS : pleins, arrondis continus, léger enfoncement au toucher
const pression = "active:scale-[0.97] motion-reduce:transform-none";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[0.9375rem] font-semibold ring-offset-background " +
    "transition-[transform,filter,background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:size-[1.15em] [&_svg]:shrink-0 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:brightness-110 ${pression}`,
        destructive: `bg-destructive text-destructive-foreground hover:brightness-110 ${pression}`,
        outline: `bg-card text-foreground border border-border shadow-sm hover:bg-muted ${pression}`,
        secondary: `bg-secondary text-secondary-foreground hover:brightness-[0.97] ${pression}`,
        ghost: "text-foreground hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
        link: "text-primary hover:underline underline-offset-4",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        lg: "h-12 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
