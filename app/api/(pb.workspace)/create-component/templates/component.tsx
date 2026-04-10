import * as React from "react"
import pb from "./FILE_NAME.json" with { type: "json" }

import { cn } from "@/lib/utils"

function COMPONENT_NAME({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="FILE_NAME"
      className={cn(pb.COMPONENT_NAME, className)}
      {...props}
    />
  )
}

function COMPONENT_NAME_TITLE({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="FILE_NAME-title"
      className={cn(pb.COMPONENT_NAME_TITLE, className)}
      {...props}
    />
  )
}

function COMPONENT_NAME_ACTION({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="FILE_NAME-action"
      className={cn(pb.COMPONENT_NAME_ACTION, className)}
      {...props}
    />
  )
}

export {
  COMPONENT_NAME,
  COMPONENT_NAME_TITLE,
  COMPONENT_NAME_ACTION,
}
