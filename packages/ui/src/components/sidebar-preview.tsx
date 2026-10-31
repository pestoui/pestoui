import {
  ArrowUpRight,
  ChevronsLeft,
  CircleUserRound,
  Copy,
  Folder,
  Loader,
  MessagesSquare,
  Plus,
  WalletCards,
} from "lucide-react"

import { Badge } from "./ui/badge"
import { LogoMark } from "./brand-icons"
import { cn } from "../lib/utils"

function NavItem({
  icon,
  label,
  active = false,
  badge,
  external = false,
  className,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number
  external?: boolean
  className?: string
}) {
  return (
    /* Motion: restraint, because there are eleven of these on screen. The
       highlight resolves at the instant duration — a pointer-tracking highlight
       is one of the few places where fast beats smooth — and the press is a
       one-percent settle on the press spring, which on a row this wide is a few
       pixels of give rather than anything anyone would call an animation. */
    <button
      type="button"
      className={cn(
        "group/nav-item flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-body font-medium text-sidebar-foreground transition-all duration-instant ease-out-expo outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-99 active:duration-spring-press active:ease-spring-press",
        active && "bg-sidebar-accent",
        className
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-foreground/75 [&_svg]:size-5">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && <Badge variant="count">{badge}</Badge>}
      {/* The one row that leaves the app says so on approach: the arrow steps a
          pixel along its own diagonal, which is the direction it is pointing. */}
      {external && (
        <ArrowUpRight className="size-4.5 text-muted-foreground transition-transform duration-base ease-out-expo group-hover/nav-item:translate-x-px group-hover/nav-item:-translate-y-px" />
      )}
    </button>
  )
}

function WorkspaceRow({
  label,
  icon,
  loading = false,
  indent = false,
}: {
  label: string
  icon?: React.ReactNode
  loading?: boolean
  indent?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-body text-sidebar-foreground/90 transition-all duration-instant ease-out-expo outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-99 active:duration-spring-press active:ease-spring-press",
        indent && "pl-[42px]"
      )}
    >
      {icon && (
        <span className="flex size-5 shrink-0 items-center justify-center text-foreground/75 [&_svg]:size-5">
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {loading && (
        <Loader className="size-4 animate-spin text-muted-foreground [animation-duration:2s]" />
      )}
    </button>
  )
}

/* Composed workspace sidebar — white card floating on the warm background */
export function SidebarPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[290px] rounded-2xl bg-sidebar p-4 shadow-card ring-1 ring-foreground/[0.04]",
        className
      )}
    >
      <div className="flex items-center justify-between px-2 pt-1">
        <LogoMark className="size-6" />
        <ChevronsLeft className="size-5 text-muted-foreground" />
      </div>

      <nav className="mt-7 space-y-0.5">
        <NavItem icon={<Plus />} label="New chat" />
        <NavItem icon={<LogoMark className="size-4.5" />} label="Discover" />
        <NavItem icon={<Copy />} label="Feed" badge={4} />
        <NavItem icon={<WalletCards />} label="Agents" />
        <NavItem icon={<CircleUserRound />} label="Org" />
        <NavItem icon={<MessagesSquare />} label="Messages" active external />
      </nav>

      <div className="mt-7 mb-2 px-3 text-caption font-medium text-muted-foreground">
        Workspace
      </div>
      <div className="space-y-0.5 pb-1">
        <WorkspaceRow icon={<Folder />} label="Email & Notifications" loading />
        <WorkspaceRow label="Agent #1" indent loading />
        <WorkspaceRow label="Agent #2" indent />
        <WorkspaceRow label="Agent #3" indent />
        <WorkspaceRow label="Agent #4" indent loading />
      </div>
    </div>
  )
}
