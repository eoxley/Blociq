"use client"
import { usePathname } from "next/navigation"

export function useBuildingContext() {
  const pathname = usePathname()
  // naive example: /buildings/[id]
  const m = pathname?.match(/\/buildings\/([^\/]+)/)
  return { buildingId: m?.[1] }
}
