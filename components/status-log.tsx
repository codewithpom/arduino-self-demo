"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Props {
  logs: string[]
}

export function StatusLog({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Activity Log</h2>
      <ScrollArea className="h-[400px] rounded-lg border border-neutral-700 bg-neutral-900 p-4">
        <div className="space-y-1 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-neutral-500">No activity yet. Select a group to start.</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} className="text-neutral-300">
                {log}
              </p>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
