import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg shadow-secondary/20 active:scale-95 transition-all",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-9 px-3 rounded-lg",
        lg: "h-14 px-10 text-base",
        icon: "h-12 w-12",
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
