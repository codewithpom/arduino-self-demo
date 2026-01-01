import { createClient } from "@/lib/server"
import { LedControlPanel } from "@/components/led-control-panel"
import type { Group, LedText } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function Home() {
  const supabase = await createClient()

  const [groupsResult, ledsResult] = await Promise.all([
    supabase.from("grouping").select("*").order("id"),
    supabase.from("led-text").select("*").order("led_number"),
  ])

  const groups: Group[] = groupsResult.data || []
  const leds: LedText[] = ledsResult.data || []

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">LED Control System</h1>
          <p className="text-neutral-400 mt-2">Select a group to start the LED sequence</p>
        </header>

        {groups.length === 0 && leds.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-neutral-400">No data found. Please ensure your database tables have data.</p>
            <p className="text-neutral-500 text-sm mt-2">
              Tables needed: &quot;grouping&quot; and &quot;led-text&quot;
            </p>
          </div>
        ) : (
          <LedControlPanel groups={groups} leds={leds} />
        )}
      </div>
    </main>
  )
}