/**
 * Pulse mark — practice awareness, not a vital-signs line.
 *
 * - Arc: ongoing read on practice health (the “pulse” Jenny checks each morning)
 * - Triangle network: BCBA leads the care team (supervisor + technician)
 * - Center point: client at the center of every team
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
        d="M3.5 10a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.2" r="1.85" fill="currentColor" />
      <circle cx="6.35" cy="13.1" r="1.45" fill="currentColor" />
      <circle cx="13.65" cy="13.1" r="1.45" fill="currentColor" />
      <path
        d="M10 8.1v1.6M7.4 12.1l1.8-2.1M12.6 12.1l-1.8-2.1"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10.9" r="0.95" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
