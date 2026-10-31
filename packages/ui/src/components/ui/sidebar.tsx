"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { useIsMobile } from "../../hooks/use-mobile"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible"
import { Input } from "./input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { Separator } from "./separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet"
import { Skeleton } from "./skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip"
import { ChevronRightIcon, PanelLeftIcon } from "lucide-react"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

/* True when the event landed in something the user is typing into. Shared by
   the provider's shortcut and by any second shortcut a consumer layers on top
   (⌘1…⌘4 team hints and the like) so they all opt out of the same places. */
function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state. It holds only an
      // open/closed flag; SameSite and, over HTTPS, Secure are hygiene.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`
    },
    [setOpenProp, open]
  )

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        // The listener is on `window`, so it also sees keystrokes aimed at a
        // text field — including SidebarInput, which lives inside the sidebar
        // this very shortcut collapses. Typing must win: in a rich-text field
        // the combination already means "bold", and stealing it there is a
        // silent data-entry bug rather than a navigation shortcut.
        if (isEditableTarget(event.target)) {
          return
        }
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
  /* The mobile sheet is opened by a SidebarTrigger that lives outside it, so
     Radix has no Dialog.Trigger to hand focus back to and drops it on <body>.
     The element focused when the sheet opened is kept here and restored. */
  const returnFocusRef = React.useRef<HTMLElement | null>(null)

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
          onOpenAutoFocus={() => {
            const active = document.activeElement
            returnFocusRef.current = active instanceof HTMLElement ? active : null
          }}
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef.current
            returnFocusRef.current = null
            if (target?.isConnected) {
              event.preventDefault()
              target.focus()
            }
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop. It and the container
          below must stay on the same clock — they are the same edge drawn
          twice, and any difference between them shows up as a tear. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-spring-glide ease-spring-glide",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        )}
      />
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-spring-glide ease-spring-glide data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        /* The rail's hover cue is drawn on its `after` line, which the button's
           own transition cannot reach — so the line gets its own. */
        "absolute inset-y-0 z-20 hidden w-4 transition-all duration-fast ease-out-expo group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] after:transition-colors after:duration-fast after:ease-out-expo hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        /* The inset variant's left margin changes when the sidebar collapses,
           so it belongs to that choreography rather than snapping ahead of it.
           Nothing else here moves, and the layout is already being reflowed by
           the gap beside it, so this costs nothing extra. */
        /* min-w-0 is a defect fix, not a style choice. As a flex child the
           inset defaults to min-width:auto, so any descendant that refuses to
           shrink — a nowrap table, a wide grid — pushes the inset past the
           viewport and the whole PAGE scrolls sideways instead of that one
           region scrolling in its own container. Measured on five screens at
           900px: three of them overflowed, by 35px, 108px and 140px. min-width:0 has no effect whenever the content
           already fits, so it changes nothing on a wide viewport. */
        "min-w-0 relative flex w-full flex-1 flex-col bg-background transition-[margin] duration-spring-glide ease-spring-glide md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("h-8 w-full bg-background shadow-none", className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-spring-glide ease-spring-glide group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-0", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

/* Two clocks on one element, which is why the shorthand is spelled out instead
   of composed from utilities.

   The highlight has to land under the cursor — this is the row a user crosses
   dozens of times a session, and anything slower than instant reads as lag. The
   width/height/padding change is a different event entirely: it only happens
   when the rail collapses, and it has to travel with the container beside it or
   the buttons snap to icon size while the panel is still moving. Utilities give
   one element one transition-duration, so the two are declared directly. Every
   value is still a token. */
const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-[10px] p-2.5 text-left text-body ring-sidebar-ring outline-hidden [transition:background-color_var(--duration-instant)_var(--ease-out-expo),color_var(--duration-instant)_var(--ease-out-expo),width_var(--duration-spring-glide)_var(--ease-spring-glide),height_var(--duration-spring-glide)_var(--ease-spring-glide),padding_var(--duration-spring-glide)_var(--ease-spring-glide)] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot.Root : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      /* `data-active` is a styling hook and nothing more — without this the
         highlight is invisible to a screen reader. Declared before the spread
         so a row whose "active" means something other than "this page" can
         pass its own value (or `undefined`) and win. */
      aria-current={isActive ? "page" : undefined}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  /* Never shown on mobile, but a mounted tooltip still claims the first Escape
     inside the sheet, so the sheet took two presses to close. */
  if (!tooltip || isMobile) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        /* With `showOnHover` this is revealed by hovering the row, so opacity
           joins the transition — an action that blinks into existence under the
           cursor reads as a glitch rather than an affordance. */
        "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-[opacity,transform] duration-fast ease-out-expo group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

/* The in-flow trailing slot: counts, keyboard hints, status dots, an external
   arrow — anything that trails the label rather than floating over it.

   `SidebarMenuBadge` and `SidebarMenuAction` are both absolutely positioned at
   the same right edge, so a row that wants a count *and* a menu gets them
   stacked on top of one another. This one participates in the row's flex line
   instead, which means it composes with both and with each other. It is a
   child of the button, not a sibling, so it reads the button's `group/…` state
   rather than the `peer/…` state those two use. */
function SidebarMenuMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="sidebar-menu-meta"
      data-sidebar="menu-meta"
      className={cn(
        "ml-auto flex shrink-0 items-center gap-1.5 text-xs font-medium text-sidebar-foreground/70 tabular-nums select-none group-data-[collapsible=icon]:hidden group-hover/menu-button:text-sidebar-accent-foreground group-data-active/menu-button:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  // Random width between 50 to 90%.
  const [width] = React.useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  })

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}) {
  const Comp = asChild ? Slot.Root : "a"

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        /* Same highlight clock as the parent row, minus the collapse travel —
           sub-items are hidden in icon mode, so they never resize. */
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-colors duration-instant ease-out-expo group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

/* ---------------------------------------------------------------------------
   Nested groups

   The sub-menu primitives above have always existed, but every consumer had to
   re-derive the same four moving parts by hand: a Collapsible, `asChild` on the
   row, a chevron wired to the open state, and the sub list. Worse, all of it
   goes dark in rail mode — `SidebarMenuSub` is `group-data-[collapsible=icon]:
   hidden`, so a collapsed sidebar simply loses its nested rows with nothing in
   their place.

   So the packaged version does two things. It renders the four parts once, and
   it moves the sub-list into a right-side flyout when the sidebar is a rail.
   One children tree, two presentations — which is why the content component
   below exists even though the upstream shadcn/ui API does not name one. Without it the
   caller would have to write the sub list twice and keep the copies in step.

   The flyout portals, and that portal is load-bearing: it escapes the sidebar's
   `group`, so `group-data-[collapsible=icon]:hidden` stops matching and the
   rows inside are visible again for free.

   ⚠️ The row itself is wrapped by **both** triggers at all times, never one or
   the other. Swapping the wrapper on `railMode` looks tidier and is wrong: the
   two triggers are different component types, so React would unmount the button
   at the exact frame the rail starts closing, and a freshly mounted element has
   nothing to transition from. The row would snap to icon size while every row
   around it glided — the tear the transition comment above exists to prevent.
   Both wrappers are Slots that merge onto the same button, so the cost of
   keeping both is one extra `aria-haspopup`, and the popover's own state is
   held closed whenever the panel is wide. */
type SidebarMenuCollapsibleContextProps = {
  railMode: boolean
  flyoutOpen: boolean
  label?: React.ReactNode
  closeFlyout: () => void
}

const SidebarMenuCollapsibleContext =
  React.createContext<SidebarMenuCollapsibleContextProps | null>(null)

function useSidebarMenuCollapsible() {
  const context = React.useContext(SidebarMenuCollapsibleContext)
  if (!context) {
    throw new Error(
      "SidebarMenuCollapsible parts must be used within a <SidebarMenuCollapsible />."
    )
  }

  return context
}

function SidebarMenuCollapsible({
  className,
  label,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible>, "asChild"> & {
  /** Heading for the rail flyout — normally the same text as the trigger. */
  label?: React.ReactNode
}) {
  const { isMobile, state } = useSidebar()
  const railMode = state === "collapsed" && !isMobile
  const [flyoutOpen, setFlyoutOpen] = React.useState(false)

  /* Gating the setter rather than only the render is what stops a click made
     while the panel was wide from springing a flyout the instant it narrows. */
  const setFlyout = React.useCallback(
    (next: boolean) => setFlyoutOpen(next && railMode),
    [railMode]
  )

  /* Re-expanding the sidebar takes the flyout with it — otherwise it hangs
     beside a panel that has already put the same rows back inline. */
  React.useEffect(() => {
    if (!railMode) {
      setFlyoutOpen(false)
    }
  }, [railMode])

  const contextValue = React.useMemo<SidebarMenuCollapsibleContextProps>(
    () => ({
      railMode,
      flyoutOpen,
      label,
      closeFlyout: () => setFlyoutOpen(false),
    }),
    [railMode, flyoutOpen, label]
  )

  return (
    <SidebarMenuCollapsibleContext.Provider value={contextValue}>
      <Collapsible asChild {...props}>
        {/* Restated because the Slot merge lets Collapsible's own `data-slot`
            through onto this element otherwise. `data-sidebar` survives on its
            own — that is the one the stylesheet selects on. */}
        <SidebarMenuItem
          data-slot="sidebar-menu-item"
          className={cn("group/collapsible", className)}
        >
          {/* Popover.Root renders no element of its own, so this nests inside
              the list item without adding a wrapper to the layout. */}
          <Popover open={railMode && flyoutOpen} onOpenChange={setFlyout}>
            {children}
          </Popover>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenuCollapsibleContext.Provider>
  )
}

function SidebarMenuCollapsibleTrigger({
  children,
  ...props
}: React.ComponentProps<typeof SidebarMenuButton>) {
  const { railMode, flyoutOpen } = useSidebarMenuCollapsible()

  /* Collapsible outside, popover inside: whatever the wrappers merge in, props
     declared on this element win, which is the seam the rail override uses.

     Inline, the row correctly reports the collapsible it expands. On the rail
     the collapsible is not rendered at all — the flyout stands in for it — so
     the row has to report *that* instead, or it announces an expanded region
     that is neither on screen nor in the document. */
  const railAria = railMode
    ? { "aria-expanded": flyoutOpen, "aria-controls": undefined }
    : null

  return (
    <CollapsibleTrigger asChild>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          data-slot="sidebar-menu-button"
          aria-haspopup={railMode ? "dialog" : undefined}
          {...props}
          {...railAria}
        >
          {children}
          {/* A quarter turn, deliberately shorter than the panel it labels: the
              chevron is a label for a state change, not the change itself. */}
          <ChevronRightIcon
            aria-hidden="true"
            className="ml-auto shrink-0 text-sidebar-foreground/60 transition-transform duration-base ease-out-expo group-data-[collapsible=icon]:hidden group-data-open/collapsible:rotate-90"
          />
        </SidebarMenuButton>
      </PopoverTrigger>
    </CollapsibleTrigger>
  )
}

function SidebarMenuCollapsibleContent({
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  const { railMode, label, closeFlyout } = useSidebarMenuCollapsible()

  if (railMode) {
    return (
      <SidebarMenuSubFlyout
        label={label}
        /* Picking a destination is the end of the flyout's job. Radix only
           closes on interaction *outside*, and a rail flyout left standing over
           the page after a navigation reads as a stuck menu. */
        onClick={(event) => {
          const target = event.target
          if (
            target instanceof Element &&
            target.closest("[data-sidebar=menu-sub-button]")
          ) {
            closeFlyout()
          }
        }}
      >
        {children}
      </SidebarMenuSubFlyout>
    )
  }

  return <CollapsibleContent {...props}>{children}</CollapsibleContent>
}

function SidebarMenuSubFlyout({
  className,
  label,
  side = "right",
  align = "start",
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof PopoverContent> & {
  label?: React.ReactNode
}) {
  return (
    <PopoverContent
      data-slot="sidebar-menu-sub-flyout"
      data-sidebar="menu-sub-flyout"
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "w-56 gap-1 rounded-xl bg-sidebar p-1.5 text-sidebar-foreground",
        /* The sub list drops its indent rail in here. The flyout *is* the
           indent — a guide line inside it would draw the same relationship a
           second time, offset from nothing. */
        "[&_[data-sidebar=menu-sub]]:mx-0 [&_[data-sidebar=menu-sub]]:translate-x-0 [&_[data-sidebar=menu-sub]]:border-l-0 [&_[data-sidebar=menu-sub]]:p-0",
        "[&_[data-sidebar=menu-sub-button]]:translate-x-0",
        /* Panel spring in, short tween out — both inherited from PopoverContent.
           The blur is the one addition: an enter-only materialise cue, resolving
           to 0, on a surface that appears out of a 3rem rail with no context. */
        "data-open:blur-in-3",
        className
      )}
      {...props}
    >
      {label ? (
        <div
          data-slot="sidebar-menu-sub-flyout-label"
          className="px-2 pt-0.5 pb-1 text-xs font-medium text-sidebar-foreground/70"
        >
          {label}
        </div>
      ) : null}
      {children}
    </PopoverContent>
  )
}

/* The account row the `lg` size was always for: avatar, name, one line of
   secondary text, and a trailing affordance. Packaged rather than left as a
   composition because getting the two-line grid to truncate correctly inside a
   row that also has to survive collapsing to 36px is the fiddly part, and every
   app shell needs exactly one of these. */
function SidebarUser({
  className,
  name,
  secondary,
  avatar,
  action,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  name: React.ReactNode
  secondary?: React.ReactNode
  avatar?: React.ReactNode
  action?: React.ReactNode
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="sidebar-user"
      data-sidebar="user"
      className={cn(
        sidebarMenuButtonVariants({ size: "lg" }),
        "gap-2 group-data-[collapsible=icon]:justify-center",
        className
      )}
      {...props}
    >
      {/* Slottable marks the caller's element as the one to render *as*; the
          siblings below become its children instead of being thrown away. That
          path re-parents them as an array, which is why they carry keys. */}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : null}
      {avatar ? (
        <span
          key="avatar"
          data-slot="sidebar-user-avatar"
          className="flex shrink-0 items-center justify-center"
        >
          {avatar}
        </span>
      ) : null}
      <span
        key="text"
        className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden"
      >
        <span data-slot="sidebar-user-name" className="truncate font-medium">
          {name}
        </span>
        {secondary ? (
          <span
            data-slot="sidebar-user-secondary"
            className="truncate text-xs font-normal text-sidebar-foreground/70"
          >
            {secondary}
          </span>
        ) : null}
      </span>
      {action ? (
        <span
          key="action"
          data-slot="sidebar-user-action"
          className="flex shrink-0 items-center text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
        >
          {action}
        </span>
      ) : null}
    </Comp>
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuCollapsible,
  SidebarMenuCollapsibleContent,
  SidebarMenuCollapsibleTrigger,
  SidebarMenuItem,
  SidebarMenuMeta,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubFlyout,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SidebarUser,
  useSidebar,
}
