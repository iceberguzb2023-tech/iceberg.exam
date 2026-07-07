"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Award, BookOpen, Clock, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

export default function ViewTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [test, setTest] = useState<any>(null)

  useEffect(() => {
    fetchTest()
  }, [id])

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/admin/tests/${id}`)
      if (!res.ok) throw new Error("Test topilmadi")
      const data = await res.json()
      setTest(data)
    } catch (err) {
      toast.error("Testni yuklashda xatolik yuz berdi!")
      router.push("/admin/tests")
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  )

  if (!test) return <div className="p-10 text-center">Test topilmadi</div>

  const mcqQuestions = test.questions.filter((q: any) => q.type === "MCQ")
  const openQuestions = test.questions.filter((q: any) => q.type === "OPEN")
  const vocabQuestions = test.questions.filter((q: any) => q.type === "VOCABULARY")

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6 bg-slate-900/50 p-6 rounded-lg border border-white/5">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-grow">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-black uppercase tracking-wider">
                {test.level}
              </span>
              <h1 className="text-2xl font-black font-outfit uppercase tracking-tight">{test.title}</h1>
            </div>
            <p className="text-muted-foreground text-sm">Test mazmuni va savollar tizimi bilan tanishish (Preview)</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 p-6 rounded-lg border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-black font-outfit">{test.questions.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Jami Savollar</div>
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-lg border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-black font-outfit">{mcqQuestions.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Test Savollari</div>
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-lg border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black font-outfit">{openQuestions.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Ochiq Savollar</div>
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-lg border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-black font-outfit">{vocabQuestions.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Vocabulary</div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          <h2 className="text-xl font-black font-outfit uppercase tracking-widest px-2">Savollar Tafsiloti</h2>
          {test.questions.map((q: any, idx: number) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={q.id}
              className="bg-slate-900/40 rounded-lg border border-white/5 overflow-hidden"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center font-black text-sm border border-white/10 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="space-y-2">
                       <p className="text-lg font-bold leading-relaxed">{q.text}</p>
                       <span className="inline-block px-2 py-0.5 bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded border border-white/5">
                         {q.type === "MCQ" ? "Variantli Savol" : q.type === "OPEN" ? "Ochiq Savol" : "Vocabulary"}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Multiple Images Support */}
                {q.images && q.images.length > 0 && (
                  <div className={`grid gap-3 pt-4 ${
                    q.images.length === 1 ? 'max-w-md grid-cols-1' : 
                    q.images.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {q.images.map((img: string, i: number) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-white/5 bg-slate-950/50 shadow-md">
                         <img src={img} alt={`Savol rasmi ${i+1}`} className="w-full h-auto object-contain max-h-[250px]" />
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "MCQ" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                    {q.options.map((opt: string, optIdx: number) => {
                      const letter = String.fromCharCode(65 + optIdx)
                      const isCorrect = q.correctAnswer === letter
                      return (
                        <div 
                          key={letter}
                          className={`p-4 rounded-lg flex items-center gap-4 border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-950 border-white/5 opacity-60'}`}
                        >
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center font-black text-xs ${isCorrect ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-900 text-slate-600'}`}>
                            {letter}
                          </div>
                          <span className={`text-sm ${isCorrect ? 'text-white font-bold' : 'text-slate-400'}`}>{opt}</span>
                          {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {q.type === "OPEN" && (
                  <div className="p-4 bg-slate-950/50 rounded-lg border border-indigo-500/10 mt-4 italic text-slate-500 text-sm">
                    Ushbu savolga foydalanuvchi matn shaklida javob qoldiradi.
                  </div>
                )}

                {q.type === "VOCABULARY" && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/5">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950">
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 w-1/2">So'z</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5 w-1/2">Tarjima</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(q.vocabularyItems || []).map((item: any, vIdx: number) => (
                          <tr key={vIdx} className="border-b border-white/5 last:border-0">
                            <td className="px-4 py-3 text-sm font-bold text-white">{item.word || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">{item.translation || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!q.vocabularyItems || q.vocabularyItems.length === 0) && (
                      <p className="p-4 text-sm text-slate-600 italic">So'zlar ro'yxati bo'sh</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center pt-8 pb-12">
           <button 
            onClick={() => router.push(`/admin/tests/edit/${id}`)}
            className="btn-premium px-12 py-4 font-black uppercase text-xs tracking-widest rounded-xl shadow-2xl"
           >
             Ushbu testni tahrirlash
           </button>
        </div>
      </div>
    </div>
  )
}
