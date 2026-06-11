import { useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, FileDown, Layers, LayoutDashboard, Scale } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

const DEMO_EMAIL    = "demo@pulseaba.app"
const DEMO_PASSWORD = "PulseDemo2026!"

const PROBLEMS = [
  {
    icon: Layers,
    title: "Data lives in too many places",
    bodyLines: [
      "Sessions, notes, and hours sit in different spreadsheets.",
      "You cannot see what happened without opening three files.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Notes slip after session end",
    bodyLines: [
      "Staff move on before SOAP is done.",
      "You find the gaps at payroll or audit time.",
    ],
  },
  {
    icon: Scale,
    title: "The calendar is not the truth",
    bodyLines: [
      "Scheduled blocks and payable hours are different numbers.",
      "Pay and audits need completed sessions with complete notes.",
    ],
  },
] as const

const FEATURES = [
  {
    icon: ClipboardList,
    title: "See missing and overdue notes",
    bodyLines: [
      "One screen for what still needs documentation",
      "this pay period.",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Pull audit docs in minutes",
    bodyLines: [
      "Bundle session notes by client and date range.",
      "Export when the auditor calls.",
    ],
  },
  {
    icon: FileDown,
    title: "Hours that match reality",
    bodyLines: [
      "Count completed sessions with complete notes",
      "not calendar blocks.",
    ],
  },
] as const

function SplitBody({
  lines,
  className,
}: {
  lines: readonly [string, string]
  className?: string
}) {
  return (
    <p className={className}>
      {lines[0]}
      <br className="hidden md:block" />
      {lines[1]}
    </p>
  )
}

export function LandingPage() {
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  async function handleTryDemo() {
    setDemoLoading(true)
    setDemoError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (error) {
      setDemoError("Demo unavailable. Please try again shortly.")
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-b from-slate-50 to-white text-pulse-text">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-10 border-b border-pulse-light bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <span className="text-xl font-bold tracking-tight text-pulse-primary">Pulse</span>
          <Link
            to="/signup"
            className={cn(buttonVariants(), "bg-pulse-primary hover:bg-pulse-primary/90 text-white")}
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="mx-auto max-w-5xl px-4 py-12 text-center md:px-6 md:py-16">
          <h1 className="text-5xl font-bold tracking-tight text-pulse-text md:whitespace-nowrap text-balance">
            Keep your practice{" "}
            <span className="text-pulse-primary">in sync</span>.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl text-pulse-text/80 leading-relaxed text-balance">
            One dashboard for sessions, notes, and hours.
            <br className="hidden md:block" />
            So your team can focus on clients, not spreadsheets.
          </p>
          <div className="mt-10">
            <Link
              to="/signup"
              className={cn(buttonVariants({ size: "lg" }), "bg-pulse-primary hover:bg-pulse-primary/90 text-white text-lg font-bold px-10 py-4 rounded-xl")}
            >
              Get started
            </Link>
          </div>
        </section>

        {/* ── Problem ── */}
        <section className="bg-pulse-surface">
          <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-pulse-text">
              Running an ABA practice means tracking three things at once.
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {PROBLEMS.map(({ icon: Icon, title, bodyLines }) => (
                <div key={title} className="flex flex-col items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pulse-light">
                    <Icon className="h-8 w-8 text-pulse-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="max-w-xs text-balance text-lg font-semibold text-pulse-text">{title}</h3>
                  <SplitBody
                    lines={bodyLines}
                    className="text-sm text-pulse-muted leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bridge ── */}
        <section className="py-6 text-center">
          <p className="text-4xl font-bold text-pulse-text leading-tight px-4 md:whitespace-nowrap">
            Pulse puts all three{" "}
            <span className="text-pulse-primary">in one place</span>
          </p>
          <p className="mt-3">
            <span className="inline-block rounded-full bg-pulse-light px-4 py-1.5 text-base text-pulse-primary">
              Ready means in sync.
            </span>
          </p>
        </section>

        {/* ── What Pulse does ── */}
        <section className="mx-auto max-w-5xl px-4 pt-6 pb-12 md:px-6">
          <div className="mb-8 text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-pulse-text">
              How Pulse keeps your practice ready
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, bodyLines }) => (
              <Card key={title} className="border-pulse-light border-l-4 border-l-pulse-primary shadow-sm">
                <CardContent className="p-8 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pulse-light">
                    <Icon className="h-5 w-5 text-pulse-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-balance text-xl font-semibold text-pulse-text leading-snug">{title}</h3>
                  <SplitBody
                    lines={bodyLines}
                    className="text-base text-pulse-muted leading-snug"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Demo CTA band ── */}
        <section className="bg-pulse-primary">
          <div className="mx-auto flex flex-col items-center gap-4 px-4 py-16 text-center md:px-6">
            <h2 className="text-2xl font-bold text-white">
              See it for yourself.
            </h2>
            <Button
              size="lg"
              className="mt-2 bg-white text-pulse-primary hover:bg-pulse-light text-lg font-bold px-10 py-4 rounded-xl"
              onClick={handleTryDemo}
              disabled={demoLoading}
            >
              {demoLoading ? "Loading…" : "Try the demo"}
            </Button>
            {demoError && (
              <p className="text-base text-white/80">{demoError}</p>
            )}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-pulse-light bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-base text-pulse-muted md:flex-row md:px-6">
          <span>Pulse · Built by Andrew Lee</span>
          <span className="text-pulse-muted/50 cursor-default select-none">Privacy</span>
        </div>
      </footer>

    </div>
  )
}
