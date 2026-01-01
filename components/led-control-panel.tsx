"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createClient } from "@/lib/client"
import { getCookie, setCookie } from "@/lib/cookies"
import type { Group, LedText, GroupUsage } from "@/lib/types"
import { GroupSelector } from "./group-selector"
import { LedGrid } from "./led-grid"
import { StatusLog } from "./status-log"
import { Button } from "@/components/ui/button"

interface Props {
  groups: Group[]
  leds: LedText[]
}

export function LedControlPanel({ groups, leds }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [activeLeds, setActiveLeds] = useState<Set<number>>(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState<string>("")
  const [groupUsageMap, setGroupUsageMap] = useState<Record<number, boolean>>({})
  const [usedGroups, setUsedGroups] = useState<Set<number>>(new Set())
  const abortRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const usageSubscriptionRef = useRef<any>(null)
  const lockedGroupRef = useRef<number | null>(null)
  const presenceChannelRef = useRef<any>(null)
  const userCodeRef = useRef<string | null>(null)

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  useEffect(() => {
    const cookie = getCookie("usedGroups")
    if (cookie) {
      const usedGroupIds = new Set(cookie.split(",").map(Number))
      setUsedGroups(usedGroupIds)
    }
  }, [])

  // Setup presence channel to track user connection status
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel("led-group-presence")

    presenceChannelRef.current = channel

    // Track presence and sync state
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        console.log("[LED-PANEL] Presence sync:", Object.keys(state).length, "users online")
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("[LED-PANEL] User joined:", key)
      })
      .on("presence", { event: "leave" }, async ({ key, leftPresences }) => {
        console.log("[LED-PANEL] User left:", key, leftPresences)

        // Check if any leaving user had a locked group
        for (const presence of leftPresences) {
          if (presence.groupId && presence.userCode) {
            console.log(`[LED-PANEL] Cleaning up group ${presence.groupId} for disconnected user`)

            // Call cleanup API to turn off LEDs and unlock group
            try {
              await fetch("/api/group-cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  groupId: presence.groupId,
                  userCode: presence.userCode
                }),
              })
              addLog(`Auto-cleanup: Group ${presence.groupId} unlocked due to user disconnect`)
            } catch (err) {
              console.error("[LED-PANEL] Failed to cleanup group:", err)
            }
          }
        }
      })
      .subscribe(async (status) => {
        console.log("[LED-PANEL] Channel subscription status:", status)
        if (status === "SUBSCRIBED") {
          // Track initial presence
          await channel.track({
            online_at: new Date().toISOString(),
            groupId: null,
            userCode: null,
          })
          console.log("[LED-PANEL] Initial presence tracked")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [addLog])

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

  // Handle cleanup on page unload (refresh, close, or disconnect)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Untrack presence before leaving (this will trigger the leave event for other clients)
      if (presenceChannelRef.current) {
        try {
          await presenceChannelRef.current.untrack()
        } catch (err) {
          console.error("Failed to untrack presence:", err)
        }
      }

      // Unlock group if one is currently locked
      if (lockedGroupRef.current !== null) {
        try {
          await fetch("/api/group-lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: lockedGroupRef.current, action: "unlock" }),
            // Use keepalive to ensure request completes even if page is unloading
            keepalive: true,
          })
        } catch (err) {
          console.error("Failed to unlock group on unload:", err)
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("unload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("unload", handleBeforeUnload)
    }
  }, [])

  // Poll for group_usage changes (more reliable than realtime)
  // Run once on mount and never again to keep the interval alive
  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const pollGroupStatus = async () => {
      try {
        console.log("Polling for group_usage...")
        const { data, error } = await supabase
          .from("group_usage")
          .select("*")

        console.log("Poll response - data:", data, "error:", error)

        if (error) {
          console.error("Poll error:", error)
          return
        }

        if (!isMounted) return

        console.log("Poll result:", data, "Count:", data?.length || 0)

        if (!data || data.length === 0) {
          console.warn("No group_usage records found")
          return
        }

        // Update state from poll
        const newMap: Record<number, boolean> = {}
        data?.forEach((record: GroupUsage) => {
          newMap[record.id] = record.busy
        })

        setGroupUsageMap((prev) => {
          const hasChanges = Object.keys(newMap).some(
            (key) => newMap[parseInt(key)] !== prev[parseInt(key)]
          )
          if (hasChanges) {
            console.log("Group usage changed:", newMap)
            // Log changes
            Object.entries(newMap).forEach(([id, busy]) => {
              if (busy !== prev[parseInt(id)]) {
                console.log(`Group ${id} is now ${busy ? "busy" : "available"}`)
              }
            })
          }
          return newMap
        })
      } catch (err) {
        console.error("Poll exception:", err)
      }
    }

    // Initial poll
    pollGroupStatus()

    // Poll every 2 seconds
    const interval = setInterval(pollGroupStatus, 2000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Send command via REST API
  const sendLedCommand = useCallback(
    async (command: string, groupId: number) => {
      try {
        const response = await fetch("/api/led-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, groupId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to send command")
        }

        return await response.json()
      } catch (err) {
        addLog(`LED Command Error: ${err}`)
        throw err
      }
    },
    [addLog]
  )

  // Atomically lock/unlock group (prevents race conditions)
  const lockGroup = useCallback(
    async (groupId: number, action: "lock" | "unlock") => {
      try {
        const response = await fetch("/api/group-lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, action }),
        })

        const result = await response.json()

        if (!response.ok) {
          // 409 Conflict = group is locked by another device
          if (response.status === 409) {
            throw new Error(`Group is locked by another device`)
          }
          throw new Error(result.error || "Failed to manage group lock")
        }

        if (action === "lock" && !result.locked) {
          throw new Error("Failed to acquire lock on group")
        }

        // Track the locked group for cleanup on unload
        if (action === "lock") {
          lockedGroupRef.current = groupId
          userCodeRef.current = result.code || null

          // Update presence to include locked group info
          if (presenceChannelRef.current) {
            await presenceChannelRef.current.track({
              online_at: new Date().toISOString(),
              groupId: groupId,
              userCode: result.code,
            })
          }
        } else if (action === "unlock") {
          lockedGroupRef.current = null
          userCodeRef.current = null

          // Update presence to clear locked group info
          if (presenceChannelRef.current) {
            await presenceChannelRef.current.track({
              online_at: new Date().toISOString(),
              groupId: null,
              userCode: null,
            })
          }
        }

        return result
      } catch (err) {
        addLog(`Group Lock Error: ${err}`)
        throw err
      }
    },
    [addLog]
  )

  const playTTS = useCallback(
    async (text: string): Promise<void> => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          throw new Error("TTS request failed")
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        return new Promise((resolve, reject) => {
          const audio = new Audio(audioUrl)
          audioRef.current = audio

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl)
            audioRef.current = null
            resolve()
          }

          audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl)
            audioRef.current = null
            addLog(`TTS Error: ${e}`)
            reject(e)
          }

          audio.play().catch(reject)
        })
      } catch (error) {
        addLog(`TTS Error: ${error}`)
        throw error
      }
    },
    [addLog],
  )

  const runSequence = useCallback(
    async (group: Group) => {
      if (isRunning) return

      if (usedGroups.has(group.id)) {
        addLog(`Group "${group.title}" has already been used on this device.`)
        return
      }

      abortRef.current = false
      setIsRunning(true)
      setLogs([])
      setActiveLeds(new Set())

      const groupLeds = group.leds
      const ledInfoMap = new Map(leds.map((l) => [l.led_number, l]))
      let lockAcquired = false

      try {
        // Atomically attempt to lock the group
        addLog(`Attempting to lock group "${group.title}"...`)
        await lockGroup(group.id, "lock")
        lockAcquired = true
        addLog(`Successfully locked group "${group.title}"`)

        // Phase 1: Turn all group LEDs ON
        setCurrentPhase("Activating all LEDs")
        addLog(`Starting sequence for ${group.title}`)

        for (const ledNum of groupLeds) {
          if (abortRef.current) throw new Error("Aborted")
          await sendLedCommand(`ON:${ledNum}`, group.id)
          setActiveLeds((prev) => new Set([...prev, ledNum]))
          addLog(`Sent: ON:${ledNum}`)
          await delay(100)
        }

        // Phase 2: Announce group selection
        setCurrentPhase("Announcing group")
        addLog(`Announcing: ${group.title} has been selected`)
        await playTTS(`${group.title} has been selected`)

        // Phase 3: Turn all group LEDs OFF
        setCurrentPhase("Deactivating all LEDs")
        for (const ledNum of groupLeds) {
          if (abortRef.current) throw new Error("Aborted")
          await sendLedCommand(`OFF:${ledNum}`, group.id)
          setActiveLeds((prev) => {
            const next = new Set(prev)
            next.delete(ledNum)
            return next
          })
          addLog(`Sent: OFF:${ledNum}`)
          await delay(100)
        }

        // Phase 4: Individual LED sequence
        setCurrentPhase("Individual LED sequence")
        for (const ledNum of groupLeds) {
          if (abortRef.current) throw new Error("Aborted")

          const ledInfo = ledInfoMap.get(ledNum)
          const ledName = ledInfo?.title || `LED ${ledNum}`
          const ledDescription = ledInfo?.description || ""

          // Turn LED ON
          await sendLedCommand(`ON:${ledNum}`, group.id)
          setActiveLeds(new Set([ledNum]))
          addLog(`Sent: ON:${ledNum}`)

          // Speak about the LED
          const speechText = ledDescription ? `${ledName}. ${ledDescription}` : ledName
          addLog(`Speaking: ${speechText}`)
          await playTTS(speechText)

          // Turn LED OFF
          await sendLedCommand(`OFF:${ledNum}`, group.id)
          setActiveLeds(new Set())
          addLog(`Sent: OFF:${ledNum}`)

          await delay(300)
        }

        setCurrentPhase("Complete")
        addLog("Sequence completed successfully")
        const newUsedGroups = new Set(usedGroups)
        newUsedGroups.add(group.id)
        setUsedGroups(newUsedGroups)
        setCookie("usedGroups", Array.from(newUsedGroups).join(","), 365)
      } catch (error) {
        if ((error as Error).message === "Aborted") {
          addLog("Sequence aborted by user")
        } else {
          addLog(`Error: ${error}`)
        }
      } finally {
        // Release lock if we acquired it
        if (lockAcquired) {
          try {
            await lockGroup(group.id, "unlock")
            addLog(`Released lock on group "${group.title}"`)
          } catch (unlockErr) {
            addLog(`Failed to release lock: ${unlockErr}`)
          }
        }
        setIsRunning(false)
        setActiveLeds(new Set())
        setCurrentPhase("")
      }
    },
    [isRunning, leds, sendLedCommand, playTTS, addLog, lockGroup, usedGroups]
  )

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group)
    runSequence(group)
  }

  const handleAbort = () => {
    abortRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <GroupSelector
          groups={groups}
          selectedGroup={selectedGroup}
          onSelect={handleGroupSelect}
          disabled={isRunning}
          groupUsageMap={groupUsageMap}
          usedGroups={usedGroups}
        />

        <LedGrid leds={leds} activeLeds={activeLeds} groupLeds={selectedGroup?.leds || []} />

        {isRunning && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-neutral-400">{currentPhase}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleAbort}>
              Abort
            </Button>
          </div>
        )}
      </div>

      <StatusLog logs={logs} />
    </div>
  )
}
