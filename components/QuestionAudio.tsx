"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Volume2, CheckCircle2, Headphones, Play } from "lucide-react"

interface QuestionAudioProps {
  audioUrl: string | null
  maxPlays?: number
  playCount: number
  onPlayCountChange: (count: number) => void
  resetKey: number
}

type Phase = "countdown" | "playing" | "done"

export default function QuestionAudio({
  audioUrl,
  maxPlays = 2,
  playCount,
  onPlayCountChange,
  resetKey,
}: QuestionAudioProps) {
  const [phase, setPhase] = useState<Phase>("countdown")
  const [countdownValue, setCountdownValue] = useState(3)
  const [currentPlay, setCurrentPlay] = useState(1)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!audioUrl) return

    if (playCount >= maxPlays) {
      setPhase("done")
      return
    }

    setPhase("countdown")
    setCountdownValue(3)
    setCurrentPlay(playCount + 1)
    setProgress({ current: 0, total: 0 })

    let count = 3
    timerRef.current = setInterval(() => {
      count--
      if (count <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null

        const audio = new Audio(audioUrl)
        audio.controls = false
        audioRef.current = audio

        audio.onended = () => {
          const newCount = playCount + 1
          onPlayCountChange(newCount)
          if (newCount >= maxPlays) {
            setPhase("done")
          } else {
            audio.currentTime = 0
            audio.play().catch(() => {})
            setCurrentPlay(newCount + 1)
          }
        }

        audio.play().catch(() => {})
        setPhase("playing")

        const updateProgress = () => {
          if (audioRef.current && !audioRef.current.paused) {
            setProgress({
              current: audioRef.current.currentTime,
              total: audioRef.current.duration || 0,
            })
            rafRef.current = requestAnimationFrame(updateProgress)
          }
        }
        rafRef.current = requestAnimationFrame(updateProgress)
      } else {
        setCountdownValue(count)
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [audioUrl, resetKey])

  if (!audioUrl) return null

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? "0" : ""}${sec}`
  }

  const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-950 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Headphones className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Audio savol
          </span>
        </div>
        {phase !== "countdown" && (
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            {Math.min(currentPlay, maxPlays)}/{maxPlays}
          </span>
        )}
      </div>

      {/* Countdown */}
      {phase === "countdown" && (
        <div className="flex items-center justify-center gap-5 py-6">
          {[3, 2, 1].map((n) => (
            <motion.div
              key={n}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: countdownValue === n ? 1.2 : 0.7,
                opacity: countdownValue >= n ? 1 : 0,
              }}
              transition={{ duration: 0.2 }}
              className={`text-4xl font-black font-outfit ${
                countdownValue === n ? "text-indigo-400" : "text-slate-800"
              }`}
            >
              {n}
            </motion.div>
          ))}
        </div>
      )}

      {/* Playing */}
      {phase === "playing" && (
        <div className="space-y-4 py-2">
          {/* Wave animation */}
          <div className="flex items-center justify-center gap-[3px]">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [8, Math.random() * 32 + 10, 8],
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 0.2,
                }}
                className="w-[3px] bg-indigo-400/60 rounded-full"
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-400 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Time + status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
              {formatTime(progress.current)} / {formatTime(progress.total)}
            </span>
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                Tinglanmoqda...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="flex items-center justify-center gap-3 py-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            Audio yakunlandi
          </span>
        </div>
      )}
    </motion.div>
  )
}
