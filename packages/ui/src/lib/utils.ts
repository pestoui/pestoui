import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/* The type-scale names declared in src/index.css @theme, registered with
   tailwind-merge so that each text-<name> merges as a font size and each
   tracking-<name> as letter-spacing. Unregistered, tailwind-merge classifies
   text-<name> as a text COLOUR, so a size written beside a text colour would
   be dropped from the merge.

   (No complete class names in this comment: Tailwind scans src/lib, and one
   written here would be generated into the published stylesheet.)

   The lists must equal the --text-* and --tracking-* names in that @theme
   block, no more and no less; tokens:check asserts it. A missing name merges
   as a colour; an extra name makes twMerge delete real sizes in favour of a
   utility that does not exist.

   Exported so a consumer whose own cn() handles these classes can pass the
   same object to extendTailwindMerge. It uses tailwind-merge 3's theme keys;
   a consumer on tailwind-merge 2 gets no registration from it.

   Frozen all the way down. tailwind-merge builds its config lazily, on the
   first merge, so without this a consumer who emptied or edited the imported
   lists before that first call would silently change how this package's own
   cn() merges. A frozen object makes such a write throw in module code (which
   is always strict) instead. Copy the lists to extend them.

   The lists stay plain string-literal arrays inside one object literal:
   tokens:check reads them from this source text. */
export const typeScaleMergeConfig = deepFreeze({
  extend: {
    theme: {
      text: [
        "micro",
        "caption-sm",
        "caption",
        "body-sm",
        "body",
        "body-md",
        "body-lg",
        "lead",
      ],
      tracking: ["snug", "title"],
    },
  },
})

type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> }

function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value))
    if (child !== null && typeof child === "object") deepFreeze(child)
  return Object.freeze(value) as DeepReadonly<T>
}

const twMerge = extendTailwindMerge(typeScaleMergeConfig)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
