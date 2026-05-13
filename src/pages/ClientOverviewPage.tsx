import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ClientOverviewPage() {
  // `clientId` matches the `:clientId` segment in the route definition.
  // Typed as `string | undefined` by react-router; in practice it's always
  // defined when this page renders (route wouldn't match otherwise), but we
  // guard with a fallback to keep TS happy and the UI honest.
  const { clientId } = useParams<{ clientId: string }>()

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl items-center py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </header>

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Client Overview — coming soon</CardTitle>
          <CardDescription>
            Per-client deep dive: sessions, authorization burn-down, supervision
            history, notes timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border p-4 text-sm">
            <span className="text-muted-foreground">Client ID: </span>
            <span className="font-mono">{clientId ?? "(missing)"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
