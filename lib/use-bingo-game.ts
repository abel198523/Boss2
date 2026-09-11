'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

type Cell = number | 'star'
type ServerCard = { id?: number; cardNumber: number; grid: Cell[] }
type Round = { id: number; status: string; calls: Array<{ number: number }>; pot: string; takenCardNumbers: number[] }

const configuredApiBase = process.env.NEXT_PUBLIC_BINGO_API_URL?.trim()
const apiBase = (configuredApiBase || 'https://flash-bingo-api-44yi.onrender.com').replace(/\/$/, '')

function telegramHeaders() {
  if (typeof window === 'undefined') return {}
  const initData = window.Telegram?.WebApp?.initData
  return initData ? { 'x-telegram-init-data': initData } : {}
}

export function useBingoGame() {
  const [round, setRound] = useState<Round | null>(null)
  const [cards, setCards] = useState<Array<{ id: number; grid: Cell[] }>>([])
  const [connected, setConnected] = useState(false)
  const socketRound = useRef<{ id: number; calls: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`${apiBase}/api/bingo/round`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Round request failed: ${response.status}`)
        const nextRound = await response.json() as Round
        const cardResponse = await fetch(`${apiBase}/api/bingo/cards`, { headers: telegramHeaders(), cache: 'no-store' })
        const cardData = cardResponse.ok ? await cardResponse.json() as { cards: ServerCard[] } : { cards: [] }
        if (cancelled) return
        const live = socketRound.current
        if (!live || live.id !== nextRound.id || live.calls <= nextRound.calls.length) setRound(nextRound)
        setCards(cardData.cards.map((card) => ({ id: card.cardNumber, grid: card.grid })))
        setConnected(true)
      } catch {
        if (!cancelled) setConnected(false)
      }
    }

    void load()
    const timer = window.setInterval(load, 3000)
    const socket = io(apiBase || undefined, { path: '/api/socket.io', transports: ['websocket', 'polling'], reconnection: true })
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('game_state', (state: { roundId: number; calledBalls: number[]; netPrizePool: number; cardsTaken?: number[]; phase: string }) => {
      socketRound.current = { id: state.roundId, calls: state.calledBalls.length }
      setRound({ id: state.roundId, status: state.phase, calls: state.calledBalls.map((number) => ({ number })), pot: String(state.netPrizePool), takenCardNumbers: state.cardsTaken ?? [] })
    })
    return () => { cancelled = true; window.clearInterval(timer); socket.disconnect() }
  }, [])

  const calledNumbers = useMemo(() => new Set(round?.calls.map((call) => call.number) ?? []), [round])
  const currentBall = round?.calls.at(-1)?.number ?? null
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`${apiBase}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', ...telegramHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error ?? `Request failed: ${response.status}`)
    return data
  }
  const reserveCards = (cardNumbers: number[]) => request('/api/bingo/cards', { cardNumbers })
  const reserveCard = (cardNumber: number) => request('/api/bingo/cards/reserve', { cardNumber })
  const releaseCard = (cardNumber: number) => request('/api/bingo/cards/release', { cardNumber })
  const claimWinner = (roundId: number, cardNumber: number) => request('/api/bingo/claim', { roundId, cardNumber })
  return { connected, round, cards, calledNumbers, currentBall, reserveCards, reserveCard, releaseCard, claimWinner, refresh: () => window.location.reload() }
}
