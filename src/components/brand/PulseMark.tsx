/**
 * Pulse mark — practice awareness, not a vital-signs line or hazard symbol.
 *
 * - Center dot: the focal point of the practice (what needs attention today)
 * - Concentric arcs: an ongoing read on practice health — like a gentle signal,
 *   not an ECG spike or triangular warning mark
 */
export function PulseMark({
  className,
  size = 20,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 10a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        opacity="0.38"
      />
      <path
        d="M5.75 10a4.25 4.25 0 0 1 8.5 0"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="2.15" fill="currentColor" />
    </svg>
  )
}
