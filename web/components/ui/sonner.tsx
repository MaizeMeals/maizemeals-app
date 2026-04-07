"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      offset={{ bottom: "1.25rem" }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border-0 !px-4 !py-3 !shadow-xl " +
            "!bg-foreground !text-background group-[.toaster]:!bg-foreground " +
            "group-[.toaster]:!text-background",
          title: "!text-background",
          description: "!text-background/75",
          success: "!bg-foreground !text-background",
          error: "!bg-foreground !text-background",
          info: "!bg-foreground !text-background",
          warning: "!bg-foreground !text-background",
          actionButton:
            "!bg-background !text-foreground hover:!bg-background/90",
          cancelButton: "!bg-transparent !text-background/80 hover:!text-background",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
