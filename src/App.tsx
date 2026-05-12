import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-svh bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hello, Andrew!</CardTitle>
          <CardDescription>
            Vite + React + TypeScript + Tailwind v4 + shadcn/ui — all working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click a button below. React updates the screen instantly.
          </p>
          <p className="mt-4 text-4xl font-semibold tabular-nums">{count}</p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={() => setCount((c) => c + 1)}>Increment</Button>
          <Button variant="destructive" onClick={() => setCount(0)}>
            Reset
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default App
