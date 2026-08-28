"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/Lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const isSm = size === "sm"
  const rootWidth = isSm ? 36 : 44
  const rootHeight = isSm ? 20 : 24
  const thumbSize = isSm ? 16 : 20

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      style={{
        width: `${rootWidth}px`,
        height: `${rootHeight}px`,
        minWidth: `${rootWidth}px`,
        minHeight: `${rootHeight}px`,
      }}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
        }}
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
          isSm
            ? "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
            : "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

