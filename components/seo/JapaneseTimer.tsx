'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocalStudyTimer } from '@/hooks/useLocalStudyTimer'
import { useWakeLock } from '@/hooks/useWakeLock'
import type { JapaneseSeoSlug } from '@/lib/japaneseSeoRoutes'

export default function JapaneseTimer({ slug }: { slug: JapaneseSeoSlug }) {
  const pomodoro = slug === 'pomodoro-timer'
  const [duration, setDuration] = useState(25)
  const [phase, setPhase] = useState<'focus' | 'break'>('focus')
  const [rounds, setRounds] = useState(0)
  const counted = useRef(false)
  const timer = useLocalStudyTimer(25 * 60)
  const running = timer.status === 'running'
  const finished = timer.status === 'finished'
  const locked = timer.status !== 'idle'
  useWakeLock(running)

  useEffect(() => {
    if (pomodoro && finished && phase === 'focus' && !counted.current) {
      counted.current = true
      setRounds(value => value + 1)
    }
  }, [pomodoro, finished, phase])

  const restMinutes = rounds > 0 && rounds % 4 === 0 ? 15 : 5
  const reset = () => {
    timer.reset(duration * 60)
    setPhase('focus')
    setRounds(0)
    counted.current = false
  }
  const nextPhase = () => {
    const next = phase === 'focus' ? 'break' : 'focus'
    setPhase(next)
    counted.current = false
    timer.reset((next === 'break' ? restMinutes : 25) * 60)
  }
  const display = `${String(Math.floor(timer.seconds / 60)).padStart(2, '0')}:${String(timer.seconds % 60).padStart(2, '0')}`

  return <div className="ja-timer">
    {slug === 'focus-timer' && <div className="ja-timer-presets" role="group" aria-label="集中時間">
      {[15, 25, 45, 50].map(minutes => <button key={minutes} type="button" aria-pressed={duration === minutes} disabled={locked} onClick={() => {
        setDuration(minutes)
        timer.reset(minutes * 60)
      }}>{minutes}分</button>)}
    </div>}
    {pomodoro && <p className="ja-timer-phase">{phase === 'focus' ? '集中時間' : '休憩時間'} · 完了した集中時間：{rounds}回</p>}
    <div className="ja-timer-digits" role="timer" aria-label={`残り${Math.floor(timer.seconds / 60)}分${timer.seconds % 60}秒`} aria-live="off">{display}</div>
    <p className="ja-timer-status" role="status">
      {finished ? pomodoro ? phase === 'focus' ? `集中時間が終了しました。${restMinutes}分休憩しましょう。` : '休憩が終了しました。次の作業を始められます。' : '設定した時間が経過しました。お疲れさまでした。' : running ? 'カウントダウン中' : timer.status === 'paused' ? '一時停止中' : '準備ができたらスタートしてください。'}
    </p>
    <div className="ja-timer-actions">
      <button className="seo-button" type="button" disabled={finished} onClick={running ? timer.pause : timer.start}>
        {running ? '一時停止' : timer.status === 'paused' ? '再開' : 'スタート'}
      </button>
      <button type="button" onClick={reset}>リセット</button>
      {pomodoro && finished && <button className="seo-button" type="button" onClick={nextPhase}>{phase === 'focus' ? '休憩に切り替える' : '集中時間に切り替える'}</button>}
    </div>
    <p className="ja-timer-note">終了は画面表示でお知らせします。音は鳴りません。再読み込みするとリセットされます。</p>
    {pomodoro && <p className="ja-timer-note">集中と休憩を切り替えた後、「スタート」を押すと次の時間が始まります。</p>}
    {slug === 'focus-timer' && <p className="ja-timer-note">時間を変更するときは、先にリセットしてください。</p>}
    <noscript><p>タイマーを動かすには、ブラウザのJavaScriptを有効にしてください。</p></noscript>
  </div>
}
