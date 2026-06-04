import { supabase } from "@/lib/supabase"

export function DemoBanner() {
  async function handleCreateAccount() {
    await supabase.auth.signOut()
    window.location.href = "/signup"
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-amber-950 shadow-sm">
      <p className="text-sm font-medium">
        You&rsquo;re exploring{" "}
        <span className="font-bold">Pulse</span>{" "}
        in Demo Mode &mdash; changes won&rsquo;t be saved.
      </p>
      <button
        onClick={handleCreateAccount}
        className="shrink-0 rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 transition-opacity hover:opacity-80"
      >
        Create your free account →
      </button>
    </div>
  )
}
