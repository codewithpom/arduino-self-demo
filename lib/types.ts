export interface Group {
  id: number
  title: string
  leds: number[]
  created_at: string
}

export interface LedText {
  id: number
  led_number: number
  title: string
  description: string
  created_at: string
}

export interface GroupUsage {
  id: number
  busy: boolean
  user?: string
}

export type LedCommand = `ON:${number}` | `OFF:${number}`