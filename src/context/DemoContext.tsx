import { createContext, useContext } from "react"

export const DemoContext = createContext(false)

export function useDemo(): boolean {
  return useContext(DemoContext)
}
