import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Test 1: Fetch all groups
        const { data: allGroups, error: groupFetchError } = await supabase
            .from("grouping")
            .select("*")

        if (groupFetchError) {
            console.error("Group fetch error:", groupFetchError)
            return NextResponse.json({ error: "Failed to fetch grouping", details: groupFetchError }, { status: 500 })
        }

        // Test 2: Fetch all group_usage records
        const { data: allUsage, error: usageFetchError } = await supabase
            .from("group_usage")
            .select("*")

        if (usageFetchError) {
            console.error("Usage fetch error:", usageFetchError)
            return NextResponse.json({ error: "Failed to fetch group_usage", details: usageFetchError }, { status: 500 })
        }

        // Test 3: Initialize missing group_usage records
        const groupIds = (allGroups || []).map((g: any) => g.id)
        const existingUsageIds = (allUsage || []).map((u: any) => u.id)
        const missingIds = groupIds.filter((id: number) => !existingUsageIds.includes(id))

        let initialized = 0
        if (missingIds.length > 0) {
            const { error: initError } = await supabase
                .from("group_usage")
                .insert(
                    missingIds.map((id: number) => ({
                        id,
                        busy: false,
                    }))
                )

            if (initError) {
                console.error("Init error:", initError)
                return NextResponse.json({ error: "Failed to initialize group_usage", details: initError }, { status: 500 })
            }
            initialized = missingIds.length
        }

        // Fetch updated usage records
        const { data: updatedUsage } = await supabase
            .from("group_usage")
            .select("*")

        // Test 4: Test realtime channel subscription
        const testChannel = supabase.channel('diagnostic-test-channel')

        const channelTest = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                supabase.removeChannel(testChannel)
                resolve({
                    success: false,
                    error: 'Channel subscription timeout',
                    message: 'Realtime might not be enabled in Supabase'
                })
            }, 5000)

            testChannel.subscribe((status) => {
                clearTimeout(timeout)
                supabase.removeChannel(testChannel)

                resolve({
                    success: status === 'SUBSCRIBED',
                    status,
                    message: status === 'SUBSCRIBED' ? 'Realtime is working' : 'Realtime subscription failed'
                })
            })
        })

        return NextResponse.json({
            success: true,
            groups: allGroups,
            groupUsage: updatedUsage,
            initialized,
            realtimeTest: channelTest,
            message: "Database diagnostic complete",
        })
    } catch (error) {
        console.error("Diagnostic error:", error)
        return NextResponse.json({ error: "Failed to run diagnostic", details: error }, { status: 500 })
    }
}
