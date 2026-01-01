import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
    try {
        const { groupId, userCode } = await request.json()

        if (!groupId) {
            return NextResponse.json(
                { error: "groupId is required" },
                { status: 400 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get the group details to know which LEDs to turn off
        const { data: group, error: groupError } = await supabase
            .from("grouping")
            .select("leds")
            .eq("id", groupId)
            .single()

        if (groupError) {
            console.error("Group fetch error:", groupError)
            return NextResponse.json(
                { error: "Group not found" },
                { status: 404 }
            )
        }

        // Turn off all LEDs in the group
        const channel = supabase.channel("led-commands")

        await new Promise<void>((resolve, reject) => {
            channel.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    const promises = group.leds.map((ledNum: number) => {
                        return channel.send({
                            type: "broadcast",
                            event: "led-command",
                            payload: { command: `OFF:${ledNum}`, groupId },
                        })
                    })

                    Promise.all(promises)
                        .then(() => {
                            supabase.removeChannel(channel)
                            resolve()
                        })
                        .catch(reject)
                }
            })

            // Timeout after 5 seconds
            setTimeout(() => {
                supabase.removeChannel(channel)
                reject(new Error("Channel subscription timeout"))
            }, 5000)
        })

        // Unlock the group
        const { error: unlockError } = await supabase
            .from("group_usage")
            .update({ busy: false, user: null })
            .eq("id", groupId)
            .select()

        if (unlockError) {
            console.error("Unlock error:", unlockError)
            return NextResponse.json(
                { error: "Failed to unlock group" },
                { status: 500 }
            )
        }

        console.log(`Group ${groupId} cleaned up successfully (LEDs turned off and unlocked)`)

        return NextResponse.json({
            success: true,
            message: "Group cleaned up successfully",
            ledsOff: group.leds.length,
        })
    } catch (error) {
        console.error("Group Cleanup API Error:", error)
        return NextResponse.json(
            { error: "Failed to cleanup group" },
            { status: 500 }
        )
    }
}
