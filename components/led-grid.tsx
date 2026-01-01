"use client"

import type { LedText } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  leds: LedText[]
  activeLeds: Set<number>
  groupLeds: number[]
}

export function LedGrid({ leds, activeLeds, groupLeds }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">LED Status</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {leds.map((led) => {
          const isActive = activeLeds.has(led.led_number)
          const isInGroup = groupLeds.includes(led.led_number)

          return (
            <div
              key={led.id}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200",
                isActive
                  ? "bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/50"
                  : isInGroup
                    ? "bg-neutral-800 border-blue-500/50"
                    : "bg-neutral-900 border-neutral-700",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full mb-1 transition-all",
                  isActive ? "bg-yellow-300 shadow-[0_0_12px_4px_rgba(250,204,21,0.6)]" : "bg-neutral-700",
                )}
              />
              <span className={cn("text-xs font-mono", isActive ? "text-neutral-900 font-bold" : "text-neutral-400")}>
                {led.led_number}
              </span>
              <span
                className={cn(
                  "text-[10px] truncate w-full text-center",
                  isActive ? "text-neutral-800" : "text-neutral-500",
                )}
              >
                {led.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
