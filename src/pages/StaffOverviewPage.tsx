import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function StaffOverviewPage() {
  const { staffId } = useParams<{ staffId: string }>()

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
          <CardTitle>Staff Overview — coming soon</CardTitle>
          <CardDescription>
            Per-staff deep dive: hours breakdown, sessions, supervision history,
            overdue notes timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border p-4 text-sm">
            <span className="text-muted-foreground">Staff ID: </span>
            <span className="font-mono">{staffId ?? "(missing)"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
