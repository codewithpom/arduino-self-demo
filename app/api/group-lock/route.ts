import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
    try {
        const { groupId, action } = await request.json()

        if (groupId === undefined || !["lock", "unlock"].includes(action)) {
            return NextResponse.json(
                { error: "groupId and action (lock/unlock) are required" },
                { status: 400 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        if (action === "lock") {
            // Atomically check if group is free and lock it
            // First, verify the group exists in grouping table
            const { data: groupExists, error: groupCheckError } = await supabase
                .from("grouping")
                .select("id")
                .eq("id", groupId)
                .single()

            if (groupCheckError) {
                console.error("Group check error:", groupCheckError)
                return NextResponse.json(
                    { error: "Group not found" },
                    { status: 404 }
                )
            }

            // Now check current state of group_usage
            const { data: currentData, error: fetchError } = await supabase
                .from("group_usage")
                .select("busy")
                .eq("id", groupId)
                .single()

            if (fetchError && fetchError.code !== "PGRST116") {
                // PGRST116 means row doesn't exist, which is fine (treat as not busy)
                console.error("Fetch error:", fetchError)
                return NextResponse.json(
                    { error: "Failed to check group status" },
                    { status: 500 }
                )
            }

            const isCurrentlyBusy = currentData?.busy ?? false

            if (isCurrentlyBusy) {
                // Group is already locked by another device
                return NextResponse.json(
                    { success: false, locked: true, message: "Group is locked by another device" },
                    { status: 409 }
                )
            }

            // Group is free, now lock it and generate a random code
            const randomCode = Math.random().toString(36).substring(2, 10);
            const { data: lockData, error: lockError } = await supabase
                .from("group_usage")
                .upsert(
                    {
                        id: groupId,
                        busy: true,
                        user: randomCode,
                    },
                    { onConflict: "id" }
                )
                .select()

            if (lockError) {
                console.error("Lock error:", lockError)
                return NextResponse.json(
                    { error: "Failed to lock group" },
                    { status: 500 }
                )
            }

            console.log("Group locked successfully:", lockData)

            return NextResponse.json({
                success: true,
                locked: true,
                message: "Group locked successfully",
                code: randomCode,
                data: lockData,
            })
        } else if (action === "unlock") {
            // Unlock the group and clear the user code
            const { data: unlockData, error: unlockError } = await supabase
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

            console.log("Group unlocked successfully:", unlockData)

            return NextResponse.json({
                success: true,
                locked: false,
                message: "Group unlocked successfully",
                data: unlockData,
            })
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Group Lock API Error:", error)
        return NextResponse.json(
            { error: "Failed to manage group lock" },
            { status: 500 }
        )
    }
}