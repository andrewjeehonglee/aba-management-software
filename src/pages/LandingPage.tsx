import { useState } from "react"
import { Link } from "react-router-dom"
import { LayoutDashboard, ClipboardList, BellRing, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

const DEMO_EMAIL    = "demo@pulseaba.app"
const DEMO_PASSWORD = "PulseDemo2026!"

const PROBLEMS = [
  {
    icon: BellRing,
    title: "An authorization lapsed",
    punch: "You already delivered the hours. Now they are unbillable.",
    detail: "A renewal slipped past its date, and every session logged against it gets denied the moment you submit.",
  },
  {
    icon: ClipboardList,
    title: "A note was incomplete",
    punch: "One missing signature voids the whole claim.",
    detail: "Payers reject any note missing a signature, a timestamp, or a code that matches the session delivered.",
  },
  {
    icon: Clock,
    title: "Nobody caught it in time",
    punch: "You find out weeks later, when the denial lands.",
    detail: "By then the appeal window is closing and the revenue is already written off.",
  },
]

const FEATURES = [
  {
    icon: BellRing,
    title: "Authorization tracking, always current",
    body: "Expiring auths surface on your dashboard before lapsed hours get booked.",
  },
  {
    icon: ClipboardList,
    title: "Documentation that closes before you leave",
    body: "Notes, behavior data, and billing code in one flow, before the session closes.",
  },
  {
    icon: LayoutDashboard,
    title: "Everyone sees what they need to act on",
    body: "Every role sees their open items at login, never buried in a spreadsheet.",
  },
]

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
          <Button className="bg-pulse-primary hover:bg-pulse-primary/90 text-white" asChild>
            <Link to="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="mx-auto max-w-5xl px-4 py-12 text-center md:px-6 md:py-16">
          <h1 className="text-5xl font-bold tracking-tight text-pulse-text md:whitespace-nowrap text-balance">
            Keep your ABA practice{" "}
            <span className="text-pulse-primary">connected</span>.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl text-pulse-text/80 leading-relaxed text-balance">
            One platform for your whole team, so you can focus on your clients.
          </p>
          <div className="mt-10">
            <Button
              size="lg"
              className="bg-pulse-primary hover:bg-pulse-primary/90 text-white text-lg font-bold px-10 py-4 rounded-xl"
              asChild
            >
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </section>

        {/* ── Problem ── */}
        <section className="bg-pulse-surface">
          <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-pulse-text">
              In ABA, up to 1 in 3 claims gets denied.
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {PROBLEMS.map(({ icon: Icon, title, punch, detail }) => (
                <div key={title} className="flex flex-col items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pulse-light">
                    <Icon className="h-8 w-8 text-pulse-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-pulse-text">{title}</h3>
                  <p className="font-semibold text-pulse-text leading-snug">{punch}</p>
                  <p className="text-sm text-pulse-muted leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bridge ── */}
        <section className="py-10 text-center">
          <p className="text-4xl font-bold text-pulse-text leading-tight px-4 md:whitespace-nowrap">
            Pulse catches all three{" "}
            <span className="text-pulse-primary">before the claim does</span>
          </p>
        </section>

        {/* ── What Pulse does ── */}
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <div className="mb-8 text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-pulse-text">
              How Pulse catches each one
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-pulse-light border-l-4 border-l-pulse-primary shadow-sm">
                <CardContent className="p-8 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pulse-light">
                    <Icon className="h-5 w-5 text-pulse-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-xl font-semibold text-pulse-text leading-snug">{title}</h3>
                  <p className="text-base text-pulse-muted leading-snug">{body}</p>
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
