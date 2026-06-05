import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type SignaturePadProps = {
  label: string
  disabled?: boolean
  captured: boolean
  onCapture: () => void
  onClear: () => void
}

export function SignaturePad({ label, disabled, captured, onCapture, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [stroked, setStroked] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || disabled || captured) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2
    ctx.strokeStyle = "#1E2A2A"
  }, [disabled, captured])

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || captured) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    drawing.current = true
    const { x, y } = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  function moveStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled || captured) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasInk.current) {
      hasInk.current = true
      setStroked(true)
    }
  }

  function endStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    drawing.current = false
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  function clearPad() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    setStroked(false)
    onClear()
  }

  if (captured) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="w-full h-24 rounded-xl border-2 border-emerald-400 bg-emerald-50 flex items-center justify-center">
          <span className="text-emerald-700 text-sm font-medium">Signature captured</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {disabled && (
        <p className="text-xs text-muted-foreground">Complete all four SOAP fields to unlock.</p>
      )}
      <div
        className={`relative w-full h-28 rounded-xl border-2 border-dashed overflow-hidden ${
          disabled ? "border-muted opacity-40" : "border-muted-foreground/40"
        }`}
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full touch-none ${disabled ? "pointer-events-none" : "cursor-crosshair"}`}
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
        />
        {!stroked && !disabled && (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            Sign with finger or stylus
          </span>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clearPad} disabled={!stroked}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={onCapture} disabled={!stroked}>
            Done
          </Button>
        </div>
      )}
    </div>
  )
}
