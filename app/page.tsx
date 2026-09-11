'use client'

import { useEffect, useMemo, useState } from 'react'
import { Crown, Headphones, Menu, RefreshCw, Trophy, WalletCards, Volume2 } from 'lucide-react'
import { useBingoGame } from '@/lib/use-bingo-game'

const previewCalledNumbers = new Set([10, 16, 18, 20, 27, 29, 34, 35, 41, 45, 50, 54, 56, 60, 61, 62, 64, 75])

const cards = [
  { id: 357, progress: '10/25', rows: [[11, 25, 31, 56, 66], [5, 27, 39, 49, 61], [10, 20, '★', 46, 65], [15, 23, 45, 54, 71], [13, 18, 32, 48, 67]] },
  { id: 359, progress: '6/25', rows: [[11, 23, 39, 58, 75], [6, 30, 43, 48, 70], [12, 19, '★', 54, 64], [8, 29, 36, 51, 61], [14, 20, 44, 55, 63]] },
]

export default function Page() {
  const [activeTab, setActiveTab] = useState('BINGO')
  const [screen, setScreen] = useState<'landing' | 'game' | 'cards'>('landing')
  const [cardTimer, setCardTimer] = useState(30)
  const [room, setRoom] = useState('New venom edit')
  const [lastCall, setLastCall] = useState(62)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sound, setSound] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectingCards, setSelectingCards] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [actionMessage, setActionMessage] = useState('')
  const { connected, round, cards: liveCards, calledNumbers: liveCalledNumbers, currentBall, reserveCards, refresh } = useBingoGame()

  const numbers = useMemo(() => Array.from({ length: 75 }, (_, index) => index + 1), [])
  const calledNumbers = liveCalledNumbers.size ? liveCalledNumbers : previewCalledNumbers
  const recentCalls = Array.from(calledNumbers).slice(-4).reverse()
  const selectedPreviewCards = useMemo(() => Array.from(selectedCards).map((cardNumber) => {
    const seed = cardNumber * 17
    const values = Array.from({ length: 24 }, (_, index) => ((seed + index * 13) % 75) + 1)
    return { id: cardNumber, progress: '0/25', rows: [values.slice(0, 5), values.slice(5, 10), [values[10], values[11], '★', values[12], values[13]], values.slice(14, 19), values.slice(19, 24)] }
  }), [selectedCards])
  const activeCards = selectingCards ? selectedPreviewCards : liveCards.length ? liveCards.map((card) => ({ id: card.id, progress: `${card.grid.filter((cell) => cell === 'star' || calledNumbers.has(Number(cell))).length}/25`, rows: Array.from({ length: 5 }, (_, row) => card.grid.slice(row * 5, row * 5 + 5).map((cell) => cell === 'star' ? '★' : cell)) })) : cards
  const displayCall = currentBall ?? lastCall

  useEffect(() => {
    if (screen !== 'landing') return
    const autoAdvance = window.setTimeout(enterCardSelection, 10000)
    return () => window.clearTimeout(autoAdvance)
  }, [screen])

  useEffect(() => {
    if (screen !== 'cards') return

    let timer: number | undefined
    let cancelled = false

    const synchronizeTimer = async () => {
      const response = await fetch('/api/card-timer', { cache: 'no-store' })
      const { cycleEndsAt, serverTime } = await response.json() as { cycleEndsAt: number; serverTime: number }
      const serverOffset = serverTime - Date.now()
      const updateTimer = () => setCardTimer(Math.max(0, Math.ceil((cycleEndsAt - (Date.now() + serverOffset)) / 1000)))

      if (cancelled) return
      updateTimer()
      timer = window.setInterval(updateTimer, 250)
    }

    void synchronizeTimer()
    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [screen])

  useEffect(() => {
    if (screen === 'cards' && cardTimer === 0 && (selectedCards.size > 0 || liveCards.length > 0 || (round?.takenCardNumbers.length ?? 0) > 0)) setScreen('game')
  }, [cardTimer, liveCards.length, round?.takenCardNumbers.length, screen, selectedCards.size])

  function enterCardSelection() {
    setActionMessage('')
    setSelectingCards(true)
    setCardTimer(30)
    setScreen('cards')
  }

  function refreshGame() {
    setRefreshing(true)
    refresh()
    window.setTimeout(() => setRefreshing(false), 650)
  }

  function toggleCard(cardNumber: number) {
    setSelectedCards((current) => {
      const next = new Set(current)
      if (next.has(cardNumber)) next.delete(cardNumber)
      else if (next.size < 4) next.add(cardNumber)
      return next
    })
  }

  async function buySelectedCards() {
    if (!selectedCards.size) return
    setActionMessage('')
    try {
      await reserveCards(Array.from(selectedCards))
      setActionMessage(`${selectedCards.size} card(s) reserved successfully`)
      setSelectingCards(false)
      setSelectedCards(new Set())
      setScreen('cards')
      refresh()
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Card purchase failed')
    }
  }

  return (
    <main className="bingo-shell">
      <div className="bingo-glow bingo-glow-one" />
      <div className="bingo-glow bingo-glow-two" />
      <div className="device-status"><span>6:17 PM</span><div><b>22.2</b><small>K/S</small><b>4G</b><span className="signal">▮▮▮</span><b>4G</b><span className="battery">35</span><span>ϟ</span></div></div>
      <header className="topbar">
        <button className="icon-button menu-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={34} strokeWidth={2.6} /></button>
        <div className="brand" aria-label="Bingo home">
          <div className="brand-balls"><span>75</span><span>B</span><span>G</span></div>
          <div className="brand-title"><i>B</i><i>I</i><i>N</i><i>G</i><i>O</i></div>
          <div className="brand-tagline">Play • Win • Be Happy</div>
        </div>
        <button className="room-picker" onClick={() => setRoom(room === 'New venom edit' ? 'Lucky room' : 'New venom edit')}><Crown size={28} fill="currentColor" /><strong>{room}</strong><span className="chevron">⌄</span><span className="dots">⋮</span></button>
      </header>
      {menuOpen && <div className="menu-popover"><strong>Game menu</strong><span>Rules & prizes</span><span>Invite players</span><span>Settings</span></div>}

      <section className="status-panel">
        <div className="live-pill"><span /> {connected ? 'LIVE' : 'OFFLINE'}</div>
        <div className="metric-pill prize-stat"><div className="metric-copy"><span className="stat-label">PRIZE POOL</span><strong><span className="coin">$</span>{round?.pot ?? '32.00'}</strong></div></div>
        <div className="metric-pill players-stat"><span className="people-icon">♟♟</span><div className="metric-copy"><span className="stat-label">Players</span><strong>{round?.takenCardNumbers.length ?? 4}</strong></div></div>
        <button className="refresh-button" onClick={refreshGame}><RefreshCw size={27} className={refreshing ? 'spin' : ''} /><span>REFRESH</span></button>
      </section>

      <div className={`screen-stage ${screen === 'landing' ? 'show-landing' : screen === 'game' ? 'show-game' : 'show-cards'}`}>
        <section className="screen-panel landing-screen" aria-hidden={screen !== 'landing'}><div className="landing-content"><div className="landing-kicker"><span /> WELCOME TO THE ROOM <span /></div><h1>Play. Win.<br /><em>Be Happy.</em></h1><p>Join the live Bingo round, choose your cards, and follow every call in real time.</p><div className="landing-actions"><button type="button" className="landing-primary" onClick={enterCardSelection}>PLAY BINGO</button></div><div className="landing-stats"><span><strong>{round?.pot ?? '32.00'}</strong><small>PRIZE POOL</small></span><span><strong>{round?.takenCardNumbers.length ?? 4}</strong><small>PLAYERS</small></span><span><strong>75</strong><small>NUMBERS</small></span></div></div></section>
        <section className="screen-panel cards-screen" aria-hidden={screen !== 'cards'}><div className="screen-heading"><button type="button" className="flow-back" onClick={() => setScreen('landing')}>BACK</button><div><span>CHOOSE YOUR CARDS</span><strong>Round starts when the timer ends</strong></div></div><div className="card-timer-track"><span style={{ width: `${(cardTimer / 30) * 100}%` }} /></div><div className="selection-status">{cardTimer > 0 ? 'Select at least one card before the countdown ends.' : 'Starting the live game...'}</div>{selectingCards && <section className="card-selection-panel panel-edge"><div className="selection-heading"><div><strong>SELECT YOUR CARDS</strong><span>Choose up to 4 cards · 1.00 each</span></div><b>{selectedCards.size}/4</b></div><div className="card-grid-countdown card-countdown" aria-live="polite"><small>STARTS IN</small><strong>00:{String(cardTimer).padStart(2, '0')}</strong></div><div className="selection-grid">{Array.from({ length: 300 }, (_, index) => index + 1).map((cardNumber) => { const taken = round?.takenCardNumbers.includes(cardNumber); const selected = selectedCards.has(cardNumber); return <button type="button" key={cardNumber} disabled={taken} className={`${selected ? 'selected' : ''} ${taken ? 'taken' : ''}`} onClick={() => toggleCard(cardNumber)}>{cardNumber}</button> })}</div><button className="purchase-button" disabled={!selectedCards.size} onClick={() => void buySelectedCards()}>BUY SELECTED CARDS</button>{actionMessage && <p className="action-message">{actionMessage}</p>}</section>}<section className="cards-grid">{activeCards.map((card) => <article className="bingo-card" key={card.id}><div className="card-header"><strong>CARD&nbsp; #{card.id}</strong><span>{card.progress}</span></div><div className="card-letters">{['B','I','N','G','O'].map((letter) => <span key={letter}>{letter}</span>)}</div>{card.rows.map((row, rowIndex) => <div className="card-row" key={rowIndex}>{row.map((number, index) => <span className={number === '★' ? 'star' : calledNumbers.has(Number(number)) ? 'card-called' : ''} key={`${rowIndex}-${index}`}>{number}</span>)}</div>)}</article>)}</section></section>
        <section className="screen-panel game-screen" aria-hidden={screen !== 'game'}><div className="flow-game-heading"><button type="button" className="flow-back" onClick={() => setScreen('landing')}>BACK</button><span>LIVE GAME</span><button type="button" className="screen-primary" onClick={() => setScreen('cards')}>CHOOSE CARDS</button></div><section className="number-board panel-edge"><div className="bingo-letters">{['B','I','N','G','O'].map((letter) => <span key={letter}>{letter}</span>)}</div><div className="number-grid">{numbers.map((number) => <button key={number} className={calledNumbers.has(number) ? 'number called' : 'number'} onClick={() => setLastCall(number)}>{number}</button>)}</div></section>

      <section className="call-panel">
        <div className="big-ball"><span>O</span><strong>{displayCall}</strong><i /></div>
        <div className="call-content"><div className="call-heading"><span className="timer">◷</span> LIVE CALL</div><div className="call-number-wrap"><span className="gold-spark spark-left" aria-hidden="true" /><div className="call-number">{displayCall}</div><span className="gold-spark spark-right" aria-hidden="true" /></div><div className="recent-calls">{recentCalls.map((number) => <button key={number} onClick={() => setLastCall(number)}>{number}</button>)}</div></div>
        <div className="call-actions"><button className="sound-button" aria-label="Toggle sound" onClick={() => setSound(!sound)}>{sound ? <Volume2 size={36} /> : <Headphones size={34} />}</button><strong className="call-count">19/75</strong></div>
        <span className="call-corner-glow" aria-hidden="true" />
      </section>
      {activeCards.length > 0 && <section className="game-cards panel-edge" aria-label="Selected cards"><div className="game-cards-heading"><strong>YOUR CARDS</strong><span>{activeCards.length} selected</span></div><div className="game-cards-grid">{activeCards.map((card) => <article className="bingo-card" key={`game-${card.id}`}><div className="card-header"><strong>CARD&nbsp; #{card.id}</strong><span>{card.progress}</span></div><div className="card-letters">{['B','I','N','G','O'].map((letter) => <span key={letter}>{letter}</span>)}</div>{card.rows.map((row, rowIndex) => <div className="card-row" key={rowIndex}>{row.map((number, index) => <span className={number === '★' ? 'marked' : ''} key={`${rowIndex}-${index}`}>{number}</span>)}</div>)}</article>)}</div></section>}
      </section>
      </div>

      <nav className={`bottom-nav ${screen === 'landing' ? 'landing-nav' : ''}`}>{[['BINGO', Trophy], ['LEADERS', Trophy], ['WALLET', WalletCards]].map(([label, Icon]) => <button className={activeTab === label ? 'active' : ''} key={label as string} onClick={() => setActiveTab(label as string)}><Icon size={27} /><span>{label as string}</span></button>)}</nav>
    </main>
  )
}
