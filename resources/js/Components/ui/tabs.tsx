"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/Lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list flex w-full items-center justify-between rounded-xl p-1.5 text-content-muted transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-surface border border-border/90 neu-pressed gap-1.5 shadow-inner",
        line: "gap-2 bg-surface/50 border-b-2 border-border/80 pb-2 pt-1 px-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex flex-1 w-full items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ease-in-out disabled:pointer-events-none disabled:opacity-50 select-none text-center",
        // Inactive State: Clean Border & Subtle Surface
        "border-border bg-surface text-content-muted hover:border-amber-400 hover:bg-surface-alt hover:text-content shadow-sm",
        // Active State: Amber Gold Accent Solid Surface with Pure Black Text
        "data-[state=active]:border-2 data-[state=active]:border-amber-400 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:font-black data-[state=active]:shadow-md data-[state=active]:scale-[1.02]",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
