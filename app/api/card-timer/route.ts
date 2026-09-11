import { NextResponse } from 'next/server'

const cycleDurationMs = 30_000

export function GET() {
  const serverTime = Date.now()
  const cycleEndsAt = serverTime - (serverTime % cycleDurationMs) + cycleDurationMs

  return NextResponse.json(
    { cycleEndsAt, serverTime },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
