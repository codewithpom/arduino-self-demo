"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { RefreshCw, Unlock, Power, CheckCircle2, XCircle, Edit, Trash2, Plus, AlertCircle } from "lucide-react"
import type { Group, GroupUsage, LedText } from "@/lib/types"

interface GroupWithUsage extends Group {
    usage?: GroupUsage
}

export default function AdminPage() {
    const [groups, setGroups] = useState<GroupWithUsage[]>([])
    const [leds, setLeds] = useState<LedText[]>([])
    const [loading, setLoading] = useState(true)
    const [monitorActive, setMonitorActive] = useState(false)
    const [cleanupLog, setCleanupLog] = useState<string[]>([])
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [ledEditDialogOpen, setLedEditDialogOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
    const [selectedLed, setSelectedLed] = useState<LedText | null>(null)
    const [editForm, setEditForm] = useState({ title: "", leds: "" })
    const [ledEditForm, setLedEditForm] = useState({ led_number: 0, title: "", description: "" })
    const supabase = createClient()

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setCleanupLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
    }

    const fetchGroups = async () => {
        try {
            const { data: groupings, error: groupError } = await supabase
                .from("grouping")
                .select("*")
                .order("title")

            if (groupError) throw groupError

            const { data: usage, error: usageError } = await supabase
                .from("group_usage")
                .select("*")

            if (usageError) throw usageError

            const { data: ledData, error: ledError } = await supabase
                .from("led-text")
                .select("*")
                .order("led_number")

            if (ledError) throw ledError

            const combined = groupings?.map(g => ({
                ...g,
                usage: usage?.find(u => u.id === g.id)
            })) || []

            setGroups(combined)
            setLeds(ledData || [])
        } catch (error) {
            console.error("Error fetching data:", error)
            addLog("❌ Error fetching data")
        } finally {
            setLoading(false)
        }
    }

    const unlockGroup = async (groupId: number, groupTitle: string) => {
        try {
            addLog(`🔓 Manually unlocking "${groupTitle}"...`)

            const response = await fetch("/api/group-cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId }),
            })

            if (!response.ok) throw new Error("Failed to unlock group")

            const result = await response.json()
            addLog(`✅ "${groupTitle}" unlocked, ${result.ledsOff} LEDs turned off`)
            await fetchGroups()
        } catch (error) {
            console.error("Error unlocking group:", error)
            addLog(`❌ Failed to unlock "${groupTitle}"`)
        }
    }

    const unlockAllGroups = async () => {
        const lockedGroups = groups.filter(g => g.usage?.busy)

        if (lockedGroups.length === 0) {
            addLog("ℹ️ No locked groups to unlock")
            return
        }

        addLog(`🔓 Unlocking all ${lockedGroups.length} locked groups...`)

        for (const group of lockedGroups) {
            await unlockGroup(group.id, group.title)
        }
    }

    const openLedEditDialog = (led?: LedText) => {
        if (led) {
            setSelectedLed(led)
            setLedEditForm({
                led_number: led.led_number,
                title: led.title,
                description: led.description
            })
        } else {
            setSelectedLed(null)
            setLedEditForm({ led_number: 0, title: "", description: "" })
        }
        setLedEditDialogOpen(true)
    }

    const handleSaveLed = async () => {
        try {
            if (!ledEditForm.led_number || ledEditForm.led_number <= 0) {
                addLog("❌ Valid LED number is required")
                return
            }

            const response = await fetch("/api/led-metadata", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ledEditForm),
            })

            if (!response.ok) throw new Error("Failed to save LED")

            addLog(`✅ Saved LED ${ledEditForm.led_number}: ${ledEditForm.title}`)
            setLedEditDialogOpen(false)
            await fetchGroups()
        } catch (error) {
            console.error("Error saving LED:", error)
            addLog(`❌ Failed to save LED ${ledEditForm.led_number}`)
        }
    }

    const handleDeleteLed = async (ledNumber: number, ledTitle: string) => {
        try {
            const response = await fetch(`/api/led-metadata?led_number=${ledNumber}`, {
                method: "DELETE",
            })

            if (!response.ok) throw new Error("Failed to delete LED")

            addLog(`✅ Deleted LED ${ledNumber}: ${ledTitle}`)
            await fetchGroups()
        } catch (error) {
            console.error("Error deleting LED:", error)
            addLog(`❌ Failed to delete LED ${ledNumber}`)
        }
    }

    const openEditDialog = (group: Group) => {
        setSelectedGroup(group)
        setEditForm({
            title: group.title,
            leds: group.leds.join(", ")
        })
        setEditDialogOpen(true)
    }

    const openDeleteDialog = (group: Group) => {
        setSelectedGroup(group)
        setDeleteDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditForm({ title: "", leds: "" })
        setCreateDialogOpen(true)
    }

    const handleCreateGroup = async () => {
        try {
            const leds = editForm.leds
                .split(",")
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n))

            if (!editForm.title || leds.length === 0) {
                addLog("❌ Title and at least one LED are required")
                return
            }

            const { error } = await supabase
                .from("grouping")
                .insert({
                    title: editForm.title,
                    leds: leds
                })

            if (error) throw error

            addLog(`✅ Created group "${editForm.title}" with ${leds.length} LEDs`)
            setCreateDialogOpen(false)
            await fetchGroups()
        } catch (error) {
            console.error("Error creating group:", error)
            addLog(`❌ Failed to create group`)
        }
    }

    const handleUpdateGroup = async () => {
        if (!selectedGroup) return

        try {
            const leds = editForm.leds
                .split(",")
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n))

            if (!editForm.title || leds.length === 0) {
                addLog("❌ Title and at least one LED are required")
                return
            }

            const { error } = await supabase
                .from("grouping")
                .update({
                    title: editForm.title,
                    leds: leds
                })
                .eq("id", selectedGroup.id)

            if (error) throw error

            addLog(`✅ Updated group "${editForm.title}"`)
            setEditDialogOpen(false)
            await fetchGroups()
        } catch (error) {
            console.error("Error updating group:", error)
            addLog(`❌ Failed to update group`)
        }
    }

    const handleDeleteGroup = async () => {
        if (!selectedGroup) return

        try {
            // First unlock if busy
            const groupWithUsage = groups.find(g => g.id === selectedGroup.id)
            if (groupWithUsage?.usage?.busy) {
                await unlockGroup(selectedGroup.id, selectedGroup.title)
            }

            // Delete from group_usage first (if exists)
            await supabase
                .from("group_usage")
                .delete()
                .eq("id", selectedGroup.id)

            // Then delete the group
            const { error } = await supabase
                .from("grouping")
                .delete()
                .eq("id", selectedGroup.id)

            if (error) throw error

            addLog(`✅ Deleted group "${selectedGroup.title}"`)
            setDeleteDialogOpen(false)
            await fetchGroups()
        } catch (error) {
            console.error("Error deleting group:", error)
            addLog(`❌ Failed to delete group`)
        }
    }

    // Setup presence monitoring
    useEffect(() => {
        const channel = supabase.channel("led-group-presence")

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState()
                console.log("[ADMIN] Presence sync:", Object.keys(state).length, "users online")
            })
            .on("presence", { event: "join" }, ({ key }) => {
                console.log("[ADMIN] User joined:", key)
            })
            .on("presence", { event: "leave" }, async ({ key, leftPresences }) => {
                console.log("[ADMIN] User left:", key, leftPresences)

                for (const presence of leftPresences) {
                    const { groupId, userCode } = presence as any

                    if (groupId && monitorActive) {
                        const group = groups.find(g => g.id === groupId)
                        const groupTitle = group?.title || `Group ${groupId}`

                        addLog(`👤 User disconnected from "${groupTitle}"`)

                        try {
                            const response = await fetch("/api/group-cleanup", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ groupId, userCode }),
                            })

                            if (response.ok) {
                                const result = await response.json()
                                addLog(`✅ Auto-cleanup: "${groupTitle}" unlocked, ${result.ledsOff} LEDs off`)
                                await fetchGroups()
                            } else {
                                throw new Error("Cleanup failed")
                            }
                        } catch (error) {
                            addLog(`❌ Auto-cleanup failed for "${groupTitle}"`)
                        }
                    }
                }
            })
            .subscribe((status) => {
                console.log("[ADMIN] Channel subscription status:", status)
                if (status === "SUBSCRIBED") {
                    addLog("🔗 Connected to presence monitoring channel")
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [monitorActive, groups])

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchGroups()
        const interval = setInterval(fetchGroups, 5000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (monitorActive) {
            addLog("🟢 Auto-cleanup monitor activated")
        } else {
            addLog("🔴 Auto-cleanup monitor deactivated")
        }
    }, [monitorActive])

    const lockedCount = groups.filter(g => g.usage?.busy).length

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">LED Group Admin Panel</h1>
                <p className="text-neutral-600">Monitor, control, and manage all LED groups</p>
            </div>

            {/* Control Bar */}
            <div className="flex gap-4 mb-6 flex-wrap">
                <Button
                    onClick={() => fetchGroups()}
                    variant="outline"
                    disabled={loading}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>

                <Button
                    onClick={unlockAllGroups}
                    variant="destructive"
                    disabled={lockedCount === 0}
                >
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock All ({lockedCount})
                </Button>

                <Button
                    onClick={() => setMonitorActive(!monitorActive)}
                    variant={monitorActive ? "default" : "outline"}
                >
                    <Power className="mr-2 h-4 w-4" />
                    Auto-Cleanup: {monitorActive ? "ON" : "OFF"}
                </Button>

                <Button
                    onClick={openCreateDialog}
                    variant="outline"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
                </Button>
            </div>

            {/* Status Alert */}
            {monitorActive && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        Auto-cleanup monitor is active. Groups will be automatically unlocked when users disconnect.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Groups List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">LED Groups ({groups.length})</h2>

                    {loading ? (
                        <div className="text-center py-8">Loading groups...</div>
                    ) : groups.length === 0 ? (
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center text-neutral-500">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="mb-4">No groups found</p>
                                    <Button onClick={openCreateDialog} variant="outline">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Your First Group
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        groups.map((group) => (
                            <Card key={group.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{group.title}</CardTitle>
                                            <CardDescription>
                                                {group.leds.length} LEDs: {group.leds.join(", ")}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {group.usage?.busy ? (
                                                <Badge variant="destructive">Locked</Badge>
                                            ) : (
                                                <Badge variant="secondary">Available</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-neutral-600">
                                            {group.usage?.busy ? (
                                                <>
                                                    <span className="font-medium">User:</span> {group.usage.user || "Unknown"}
                                                </>
                                            ) : (
                                                <span>No active user</span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {group.usage?.busy && (
                                                <Button
                                                    onClick={() => unlockGroup(group.id, group.title)}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Unlock className="mr-2 h-3 w-3" />
                                                    Unlock
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => openEditDialog(group)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                onClick={() => openDeleteDialog(group)}
                                                variant="outline"
                                                size="sm"
                                                disabled={group.usage?.busy}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Activity Log */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {cleanupLog.length === 0 ? (
                                    <div className="text-sm text-neutral-500 text-center py-4">
                                        No activity yet
                                    </div>
                                ) : (
                                    cleanupLog.map((log, index) => (
                                        <div
                                            key={index}
                                            className="text-xs font-mono bg-neutral-50 p-2 rounded border text-neutral-700"
                                        >
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* LED Metadata Management Section */}
            <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">LED Metadata ({leds.length})</h2>
                    <Button onClick={() => openLedEditDialog()} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add LED
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leds.map((led) => (
                        <Card key={led.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">LED {led.led_number}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button
                                            onClick={() => openLedEditDialog(led)}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            onClick={() => handleDeleteLed(led.led_number, led.title)}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    <div className="font-medium text-sm">{led.title || <span className="text-neutral-500 italic">No title</span>}</div>
                                    <div className="text-xs text-neutral-600">
                                        {led.description || <span className="text-neutral-500 italic">No description</span>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Get all unique LED numbers from groups */}
                    {(() => {
                        const usedLedNumbers = new Set(leds.map(l => l.led_number))
                        const allLedNumbers = new Set<number>()
                        groups.forEach(g => g.leds.forEach(led => allLedNumbers.add(led)))
                        const missingLeds = Array.from(allLedNumbers).filter(num => !usedLedNumbers.has(num)).sort((a, b) => a - b)

                        return missingLeds.map((ledNum) => (
                            <Card key={`missing-${ledNum}`} className="border-dashed border-neutral-300">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base text-neutral-500">LED {ledNum}</CardTitle>
                                        <Button
                                            onClick={() => {
                                                setLedEditForm({ led_number: ledNum, title: "", description: "" })
                                                setLedEditDialogOpen(true)
                                            }}
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-neutral-500 italic">
                                        No metadata set
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    })()}
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Group</DialogTitle>
                        <DialogDescription>
                            Make changes to the group. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Group Title</Label>
                            <Input
                                id="title"
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                placeholder="e.g., Body Parts"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="leds">LED Numbers (comma-separated)</Label>
                            <Input
                                id="leds"
                                value={editForm.leds}
                                onChange={(e) => setEditForm({ ...editForm, leds: e.target.value })}
                                placeholder="e.g., 1, 2, 3, 4"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateGroup}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                        <DialogDescription>
                            Add a new LED group to the system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-title">Group Title</Label>
                            <Input
                                id="new-title"
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                placeholder="e.g., Body Parts"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-leds">LED Numbers (comma-separated)</Label>
                            <Input
                                id="new-leds"
                                value={editForm.leds}
                                onChange={(e) => setEditForm({ ...editForm, leds: e.target.value })}
                                placeholder="e.g., 1, 2, 3, 4"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateGroup}>Create Group</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Group</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedGroup?.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteGroup}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* LED Metadata Edit Dialog */}
            <Dialog open={ledEditDialogOpen} onOpenChange={setLedEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedLed ? "Edit LED Metadata" : "Add LED Metadata"}</DialogTitle>
                        <DialogDescription>
                            Set the title and description for this LED.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="led-number">LED Number</Label>
                            <Input
                                id="led-number"
                                type="number"
                                value={ledEditForm.led_number || ""}
                                onChange={(e) => setLedEditForm({ ...ledEditForm, led_number: parseInt(e.target.value) || 0 })}
                                placeholder="e.g., 1"
                                disabled={!!selectedLed}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="led-title">Title</Label>
                            <Input
                                id="led-title"
                                value={ledEditForm.title}
                                onChange={(e) => setLedEditForm({ ...ledEditForm, title: e.target.value })}
                                placeholder="e.g., Head"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="led-description">Description</Label>
                            <Input
                                id="led-description"
                                value={ledEditForm.description}
                                onChange={(e) => setLedEditForm({ ...ledEditForm, description: e.target.value })}
                                placeholder="e.g., The top of the body"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLedEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveLed}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
