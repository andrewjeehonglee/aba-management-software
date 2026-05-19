import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"

export function SessionViewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl items-center py-6">
        <Link
          to={-1 as unknown as string}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </header>

      <Card className="w-full max-w-3xl">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-2xl font-semibold">Session View</p>
          <p className="text-sm text-muted-foreground">
            Session <span className="font-mono">{sessionId}</span>
          </p>
          <p className="text-sm text-muted-foreground">Coming soon — this is Phase 2.</p>
        </CardContent>
      </Card>
    </div>
  )
}
