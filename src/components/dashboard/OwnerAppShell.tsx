import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { OwnerNavRail } from "@/components/dashboard/OwnerNavRail"

export function OwnerAppShell({
  ownerName,
  practiceName,
  children,
  className,
}: {
  ownerName: string
  practiceName?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid h-dvh overflow-hidden bg-bg text-foreground min-[1000px]:grid-cols-[236px_1fr] max-[999px]:grid-rows-[auto_1fr]",
        className,
      )}
    >
      <OwnerNavRail ownerName={ownerName} practiceName={practiceName} />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden px-5 py-6 min-[1000px]:px-[52px] min-[1000px]:py-8">
        <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-col">{children}</div>
      </main>
    </div>
  )
}
