"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { FileIcon, UploadIcon, XIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Progress } from "./progress"

/* ------------------------------------------------------------------ utils */

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"]

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded =
    value >= 10 || Number.isInteger(value)
      ? Math.round(value)
      : Math.round(value * 10) / 10
  return `${rounded} ${BYTE_UNITS[unit]}`
}

/* Mirrors the browser's own `accept` matching: extensions, `type/subtype`
   and wildcard `type/*` tokens. We re-run it after a drop because the native
   filter only applies to the file picker, never to dragged files. */
function matchesAccept(file: File, accept?: string) {
  const tokens = (accept ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0) return true

  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return tokens.some((token) => {
    if (token === "*" || token === "*/*") return true
    if (token.startsWith(".")) return name.endsWith(token)
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}

function formatAcceptLabel(accept?: string) {
  const labels = (accept ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      if (token.startsWith(".")) return token.slice(1)
      if (token.endsWith("/*")) return token.slice(0, -2)
      return token.split("/").pop() ?? token
    })
    .map((label) => label.toUpperCase())

  const unique = labels.filter((label, i) => labels.indexOf(label) === i)
  return unique.length > 0 ? unique.join(", ") : null
}

function fileExtension(name: string) {
  const dot = name.lastIndexOf(".")
  if (dot < 1 || dot === name.length - 1) return null
  const ext = name.slice(dot + 1)
  return ext.length <= 4 ? ext.toUpperCase() : null
}

/* ------------------------------------------------------------- FileUpload */

/* Motion: drag-over is the one state here that has to be unmistakable, because
   the pointer is carrying something and the user needs to know this box will
   catch it. So it is the only state that gets more than colour — the surface
   swells by one percent on the press spring, which reads as the box reaching
   for the payload. Leaving runs back on the short base tween, so the reach is
   deliberate and the release is not.

   The click press is deliberately smaller than a button's: this surface is
   large, and the same ratio that feels crisp on a control reads as the whole
   panel lurching. */
const fileUploadVariants = cva(
  "group/file-upload flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card text-center transition-[color,background-color,border-color,box-shadow,scale] duration-fast ease-out-expo outline-none select-none hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-99 active:duration-spring-press active:ease-spring-press disabled:pointer-events-none disabled:opacity-55 data-[dragging=true]:scale-101 data-[dragging=true]:border-selected data-[dragging=true]:bg-selected/8 data-[dragging=true]:duration-spring-press data-[dragging=true]:ease-spring-press dark:bg-input/30 dark:hover:bg-input/50 dark:data-[dragging=true]:bg-selected/12",
  {
    variants: {
      size: {
        sm: "gap-2 px-5 py-6",
        default: "gap-3 px-6 py-9",
        lg: "gap-4 px-8 py-14",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function FileUpload({
  className,
  size = "default",
  accept,
  multiple = false,
  maxSize,
  onFilesChange,
  disabled = false,
  hint,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "type"> &
  VariantProps<typeof fileUploadVariants> & {
    accept?: string
    multiple?: boolean
    maxSize?: number
    onFilesChange?: (files: File[]) => void
    hint?: React.ReactNode
  }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  /* dragenter/dragleave also fire for descendants, so a plain boolean flickers.
     Counting entries keeps the state stable while the pointer crosses children. */
  const dragDepth = React.useRef(0)
  const [dragging, setDragging] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])

  function processFiles(incoming: File[]) {
    if (incoming.length === 0) return

    if (!multiple && incoming.length > 1) {
      setErrors(["Only one file can be uploaded at a time."])
      return
    }

    const accepted: File[] = []
    const rejected: string[] = []

    for (const file of incoming) {
      if (!matchesAccept(file, accept)) {
        rejected.push(`${file.name} is not an accepted file type.`)
        continue
      }
      if (maxSize != null && file.size > maxSize) {
        rejected.push(
          `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(maxSize)}.`
        )
        continue
      }
      accepted.push(file)
    }

    setErrors(rejected)
    if (accepted.length > 0) onFilesChange?.(accepted)
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(event.target.files ?? []))
    /* Reset so picking the same file twice still fires a change. */
    event.target.value = ""
  }

  function handleDragEnter(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled) return
    dragDepth.current += 1
    setDragging(true)
  }

  function handleDragOver(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled || !event.dataTransfer) return
    event.dataTransfer.dropEffect = "copy"
  }

  function handleDragLeave(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (disabled) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (disabled) return
    processFiles(Array.from(event.dataTransfer?.files ?? []))
  }

  const acceptLabel = formatAcceptLabel(accept)
  const resolvedHint =
    hint ??
    [acceptLabel, maxSize != null ? `max. ${formatBytes(maxSize)}` : null]
      .filter(Boolean)
      .join(" · ")

  return (
    <div data-slot="file-upload" className="flex w-full flex-col gap-2">
      <input
        ref={inputRef}
        data-slot="file-upload-input"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={handleChange}
      />

      {/* The zone itself is the button: click, Enter and Space all open the
          picker for free, and the focus ring lands on the visible box. */}
      <button
        data-slot="file-upload-dropzone"
        type="button"
        data-size={size}
        data-dragging={dragging ? "true" : "false"}
        disabled={disabled}
        className={cn(fileUploadVariants({ size }), className)}
        {...props}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children ?? (
          <>
            {/* Explicit radius — a token radius would round this into a circle. */}
            <span
              data-slot="file-upload-tile"
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-secondary text-muted-foreground shadow-soft ring-1 ring-foreground/[0.035] transition-colors duration-fast ease-out-expo group-data-[size=lg]/file-upload:size-14 group-data-[size=lg]/file-upload:rounded-[16px] group-data-[size=sm]/file-upload:size-10 group-data-[size=sm]/file-upload:rounded-[12px] group-data-[dragging=true]/file-upload:bg-selected/12 group-data-[dragging=true]/file-upload:text-selected group-data-[dragging=true]/file-upload:duration-spring-press group-data-[dragging=true]/file-upload:ease-spring-press [&_svg]:size-5 group-data-[size=lg]/file-upload:[&_svg]:size-6 group-data-[size=sm]/file-upload:[&_svg]:size-4.5"
            >
              <UploadIcon />
            </span>
            <span className="text-body leading-snug font-medium text-foreground">
              Click to upload{" "}
              <span className="font-normal text-muted-foreground">
                or drag and drop
              </span>
            </span>
            {resolvedHint ? (
              <span
                data-slot="file-upload-hint"
                className="text-caption leading-snug text-muted-foreground"
              >
                {resolvedHint}
              </span>
            ) : null}
          </>
        )}
      </button>

      {/* Always in the DOM so the live region is registered before it fills —
          role="alert" already implies assertive, so no aria-live beside it. */}
      <div data-slot="file-upload-error" role="alert" className="empty:hidden">
        {errors.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {errors.map((message, index) => (
              <li
                key={`${index}-${message}`}
                className="text-caption leading-snug text-destructive animate-in fade-in-0 slide-in-from-top-[3px] blur-in-[3px] duration-spring-swap ease-spring-swap"
              >
                {message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

/* --------------------------------------------------------- FileUploadItem */

/* Arrival for a row that has genuinely just landed — a drop resolving, a pick
   coming back. Enter only: the row leaves when the consumer drops it from its
   own state, and by then the node is already gone, so there is nothing left in
   here for CSS to hold on to.

   Opt-in for the same reason the badge entrance is. A list that was already on
   screen when the page painted has not arrived, and a stack of rows dealing
   themselves in on first load is the failure mode. Reach for it when the row
   appears in response to something the user just did. */
const fileUploadItemAppear =
  "animate-in fade-in-0 slide-in-from-top-[6px] blur-in-[3px] duration-spring-swap ease-spring-swap"

/* A row in the uploaded-file list — belongs inside a <ul>. */
function FileUploadItem({
  className,
  name,
  size,
  progress,
  status,
  error,
  appear = false,
  onRemove,
  children,
  ...props
}: React.ComponentProps<"li"> & {
  name: string
  size?: number
  progress?: number
  status?: "uploading" | "complete" | "error"
  error?: string
  /* Play the entrance on mount. For rows that arrive, not ones that were
     already listed when the page loaded. */
  appear?: boolean
  onRemove?: () => void
}) {
  const state =
    status ??
    (error
      ? "error"
      : progress != null && progress < 100
        ? "uploading"
        : "complete")
  const percent = Math.min(100, Math.max(0, progress ?? 0))
  const sizeLabel = typeof size === "number" ? formatBytes(size) : null
  const meta =
    state === "uploading" && progress != null
      ? [sizeLabel, `${Math.round(percent)}%`].filter(Boolean).join(" · ")
      : (sizeLabel ?? "")
  const extension = fileExtension(name)

  return (
    <li
      data-slot="file-upload-item"
      data-status={state}
      className={cn(
        "group/file-upload-item flex w-full list-none items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft transition-colors duration-base ease-out-expo data-[status=error]:border-destructive/25 data-[status=error]:bg-destructive/5",
        appear && fileUploadItemAppear,
        className
      )}
      {...props}
    >
      {/* File-type squircle — explicit radius so it never reads as a circle. */}
      <span
        data-slot="file-upload-item-tile"
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-secondary text-micro font-semibold tracking-[0.02em] text-muted-foreground ring-1 ring-foreground/[0.035] transition-colors duration-base ease-out-expo group-data-[status=error]/file-upload-item:bg-destructive/10 group-data-[status=error]/file-upload-item:text-destructive group-data-[status=uploading]/file-upload-item:bg-selected/10 group-data-[status=uploading]/file-upload-item:text-selected [&_svg]:size-5"
      >
        {extension ?? <FileIcon />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-body leading-snug font-medium text-foreground">
            {name}
          </span>
          <span className="ml-auto shrink-0 text-caption tabular-nums text-muted-foreground empty:hidden">
            {meta}
          </span>
        </div>

        {state === "uploading" ? (
          <Progress
            value={percent}
            aria-label={`Uploading ${name}`}
            className="h-1.5"
          />
        ) : null}

        {state === "error" && error ? (
          <span className="text-caption leading-snug text-destructive">
            {error}
          </span>
        ) : null}

        {children}
      </div>

      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          <XIcon />
        </Button>
      ) : null}
    </li>
  )
}

export { FileUpload, FileUploadItem, fileUploadVariants }
