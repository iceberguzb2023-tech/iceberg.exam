"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Image as ImageIcon, CheckCircle2, ChevronLeft, Loader2, Save, Clock, Music, Volume2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

const TEACHER_LEVELS = [
  "Support teacher",
  "Kids teacher",
  "1-2-3 level teachers",
  "4-5-6 level teachers"
]

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [audioUploadingIdx, setAudioUploadingIdx] = useState<number | null>(null)
  
  const [test, setTest] = useState({
    title: "",
    role: "STUDENT" as "STUDENT" | "TEACHER",
    level: "1-etap",
    timeLimit: 30,
    questions: [] as any[]
  })

  useEffect(() => {
    fetchTest()
  }, [id])

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/admin/tests/${id}`)
      if (!res.ok) throw new Error("Test topilmadi")
      const data = await res.json()
      setTest({
        title: data.title,
        role: data.role,
        level: data.level || "1-etap",
        timeLimit: data.timeLimit || 30,
        questions: data.questions || []
      })
    } catch (err) {
      toast.error("Testni yuklashda xatolik yuz berdi!")
      router.push("/admin/tests")
    } finally {
      setLoading(false)
    }
  }

  const updateQuestion = (idx: number, data: any) => {
    setTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === idx ? { ...q, ...data } : q)
    }))
  }

  const addQuestionAt = (idx: number) => {
    const newQuestions = [...test.questions]
    newQuestions.splice(idx + 1, 0, { text: "", type: "MCQ", images: [], options: ["", "", "", ""], correctAnswer: "A", audio: null })
    setTest({ ...test, questions: newQuestions })
  }

  const addQuestionFirst = () => {
    setTest({
      ...test,
      questions: [{ text: "", type: "MCQ", images: [], options: ["", "", "", ""], correctAnswer: "A", audio: null }, ...test.questions]
    })
  }

  const removeQuestion = (idx: number) => {
    if (test.questions.length <= 1) {
      toast.warning("Kamida bitta savol bo'lishi kerak!")
      return
    }
    setTest({
      ...test,
      questions: test.questions.filter((_, i) => i !== idx)
    })
  }

  const handleImageUpload = async (idx: number, file: File) => {
    if (!file) return
    setUploadingIdx(idx)
    
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async () => {
      const base64 = reader.result
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            file: base64, 
            folder: (test.title || "ice-exams").trim() 
          }),
        })
        const data = await res.json()
        if (data.url) {
          const currentQuestion = test.questions[idx]
          updateQuestion(idx, { images: [...(currentQuestion.images || []), data.url] })
        }
      } catch (err) {
        toast.error("Rasm yuklashda xatolik yuz berdi!")
      } finally {
        setUploadingIdx(null)
      }
    }
  }

  const removeImage = (qIdx: number, imgIdx: number) => {
    const q = test.questions[qIdx]
    const newImages = q.images.filter((_: any, i: number) => i !== imgIdx)
    updateQuestion(qIdx, { images: newImages })
  }

  const handleAudioUpload = async (idx: number, file: File) => {
    if (!file) return
    setAudioUploadingIdx(idx)

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async () => {
      const base64 = reader.result
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64,
            folder: (test.title || "ice-exams").trim()
          }),
        })
        const data = await res.json()
        if (data.url) {
          updateQuestion(idx, { audio: data.url })
        }
      } catch (err) {
        toast.error("Audio yuklashda xatolik yuz berdi!")
      } finally {
        setAudioUploadingIdx(null)
      }
    }
  }

  const removeAudio = (qIdx: number) => {
    updateQuestion(qIdx, { audio: null })
  }

  const handleUpdateTest = async () => {
    if (!test.title) {
      toast.warning("Test sarlavhasini kiriting!")
      return
    }
    setSaving(true)
    const submissionData = {
      ...test
    }
    try {
      const res = await fetch(`/api/admin/tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      })
      if (res.ok) {
        toast.success("O'zgarishlar saqlandi")
        router.push("/admin/tests")
      }
    } catch (err) {
      toast.error("Saqlashda xatolik yuz berdi!")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="space-y-8 pb-20">
        {/* Header content unchanged... */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 p-6 rounded-lg border border-white/5">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-black font-outfit uppercase tracking-tight">Tahrirlash: {test.title}</h1>
              <p className="text-muted-foreground text-sm">O'zgarishlarni kiriting va saqlash tugmasini bosing</p>
            </div>
          </div>
          <button 
            onClick={handleUpdateTest}
            disabled={saving}
            className="btn-premium px-8 py-3.5 font-bold shadow-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            O'zgarishlarni Saqlash
          </button>
        </div>

        {/* Basic Info Section unchanged... */}
        {/* ... (Existing code for section 1 and 2 is fine) */}
        <div className="bg-slate-900/40 p-8 rounded-lg border border-white/5 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-4">
            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Test Sarlavhasi</label>
            <input 
              type="text" 
              value={test.title}
              onChange={(e) => setTest({ ...test, title: e.target.value })}
              className="w-full bg-slate-950 border border-white/5 rounded-lg py-4 px-6 focus:border-primary outline-none text-xl font-bold placeholder:text-slate-800 transition-all"
              placeholder="Masalan: Unit 5 - Vocabulary Check"
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
               <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Auditoriya</label>
               <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5">
                  {["STUDENT", "TEACHER"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setTest({ 
                        ...test, 
                        role: role as any,
                        level: role === "STUDENT" ? "1-etap" : "Support teacher"
                      })}
                      className={`flex-grow py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${test.role === role ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}
                    >
                      {role === "STUDENT" ? "O'quvchilar" : "Ustozlar"}
                    </button>
                  ))}
               </div>
            </div>
            
            {test.role === "STUDENT" ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Bosqich (Etap)</label>
                 <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, "kids"].map((i) => (
                      <button
                        key={i}
                        onClick={() => setTest({ ...test, level: `${i}-etap` })}
                        className={`py-2.5 rounded-lg text-[10px] font-black transition-all border ${test.level === `${i}-etap` ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-white/5 text-muted-foreground'}`}
                      >
                        {i}-etap
                      </button>
                    ))}
                 </div>
              </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                 <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">O'qituvchi Darajasi</label>
                 <div className="grid grid-cols-2 gap-2">
                    {TEACHER_LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => setTest({ ...test, level })}
                        className={`py-2.5 px-3 text-left leading-tight rounded-lg text-[10px] font-black transition-all border ${test.level === level ? 'bg-primary/20 border-primary text-primary' : 'bg-slate-950 border-white/5 text-muted-foreground'}`}
                      >
                        {level}
                      </button>
                    ))}
                 </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Vaqt Limiti (daqiqada)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="number" 
                value={test.timeLimit}
                onChange={(e) => setTest({ ...test, timeLimit: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-white/5 rounded-lg py-4 pl-12 pr-6 focus:border-primary outline-none text-xl font-bold transition-all"
                placeholder="30"
              />
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-black font-outfit uppercase tracking-widest">Savollar ({test.questions.length})</h2>
            <button onClick={addQuestionFirst} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all">
              + Teppaga savol qo'shish
            </button>
          </div>

          <div className="space-y-4">
            {test.questions.map((q, qIdx) => (
              <div key={qIdx} className="space-y-4">
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-slate-900/60 p-6 md:p-8 rounded-lg border border-white/5 space-y-6 relative"
                >
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm font-black border border-primary/20">
                      {qIdx + 1}
                    </div>
                    <button onClick={() => removeQuestion(qIdx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-12 space-y-4">
                        <textarea 
                          placeholder="Savol matnini bu yerga yozing..."
                          value={q.text}
                          onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                          className="w-full h-32 bg-slate-950 border border-white/5 rounded-lg p-5 focus:border-primary outline-none text-base resize-none transition-all"
                        />
                        
                        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-950 p-4 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Savol turi:</span>
                            <div className="flex bg-slate-900 p-1 rounded-lg">
                              {["MCQ", "OPEN"].map(type => (
                                <button 
                                  key={type}
                                  onClick={() => updateQuestion(qIdx, { type })}
                                  className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${q.type === type ? "bg-primary text-white" : "text-slate-500 hover:text-white"}`}
                                >
                                  {type === "MCQ" ? "Variantli" : "Ochiq"}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(qIdx, e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="px-4 py-2 bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 border border-white/5 hover:bg-white/10 transition-all font-outfit">
                              {uploadingIdx === qIdx ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                              Rasm qo'shish
                            </div>
                          </div>

                          <div className="relative">
                            <input type="file" accept="audio/*" onChange={(e) => e.target.files && handleAudioUpload(qIdx, e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="px-4 py-2 bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 border border-white/5 hover:bg-white/10 transition-all font-outfit">
                              {audioUploadingIdx === qIdx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
                              Audio qo'shish
                            </div>
                          </div>
                        </div>

                        {/* Image Grid Display */}
                        {q.images && q.images.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-slate-950 rounded-lg border border-white/5">
                            {q.images.map((url: string, imgIdx: number) => (
                              <div key={imgIdx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-slate-900">
                                <img src={url} alt={`Savol ${qIdx + 1} rasm ${imgIdx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <button 
                                  onClick={() => removeImage(qIdx, imgIdx)}
                                  className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Audio Preview */}
                        {q.audio && (
                          <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-lg border border-white/5">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                              <Volume2 className="w-5 h-5 text-indigo-400" />
                            </div>
                            <audio controls className="flex-1 h-10">
                              <source src={q.audio} />
                            </audio>
                            <button
                              onClick={() => removeAudio(qIdx)}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {q.type === "MCQ" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {["A", "B", "C", "D"].map((letter, optIdx) => (
                          <div 
                            key={letter}
                            onClick={() => updateQuestion(qIdx, { correctAnswer: letter })}
                            className={`p-1 rounded-lg cursor-pointer transition-all border ${q.correctAnswer === letter ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-slate-950 hover:bg-slate-900'}`}
                          >
                            <div className="flex items-center gap-4 p-3">
                              <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-black ${q.correctAnswer === letter ? 'bg-green-500 text-white' : 'bg-slate-900 text-slate-500'}`}>
                                {letter}
                              </div>
                              <input 
                                type="text"
                                placeholder={`Variant ${letter}...`}
                                value={q.options?.[optIdx] || ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const newOpts = [...(q.options || ["", "", "", ""])]
                                  newOpts[optIdx] = e.target.value
                                  updateQuestion(qIdx, { options: newOpts })
                                }}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-800"
                              />
                              {q.correctAnswer === letter && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
                
                <div className="flex justify-center -my-2 relative z-10">
                   <button 
                    onClick={() => addQuestionAt(qIdx)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary transition-all group"
                   >
                     <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <Plus className="w-3 h-3" />
                     </div>
                     Savol qo'shish
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex justify-end">
          <button 
            onClick={handleUpdateTest}
            disabled={saving}
            className="btn-premium px-12 py-5 text-xl font-bold shadow-2xl"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "O'zgarishlarni saqlash"}
          </button>
        </div>
      </div>
    </div>
  )
}
