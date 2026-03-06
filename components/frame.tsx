import * as React from "react"
import pb from "./frame.json" with { type: "json" }

import { cn } from "@/lib/utils"

function Frame({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="frame"
      data-size={size}
      className={cn(pb.Frame, className)}
      {...props}
    />
  )
}
  
function FrameTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="frame-title"
      className={cn(pb.FrameTitle, className)}
      {...props}
    />
  )
}

function FrameAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="frame-action"
      className={cn(pb.FrameAction, className)}
      {...props}
    />
  )
}

export {
  Frame,
  FrameTitle,
  FrameAction,
}
