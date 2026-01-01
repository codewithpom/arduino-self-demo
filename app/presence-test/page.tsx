"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PresenceTestPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [presenceState, setPresenceState] = useState<any>({})
    const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
    const supabase = createClient()

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString()
        setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)])
    }

    const runDiagnostic = async () => {
        try {
            const response = await fetch("/api/diagnostic")
            const data = await response.json()
            setDiagnosticResult(data)
            addLog("✅ Diagnostic complete")
        } catch (error) {
            addLog(`❌ Diagnostic failed: ${error}`)
        }
    }

    useEffect(() => {
        addLog("🔄 Setting up presence channel...")
        const channel = supabase.channel("led-group-presence")

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState()
                setPresenceState(state)
                addLog(`🔄 Presence sync: ${Object.keys(state).length} users online`)
            })
            .on("presence", { event: "join" }, ({ key, newPresences }) => {
                addLog(`➕ User joined: ${key}`)
            })
            .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
                addLog(`➖ User left: ${key}`)
                addLog(`   Data: ${JSON.stringify(leftPresences)}`)
            })
            .subscribe(async (status) => {
                addLog(`📡 Subscription status: ${status}`)
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        testUser: true,
                        groupId: null,
                        userCode: null,
                    })
                    addLog("✅ Tracking started")
                }
            })

        return () => {
            addLog("🔌 Unsubscribing from channel")
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Presence System Test</h1>

            <div className="grid gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Diagnostic</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={runDiagnostic}>Run Diagnostic Test</Button>
                        {diagnosticResult && (
                            <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
                                {JSON.stringify(diagnosticResult, null, 2)}
                            </pre>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Current Presence State</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm">
                            <strong>Users Online:</strong> {Object.keys(presenceState).length}
                        </div>
                        <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(presenceState, null, 2)}
                        </pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 max-h-96 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="text-xs font-mono bg-gray-50 p-2 rounded">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="font-semibold mb-2">How to Test:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open this page in multiple browser tabs/windows</li>
                    <li>Watch the "Users Online" count increase</li>
                    <li>Close one tab and watch for the "User left" event</li>
                    <li>Check if the presence state updates correctly</li>
                    <li>Run diagnostic to check if realtime is working</li>
                </ol>
            </div>
        </div>
    )
}
