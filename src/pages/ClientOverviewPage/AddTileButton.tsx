import { P } from "./profileTokens"

interface AddTileButtonProps {
  label: string
  onClick: () => void
}

export function AddTileButton({ label, onClick }: AddTileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all hover:brightness-[0.97] active:scale-[0.98]"
      style={{
        borderColor: P.sage,
        backgroundColor: P.sageBg,
        color: P.sageInk,
      }}
    >
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold leading-none text-white"
        style={{ backgroundColor: P.sage }}
        aria-hidden="true"
      >
        +
      </span>
      {label}
    </button>
  )
}
