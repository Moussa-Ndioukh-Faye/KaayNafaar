import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// Boutons « tampon » : bord encre, ombre nette décalée, enfoncés au clic
const pression =
  "border border-encre/85 dark:border-foreground/70 shadow-[2px_2px_0_0_#0a1f4a] dark:shadow-[2px_2px_0_0_rgb(0_0_0/0.6)] " +
  "hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_#0a1f4a] dark:hover:shadow-[3px_3px_0_0_rgb(0_0_0/0.6)] " +
  "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background " +
    "transition-[transform,box-shadow,background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:size-[1.15em] [&_svg]:shrink-0 motion-reduce:transform-none",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-primary/95 ${pression}`,
        destructive: `bg-destructive text-destructive-foreground ${pression}`,
        outline: `bg-card text-foreground hover:bg-secondary/40 ${pression}`,
        secondary: `bg-secondary text-secondary-foreground ${pression}`,
        ghost: "text-foreground hover:bg-foreground/[0.06]",
        link: "text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary",
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
