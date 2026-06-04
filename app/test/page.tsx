"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, 
  Clock, Award, LogOut, AlertTriangle, Maximize2, X
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import QuestionAudio from "@/components/QuestionAudio"

import { Suspense } from "react"

function TestContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get("role")
  const level = searchParams.get("level")

  const [availableTests, setAvailableTests] = useState<any[]>([])
  const [test, setTest] = useState<any>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<any[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<any>(null)

  // Security & Timer States
  const [timeLeft, setTimeLeft] = useState<number | null>(null) // in seconds
  const [isBlurred, setIsBlurred] = useState(false)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null)
  const [audioPlayCount, setAudioPlayCount] = useState<Record<string, number>>({})
  
  const MAX_TAB_SWITCHES = 3
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs to avoid stale closures in event listeners/intervals
  const answersRef = useRef<any[]>([])
  const testRef = useRef<any>(null)
  const userInfoRef = useRef<any>(null)
  const isSubmittingRef = useRef<boolean>(false)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    testRef.current = test
  }, [test])

  useEffect(() => {
    userInfoRef.current = userInfo
  }, [userInfo])

  useEffect(() => {
    const savedUser = sessionStorage.getItem("ice_user")
    if (!savedUser) {
      router.push("/")
      return
    }
    const parsedUser = JSON.parse(savedUser)
    setUserInfo(parsedUser)
    userInfoRef.current = parsedUser
    fetchTest()

    // Anti-Cheating Event Listeners
    const handleBlur = () => !isFinished && setIsBlurred(true)
    const handleFocus = () => !isFinished && setIsBlurred(false)
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasStarted && !isFinished && !isSubmittingRef.current) {
        setTabSwitches(prev => {
          const next = prev + 1
          if (next >= MAX_TAB_SWITCHES) {
            autoSubmit("Tab switch limit reached")
          }
          return next
        })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I')
      ) {
        e.preventDefault()
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasStarted, isFinished])

  // Dedicated Timer Effect
  useEffect(() => {
    if (hasStarted && !isFinished && timeLeft !== null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            autoSubmit("Time expired")
            return 0
          }
          return prev !== null ? prev - 1 : null
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [hasStarted, isFinished, timeLeft === null])

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/tests?role=${role}&level=${level}`)
      const data = await res.json()
      if (data && Array.isArray(data)) {
        setAvailableTests(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectTest = (selected: any) => {
    setTest(selected)
    testRef.current = selected
    if (selected.timeLimit) {
      setTimeLeft(selected.timeLimit * 60)
    }
  }

  const startExam = () => {
    const element = document.documentElement
    if (element.requestFullscreen) {
      element.requestFullscreen()
    }
    setIsFullscreen(true)
    setHasStarted(true)
    
    setIsFullscreen(true)
    setHasStarted(true)
  }

  const autoSubmit = async (reason: string) => {
    if (isSubmittingRef.current) return
    console.log(`Auto-submitting: ${reason}`)
    await performSubmission()
  }

  const handleMCQAnswer = (answer: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev]
      const currentQuestion = test.questions[currentIdx]
      const existing = newAnswers.findIndex(a => a.questionId === currentQuestion.id)
      const isCorrect = answer === currentQuestion.correctAnswer

      if (existing > -1) {
        newAnswers[existing] = { questionId: currentQuestion.id, answer, isCorrect }
      } else {
        newAnswers.push({ questionId: currentQuestion.id, answer, isCorrect })
      }
      return newAnswers
    })
  }

  const handleOpenAnswer = (text: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev]
      const currentQuestion = test.questions[currentIdx]
      const existing = newAnswers.findIndex(a => a.questionId === currentQuestion.id)
      
      if (existing > -1) {
        newAnswers[existing] = { questionId: currentQuestion.id, answer: text, isCorrect: null }
      } else {
        newAnswers.push({ questionId: currentQuestion.id, answer: text, isCorrect: null })
      }
      return newAnswers
    })
  }

  const performSubmission = async () => {
    if (isSubmittingRef.current || isFinished) return
    
    const currentTest = testRef.current
    const currentUser = userInfoRef.current
    const currentAnswers = answersRef.current

    if (!currentTest || !currentUser) return

    setIsSubmitting(true)
    isSubmittingRef.current = true
    setLoading(true)

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: currentTest.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          role: currentUser.role,
          level: currentUser.level,
          answers: currentAnswers,
        }),
      })
      if (res.ok) {
        setIsFinished(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch (err) {
      console.error("Submission error:", err)
      setIsSubmitting(false)
      isSubmittingRef.current = false
      toast.error("Natijani saqlashda xatolik yuz berdi!")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
  }

  if (loading && !isFinished) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tayyorlanmoqda...</p>
    </div>
  )

  // 1. Selection State: If no test is selected yet
  if (!test && !loading && !isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-4xl w-full space-y-10">
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-6"
            >
              <img src="/Frame 344.png" alt="ICE Logo" className="h-12 w-auto" />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-4xl font-black font-outfit uppercase tracking-tight"
            >
              Testni Tanlang
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]"
            >
              Darajangizga mos mavjud barcha testlar ro'yxati
            </motion.p>
          </div>

          {availableTests.length === 0 ? (
            <div className="bg-slate-900/40 p-12 rounded-3xl border border-dashed border-white/10 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Hozircha ushbu daraja uchun testlar mavjud emas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableTests.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-slate-900/40 p-6 md:p-8 rounded-3xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group flex flex-col justify-between"
                  onClick={() => selectTest(t)}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
                        <Award className="w-6 h-6" />
                      </div>
                      <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/5">
                        {t.questions.length} savol
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black font-outfit text-white group-hover:text-primary transition-colors">{t.title}</h3>
                      <p className="text-slate-500 text-xs mt-2 line-clamp-2">Ushbu test bilan o'z bilimingizni sinab ko'ring va natijangizni oshiring.</p>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-bold">{t.timeLimit || "Cheksiz"} daqiqa</span>
                    </div>
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center pt-8">
            <button 
              onClick={() => router.push("/")}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-colors"
            >
              ← Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. Rules State: If a test is selected but not yet started
  if (test && !hasStarted && !isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
         <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/40 p-8 md:p-12 rounded-3xl border border-white/5 max-w-2xl w-full text-center space-y-8 relative overflow-hidden"
         >
           <button 
             onClick={() => setTest(null)}
             className="absolute top-6 left-6 p-2 text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
           >
             <ChevronLeft className="w-4 h-4" /> Orqaga
           </button>

           <div className="flex flex-col items-center gap-6">
              <img src="/Frame 344.png" alt="ICE Logo" className="h-12 w-auto" />
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                 <Clock className="w-8 h-8 text-emerald-500" />
              </div>
           </div>
           <div>
              <h1 className="text-3xl font-black font-outfit uppercase tracking-tight">{test.title}</h1>
              <p className="text-slate-400 mt-2">Imtihonni boshlashdan oldin qoidalar bilan tanishib chiqing.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                 <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Vaqt</div>
                 <div className="text-xl font-bold">{test.timeLimit || "Cheksiz"} daqiqa</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                 <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Savollar</div>
                 <div className="text-xl font-bold">{test.questions.length} ta</div>
              </div>
           </div>

           <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-left space-y-2">
              <h4 className="text-amber-500 text-xs font-black uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Xavfsizlik choralari:
              </h4>
              <ul className="text-[10px] text-amber-500/80 font-bold space-y-1 ml-6 list-disc">
                <li>Boshqa tabga o'tish taqiqlanadi (Maksimum 3 marta).</li>
                <li>Test to'liq ekran (Fullscreen) rejimida amalga oshiriladi.</li>
                <li>Vaqt tugasa, test avtomatik saqlanadi.</li>
                <li>Ekrandan chetga chiqilsa, test bluer holatiga o'tadi.</li>
              </ul>
           </div>

           <button 
            onClick={startExam}
            className="w-full btn-premium py-5 text-lg font-black uppercase tracking-widest rounded-xl shadow-2xl"
           >
             Imtihonni Boshlash
           </button>
         </motion.div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900/40 p-8 md:p-12 rounded-2xl border border-white/5 max-w-lg w-full shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black font-outfit uppercase tracking-tight mb-4 text-white">Muvaffaqiyatli!</h1>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed px-4">
            Sizning javoblaringiz qabul qilindi va tizimda saqlandi. Natijani administrator ko'rib chiqadi.
          </p>
          <button 
            onClick={() => router.push("/")}
            className="w-full btn-premium py-4 font-bold rounded-xl transition-all"
          >
            Tizimdan chiqish
          </button>
        </motion.div>
      </div>
    )
  }

  const currentQuestion = test.questions[currentIdx]
  const userAnswer = answers.find(a => a.questionId === currentQuestion.id)?.answer || ""

  return (
    <div className={`min-h-screen bg-background select-none transition-all duration-300 ${isBlurred ? 'blur-2xl' : ''}`}>
      {/* Enlarged Image Modal */}
      <AnimatePresence>
        {enlargedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
          >
             {/* Close Button */}
             <button 
                onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-[1001] border border-white/10"
             >
                <X className="w-6 h-6" />
             </button>

             {/* Background overlay for closing */}
             <div 
               onClick={() => setEnlargedImage(null)}
               className="absolute inset-0 z-0 cursor-zoom-out"
             />

             <motion.img 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              src={enlargedImage} 
              className="relative z-10 max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-none"
             />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blurred Overlay */}
      <AnimatePresence>
        {isBlurred && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
          >
             <AlertTriangle className="w-16 h-16 text-amber-500 mb-6 animate-pulse" />
             <h2 className="text-4xl font-black font-outfit uppercase text-white mb-2">Diqqat!</h2>
             <p className="text-slate-300 max-w-md">Siz test darchasidan chetga chiqdingiz. Iltimos, davom etish uchun ekranning istalgan joyiga bosing.</p>
             <p className="text-amber-500 font-black text-[10px] mt-8 uppercase tracking-[0.3em]">Ogohlantirish: {tabSwitches} / {MAX_TAB_SWITCHES}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-8">
        <div className="max-w-full mx-auto space-y-4 md:space-y-6">
          {/* Top Info Bar */}
          <div className="bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <img src="/Frame 344.png" alt="ICE Logo" className="h-8 w-auto hidden sm:block" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                   <span className="text-indigo-400 text-base font-black">{currentIdx + 1}</span>
                </div>
                <div>
                  <h2 className="text-base md:text-xl font-black font-outfit uppercase tracking-tight line-clamp-1">{test.title}</h2>
                  <div className="flex items-center gap-2 md:gap-3 mt-1">
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">{userInfo?.firstName} {userInfo?.lastName}</span>
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-indigo-400 tracking-widest">{userInfo?.level}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between lg:justify-end gap-3 md:gap-4 bg-slate-950 lg:bg-transparent p-3 lg:p-0 rounded-xl lg:rounded-none border lg:border-none border-white/5">
               <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${timeLeft !== null && timeLeft < 60 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                  <Clock className="w-4 h-4" />
                  {timeLeft !== null ? formatTime(timeLeft) : "Active"}
               </div>
               <div className="h-4 w-[1px] bg-white/10 hidden lg:block" />
               <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 flex flex-col items-end">
                 <span className="text-slate-600">Qoldi:</span>
                 <span>{test.questions.length - answers.length} savol</span>
               </div>
            </div>
          </div>

          {/* Question Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              <motion.div 
                key={currentIdx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-900/40 p-6 md:p-12 rounded-3xl border border-white/5 min-h-[400px] flex flex-col relative overflow-hidden"
              >
                <style jsx global>{`
                  @media print {
                    body { display: none !important; }
                  }
                  .select-none {
                    user-select: none;
                    -webkit-user-select: none;
                  }
                `}</style>

                <div className="mb-8">
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500 block mb-4">Savol matni:</span>
                   <h1 className="text-lg md:text-2xl font-black font-outfit leading-tight text-slate-200">{currentQuestion.text}</h1>
                </div>

                {/* Multiple Images Support */}
                {currentQuestion.images && currentQuestion.images.length > 0 && (
                  <div className={`mb-10 grid gap-4 ${
                    currentQuestion.images.length === 1 ? 'grid-cols-1' : 
                    currentQuestion.images.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {currentQuestion.images.map((img: string, i: number) => (
                      <motion.div 
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setEnlargedImage(img)}
                        className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/50 shadow-xl cursor-zoom-in group"
                      >
                         <img src={img} alt={`Savol rasmi ${i+1}`} className="w-full h-auto object-contain max-h-[400px]" />
                         <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                            <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Audio Player */}
                <div className="mb-6">
                  <QuestionAudio
                    audioUrl={currentQuestion.audio}
                    playCount={audioPlayCount[currentQuestion.id] || 0}
                    onPlayCountChange={(count) =>
                      setAudioPlayCount((prev) => ({ ...prev, [currentQuestion.id]: count }))
                    }
                    resetKey={currentIdx}
                  />
                </div>

                <div className="mt-auto">
                  {currentQuestion.type === "MCQ" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {["A", "B", "C", "D"].map((letter, i) => (
                        <button
                          key={letter}
                          onClick={() => handleMCQAnswer(letter)}
                          className={`p-4 md:p-6 rounded-2xl border transition-all flex items-center gap-4 text-left group ${
                            userAnswer === letter 
                              ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" 
                              : "bg-slate-950 border-white/5 text-slate-400 hover:border-primary/40 hover:bg-slate-900"
                          }`}
                        >
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                            userAnswer === letter ? "bg-white/20" : "bg-white/5 text-slate-500 group-hover:bg-primary/20 group-hover:text-primary transition-all"
                          }`}>
                            {letter}
                          </div>
                          <span className="font-bold text-sm md:text-base">{currentQuestion.options[i] || letter}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Javobingiz:</span>
                      <textarea 
                        value={userAnswer}
                        onChange={(e) => handleOpenAnswer(e.target.value)}
                        placeholder="Javobingizni bu yerga kiriting..."
                        className="w-full h-48 bg-slate-950 border border-white/5 rounded-2xl p-6 focus:border-primary outline-none text-lg resize-none transition-all placeholder:text-slate-800"
                      />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Navigation */}
              <div className="flex justify-between items-center bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-2 px-3 md:px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-white disabled:opacity-10 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft className="w-5 h-5" /> Oldingisi
                </button>

                <div className="flex items-center gap-2 md:gap-4">
                  {currentIdx === test.questions.length - 1 ? (
                    <button 
                      onClick={performSubmission}
                      disabled={isSubmitting}
                      className="btn-premium px-6 md:px-12 py-4 font-black uppercase text-xs tracking-[0.2em] shadow-2xl rounded-xl"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yakunlash"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentIdx(prev => Math.min(test.questions.length - 1, prev + 1))}
                      className="flex items-center gap-2 px-5 md:px-10 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
                    >
                      Keyingisi <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar / Map */}
            <div className="lg:col-span-4 space-y-6 sticky top-8">
              <div className="bg-slate-900/40 p-6 md:p-8 rounded-3xl border border-white/5 space-y-8">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black font-outfit uppercase tracking-widest text-slate-600">Savollar xaritasi</h3>
                      <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest">{answers.length} / {test.questions.length}</div>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {test.questions.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentIdx(i)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border transition-all ${
                            currentIdx === i ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30' :
                            answers.some(a => a.questionId === test.questions[i].id) ? 'bg-primary/20 border-primary/30 text-primary' :
                            'bg-slate-950 border-white/5 text-slate-700 hover:border-white/10'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="border-t border-white/5 pt-8">
                    <button 
                      onClick={() => setIsExitModalOpen(true)}
                      className="w-full flex items-center justify-center gap-3 py-4 text-rose-500/40 hover:text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] transition-all bg-rose-500/5 hover:bg-rose-500/10 rounded-xl"
                    >
                      <LogOut className="w-4 h-4" /> Chiqish
                    </button>
                 </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 hidden lg:block">
                 <div className="flex items-center gap-4">
                    <div className="relative">
                       <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                       <div className="w-3 h-3 bg-emerald-500 rounded-full absolute top-0" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Tizim himoyasi</div>
                       <div className="text-[8px] text-slate-500 font-bold uppercase tracking-tight mt-0.5 whitespace-nowrap">Tab Switch Limit: {tabSwitches} / {MAX_TAB_SWITCHES}</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirm={() => router.push("/")}
        title="Testdan chiqish"
        message="Haqiqatan ham chiqib ketmoqchimisiz? Barcha saqlanmagan javoblar yo'qolishi mumkin!"
        variant="danger"
        confirmText="Ha, chiqaman"
      />
    </div>
  )
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <TestContent />
    </Suspense>
  )
}
