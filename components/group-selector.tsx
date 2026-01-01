"use client"

import type { Group } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  groups: Group[]
  selectedGroup: Group | null
  onSelect: (group: Group) => void
  disabled: boolean
  groupUsageMap?: Record<number, boolean>
  usedGroups?: Set<number>
}

export function GroupSelector({
  groups,
  selectedGroup,
  onSelect,
  disabled,
  groupUsageMap,
  usedGroups,
}: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Select Group</h2>
      <div className="flex flex-wrap gap-3">
        {groups.map((group) => {
          const isOccupied = groupUsageMap?.[group.id] ?? false
          const isUsed = usedGroups?.has(group.id) ?? false
          const isDisabled = disabled || isOccupied || isUsed

          return (
            <Button
              key={group.id}
              variant="outline"
              onClick={() => onSelect(group)}
              disabled={isDisabled}
              className={cn(
                "h-auto px-6 py-4 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 relative",
                selectedGroup?.id === group.id && "border-blue-500 bg-blue-500/10",
                isOccupied && "border-red-500 bg-red-500/10 opacity-60 cursor-not-allowed",
                isUsed && "border-neutral-600 bg-neutral-800/50 opacity-50 cursor-not-allowed"
              )}
              title={
                isOccupied
                  ? "This group is currently in use on another device"
                  : isUsed
                  ? "You have already used this group on this device"
                  : ""
              }
            >
              <div className="text-left">
                <div className="font-medium flex items-center gap-2">
                  {group.title}
                  {isOccupied && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-500/30 px-2 py-1 rounded">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Occupied
                    </span>
                  )}
                  {isUsed && !isOccupied && (
                    <span className="text-xs bg-neutral-700 px-2 py-1 rounded">Used</span>
                  )}
                </div>
                <div className="text-xs text-neutral-400">
                  {group.leds.length} LEDs: {group.leds.join(", ")}
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}