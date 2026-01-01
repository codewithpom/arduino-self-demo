import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
    try {
        const { groupId, busy } = await request.json()

        if (groupId === undefined || typeof busy !== "boolean") {
            return NextResponse.json(
                { error: "groupId and busy status are required" },
                { status: 400 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Upsert group_usage record
        const { data, error } = await supabase
            .from("group_usage")
            .upsert(
                {
                    id: groupId,
                    busy,
                },
                { onConflict: "id" }
            )
            .select()

        if (error) {
            console.error("Database error:", error)
            return NextResponse.json({ error: "Failed to update group usage" }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error("Group Usage API Error:", error)
        return NextResponse.json({ error: "Failed to update group usage" }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const groupId = request.nextUrl.searchParams.get("groupId")

        if (!groupId) {
            return NextResponse.json({ error: "groupId is required" }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase
            .from("group_usage")
            .select("*")
            .eq("id", parseInt(groupId))
            .single()

        if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows found
            console.error("Database error:", error)
            return NextResponse.json({ error: "Failed to fetch group usage" }, { status: 500 })
        }

        return NextResponse.json({
            data: data || { id: parseInt(groupId), busy: false },
        })
    } catch (error) {
        console.error("Group Usage GET API Error:", error)
        return NextResponse.json({ error: "Failed to fetch group usage" }, { status: 500 })
    }
}
