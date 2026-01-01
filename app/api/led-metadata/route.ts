import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { led_number, title, description } = body

        if (typeof led_number !== "number") {
            return NextResponse.json(
                { error: "led_number is required and must be a number" },
                { status: 400 }
            )
        }

        // Update or insert LED metadata
        const { data, error } = await supabase
            .from("led-text")
            .upsert(
                {
                    led_number,
                    title: title || "",
                    description: description || "",
                },
                {
                    onConflict: "led_number",
                }
            )
            .select()
            .single()

        if (error) {
            console.error("Error updating LED metadata:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error("Error in LED metadata update:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const led_number = parseInt(searchParams.get("led_number") || "")

        if (isNaN(led_number)) {
            return NextResponse.json(
                { error: "led_number is required" },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from("led-text")
            .delete()
            .eq("led_number", led_number)

        if (error) {
            console.error("Error deleting LED metadata:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in LED metadata delete:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
