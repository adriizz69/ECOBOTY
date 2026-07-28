export default defineAppConfig({
  ui: {
    colors: {
      primary: "emerald",
      neutral: "slate"
    },
    button: {
      defaultVariants: {
        size: "md"
      }
    },
    card: {
      slots: {
        root: "rounded-2xl ring-1 ring-default bg-elevated/60 backdrop-blur-sm"
      }
    },
    select: {
      slots: {
        base: "relative group rounded-xl inline-flex items-center w-full disabled:cursor-not-allowed disabled:opacity-75 transition-colors",
        content:
          "max-h-[min(18rem,var(--reka-select-content-available-height,18rem))] w-(--reka-select-trigger-width) bg-elevated shadow-lg rounded-xl ring ring-default overflow-hidden origin-(--reka-select-content-transform-origin) pointer-events-auto flex flex-col",
        item: "group relative w-full flex items-start select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-lg data-disabled:cursor-not-allowed data-disabled:opacity-75 text-default data-highlighted:not-data-disabled:text-highlighted data-highlighted:not-data-disabled:before:bg-elevated/50 transition-colors before:transition-colors"
      },
      defaultVariants: {
        size: "md",
        color: "neutral",
        variant: "outline"
      }
    },
    selectMenu: {
      slots: {
        base: "relative group rounded-xl inline-flex items-center w-full disabled:cursor-not-allowed disabled:opacity-75 transition-colors",
        content:
          "max-h-[min(18rem,var(--reka-combobox-content-available-height,18rem))] w-(--reka-combobox-trigger-width) bg-elevated shadow-lg rounded-xl ring ring-default overflow-hidden origin-(--reka-combobox-content-transform-origin) pointer-events-auto flex flex-col",
        item: "group relative w-full flex items-start select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-lg data-disabled:cursor-not-allowed data-disabled:opacity-75 text-default data-highlighted:not-data-disabled:text-highlighted data-highlighted:not-data-disabled:before:bg-elevated/50 transition-colors before:transition-colors",
        input: "border-b border-default rounded-none"
      },
      defaultVariants: {
        size: "md",
        color: "neutral",
        variant: "outline"
      }
    }
  }
});
