import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
    try {
        const { command, groupId } = await request.json()

        if (!command || typeof command !== "string") {
            return NextResponse.json({ error: "Command is required" }, { status: 400 })
        }

        // Create Supabase client with service role (for server-side operations)
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get the realtime channel for led-commands and broadcast
        const channel = supabase.channel("led-commands")

        await new Promise<void>((resolve, reject) => {
            channel.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    channel
                        .send({
                            type: "broadcast",
                            event: "led-command",
                            payload: { command, groupId },
                        })
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

        return NextResponse.json({ success: true, command })
    } catch (error) {
        console.error("LED Command API Error:", error)
        return NextResponse.json({ error: "Failed to send command" }, { status: 500 })
    }
}
