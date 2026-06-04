import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Check, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardMockup } from "@/components/DashboardMockup"

const DEMO_EMAIL    = "demo@pulseaba.app"
const DEMO_PASSWORD = "PulseDemo2026!"

const VALUE_PROPS = [
  "Real-time compliance tracking",
  "Session documentation in seconds",
  "Complete visibility across your team",
]


interface AuthPageProps {
  mode?: "login" | "signup"
}

export function AuthPage({ mode = "login" }: AuthPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  // Show a hint if the user has signed in before
  const lastEmail =
    typeof window !== "undefined" ? localStorage.getItem("pulse_last_email") : null

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    setNotice(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      if (email) localStorage.setItem("pulse_last_email", email)
      console.log("Signed in as:", data.user?.email)
    }
    setLoading(false)
  }

  async function handleSignUp() {
    setLoading(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setNotice("Account created — check your email to confirm, then sign in.")
    }
    setLoading(false)
  }

  async function handleTryDemo() {
    setDemoLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (error) setError("Demo account unavailable — please try again shortly.")
    setDemoLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && email && password) handleSignIn()
  }

  return (
    <div className="min-h-svh flex">

      {/* ── Left panel — brand/marketing (desktop only) ── */}
      <div className="hidden md:flex md:w-2/5 flex-col justify-between bg-[#0D7377] px-10 py-10">

        {/* Top: wordmark */}
        <div>
          <p className="text-2xl font-bold tracking-tight text-white">Pulse</p>
          <p className="text-sm text-white/60 mt-0.5">ABA practice management</p>
        </div>

        {/* Center: mockup + value props */}
        <div className="flex flex-col items-center gap-8">
          <DashboardMockup />

          <ul className="w-full max-w-xs space-y-3.5">
            {VALUE_PROPS.map((prop) => (
              <li key={prop} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-sm text-white/90 leading-relaxed">{prop}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: trust badge */}
        <div className="flex items-center gap-2 text-white/60">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">HIPAA-ready infrastructure</span>
        </div>
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm space-y-7">

          {/* Back to home */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#4A5C5C] hover:text-[#0D7377] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          {/* Mobile-only wordmark */}
          <div className="space-y-1 md:hidden text-center">
            <p className="text-2xl font-bold tracking-tight text-[#0D7377]">Pulse</p>
            <p className="text-sm text-[#4A5C5C]">ABA practice management</p>
          </div>

          {/* Form header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1E2A2A]">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-[#4A5C5C]">
              {mode === "signup" ? "Start your free Pulse practice" : "Sign in to your practice"}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              {lastEmail && (
                <p className="text-xs text-slate-400">Last time you used {lastEmail}</p>
              )}
              <label className="text-sm font-medium text-[#1E2A2A]" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className="border-[#D0DCDC] focus-visible:ring-[#14A0A5]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1E2A2A]" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="border-[#D0DCDC] focus-visible:ring-[#14A0A5]"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-200">
                {notice}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {mode === "signup" ? (
                <>
                  <Button
                    className="flex-1 bg-[#0D7377] hover:bg-[#0a5f63] text-white"
                    onClick={handleSignUp}
                    disabled={loading || !email || !password}
                  >
                    {loading ? "Creating account…" : "Sign Up"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-[#D0DCDC] text-[#1E2A2A] hover:bg-[#E8F7F7] hover:border-[#14A0A5]"
                    onClick={handleSignIn}
                    disabled={loading || !email || !password}
                  >
                    Sign In
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="flex-1 bg-[#0D7377] hover:bg-[#0a5f63] text-white"
                    onClick={handleSignIn}
                    disabled={loading || !email || !password}
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-[#D0DCDC] text-[#1E2A2A] hover:bg-[#E8F7F7] hover:border-[#14A0A5]"
                    onClick={handleSignUp}
                    disabled={loading || !email || !password}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Demo divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-[#D0DCDC]" />
            <span className="shrink-0 text-xs text-[#4A5C5C]">or</span>
            <div className="flex-1 border-t border-[#D0DCDC]" />
          </div>

          {/* Demo CTA */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
              onClick={handleTryDemo}
              disabled={demoLoading}
            >
              {demoLoading ? "Loading demo…" : "Just exploring? Try the demo →"}
            </Button>
            <p className="text-center text-xs text-[#4A5C5C]">
              Pre-filled with realistic data. No account required.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
