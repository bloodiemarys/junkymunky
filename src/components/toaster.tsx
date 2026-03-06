"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-white text-zinc-900 border border-zinc-200 shadow-sm dark:bg-zinc-950 dark:text-zinc-50 dark:border-zinc-800",
        },
      }}
    />
  );
}

