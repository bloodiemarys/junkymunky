import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-green text-white shadow-sm hover:bg-brand-green-hover hover:shadow-md active:scale-[0.98]",
        gold:
          "bg-brand-gold text-brand-navy shadow-sm hover:bg-brand-gold-hover hover:shadow-md active:scale-[0.98]",
        navy:
          "bg-brand-navy text-white shadow-sm hover:bg-brand-navy-light hover:shadow-md active:scale-[0.98]",
        outline:
          "border-2 border-brand-green text-brand-green bg-transparent hover:bg-brand-green hover:text-white active:scale-[0.98]",
        "outline-navy":
          "border-2 border-brand-navy text-brand-navy bg-transparent hover:bg-brand-navy hover:text-white active:scale-[0.98]",
        "outline-white":
          "border-2 border-white/70 text-white bg-transparent hover:bg-white hover:text-brand-navy active:scale-[0.98]",
        secondary:
          "bg-brand-green-light text-brand-green hover:bg-[#C3E6CB] active:scale-[0.98]",
        ghost:
          "bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.98]",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98]",
        link: "bg-transparent text-brand-green underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm:      "h-9 rounded-lg px-4 text-xs",
        lg:      "h-12 rounded-xl px-8 text-base",
        xl:      "h-14 rounded-xl px-10 text-base",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
