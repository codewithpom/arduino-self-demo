import { type NextRequest, NextResponse } from "next/server"
// @ts-ignore - gtts types
import gTTS from "gtts"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const gtts = new gTTS(text, "en")

    // Convert gtts stream to buffer
    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = gtts.stream()

      stream.on("data", (chunk: Buffer) => chunks.push(chunk))
      stream.on("end", () => resolve(Buffer.concat(chunks)))
      stream.on("error", reject)
    })

    // Convert Buffer to ArrayBuffer for NextResponse compatibility
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength
    )

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("TTS API Error:", error)
    return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 })
  }
}
