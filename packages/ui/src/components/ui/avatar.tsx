"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className,
      )}
      {...props}
    />
  )
}

/* Motion: the primitive mounts this element only once the source has actually
   decoded, so its arrival is a real event and a mount animation is the honest
   way to mark it — a face appearing with a hard cut is the one moment an
   avatar has anything to say.

   Deliberately opacity only, and deliberately short. Two reasons:

   - The fallback is not a sibling that fades out, it is *replaced* — the
     primitive renders one or the other, never both — so anything longer than
     a snap leaves the parent surface showing through the gap. `ease-out-expo`
     is front-loaded enough to be past nine-tenths opaque within the first
     third of the run, which puts the gap under the threshold of notice.
   - No scale and therefore no blur (blur only ever travels with movement).
     The ring on the root sits at the element's edge; an image growing into
     place would open a hairline crescent inside it for the whole animation.

   Avatars come in groups and in table rows. This has to survive twenty at
   once on first paint, which rules out anything with mass. */
function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full animate-in rounded-full object-cover ease-out-expo anim-base fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  )
}

/* The row lift lives in `styles/motion.css` as `@utility avatar-lift`, not in
   a class string here. The seven falloff rules have to be ordered relative to
   each other and Tailwind picks its own emission order; expressed as arbitrary
   variants they came out with the backward rules always winning, so a seat
   between two engaged seats took the wrong distance. The utility also owns the
   `z-index` and the reduced-motion gate, both of which exist only to serve the
   translate and have to appear and disappear with it.

   Known limitation: the lift moves the seat out from under the pointer, so a
   pointer resting in the bottom few pixels of a seat can oscillate — hover
   lost, seat returns, hover regained. `scale-105` widens the box by under a
   pixel per side and does not cover it. Fixing it properly means driving the
   effect from the group plus an index rather than from each seat's own
   `:hover`, which is a different shape of solution than this one. */

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        "avatar-lift",
        className,
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
