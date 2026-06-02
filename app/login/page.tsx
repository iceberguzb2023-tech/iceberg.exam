"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { User, Layers, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const TEACHER_LEVELS = [
  "Support teacher",
  "Kids teacher",
  "1-2-3 level teachers",
  "4-5-6 level teachers"
]

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get role from URL, default to STUDENT
  const urlRole = searchParams.get("role")?.toUpperCase() === "TEACHER" ? "TEACHER" : "STUDENT"
  
  const [role, setRole] = useState<"STUDENT" | "TEACHER">(urlRole)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [level, setLevel] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Sync state with URL if it changes
  useEffect(() => {
    setRole(urlRole)
    setLevel("")
  }, [urlRole])

  const handleStart = async () => {
    if (!firstName || !lastName || !level) {
      setError("Iltimos, barcha maydonlarni to'ldiring!")
      return
    }
    
    setLoading(true)
    const userInfo = { firstName, lastName, role, level }
    sessionStorage.setItem("ice_user", JSON.stringify(userInfo))
    
    // Simulating a small delay for better UX
    setTimeout(() => {
      router.push(`/test?role=${role}&level=${level}`)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900/40 p-8 md:p-10 rounded-lg border border-white/5 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        
        <div className="relative z-10 space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <img src="/Frame 344.png" alt="ICE Logo" className="h-12 w-auto" />
            </div>
            <h1 className="text-xl font-black font-outfit mt-4">
              {role === "STUDENT" ? "O'quvchi Logini" : "Ustoz Logini"}
            </h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Ma'lumotlaringizni kiriting</p>
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-red-500/10 border border-red-500/10 p-3 rounded-lg flex items-center text-red-500 text-xs font-bold"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Ism</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg py-3 px-4 focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="Ism"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">Familiya</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg py-3 px-4 focus:border-primary outline-none transition-all text-sm font-medium"
                  placeholder="Familiya"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {role === "STUDENT" ? "Guruh (Etap)" : "Mutaxassislik (Daraja)"}
              </label>
              
              <div className={`grid ${role === "STUDENT" ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
                {role === "STUDENT" ? (
                  [1, 2, 3, 4, 5, "kids"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(`${l}-etap`)}
                      className={`py-3 rounded-lg text-[10px] font-black transition-all border ${level === `${l}-etap` ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-white/5 text-muted-foreground'}`}
                    >
                      {l}-etap
                    </button>
                  ))
                ) : (
                  TEACHER_LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`py-3 px-4 rounded-lg text-[10px] font-black transition-all border text-left leading-tight ${level === l ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 font-black' : 'bg-slate-950 border-white/5 text-muted-foreground font-bold'}`}
                    >
                      {l}
                    </button>
                  ))
                )}
              </div>
            </div>

            <button 
              onClick={handleStart}
              disabled={loading}
              className="w-full btn-premium py-4 text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Boshlash <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button 
              onClick={() => router.push('/')}
              className="w-full py-2 text-[9px] text-muted-foreground hover:text-white uppercase tracking-widest transition-colors"
            >
              ← Boshqa role tanlash
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
