"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft, CheckCircle2, XCircle, AlertCircle, User, Calendar, Award, BookOpen, MessageSquare } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function SubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await fetch(`/api/admin/submissions/${params.id}`)
        const data = await res.json()
        setSubmission(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubmission()
  }, [params.id])

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!submission || !submission.test) return (
    <div className="h-screen flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/40 p-10 rounded-lg border border-white/5 text-center max-w-md space-y-6"
      >
        <div className="w-16 h-16 bg-rose-500/10 rounded-lg flex items-center justify-center mx-auto border border-rose-500/20">
          <XCircle className="w-8 h-8 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black font-outfit uppercase tracking-tight">Ma'lumot topilmadi</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ushbu natija yoki unga tegishli test tizimdan o'chirilgan bo'lishi mumkin. Natija detallarini ko'rib bo'lmaydi.
          </p>
        </div>
        <button 
          onClick={() => router.push("/admin/results")}
          className="w-full btn-premium py-3 font-bold rounded-lg"
        >
          Natijalar ro'yxatiga qaytish
        </button>
      </motion.div>
    </div>
  )

  const mcqQuestions = submission.test.questions?.filter((q: any) => q.type === "MCQ") || []
  const openQuestions = submission.test.questions?.filter((q: any) => q.type === "OPEN") || []
  const totalMCQ = mcqQuestions.length
  const totalQuestions = submission.test.questions?.reduce((acc: number, q: any) => {
    if (q.type === "VOCABULARY") {
      return acc + (q.vocabularyItems ? (q.vocabularyItems as any[]).length : 0)
    }
    return acc + 1
  }, 0) || 0
  const maxPossibleScore = submission.maxPossibleScore || totalQuestions
  const percentage = maxPossibleScore > 0 ? Math.round((submission.score / maxPossibleScore) * 100) : 0

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-lg border border-white/5">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-black font-outfit uppercase tracking-tight">Hisobot: Batafsil tahlil</h1>
            <p className="text-muted-foreground text-sm">Tanlangan shaxsning test natijalari haqida to'liq ma'lumot</p>
          </div>
        </div>

        {/* User Stats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 p-6 rounded-lg border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-400">
              <User className="w-3 h-3" /> Toppshiruvchi
            </div>
            <h2 className="text-2xl font-black font-outfit leading-tight">{submission.firstName} {submission.lastName}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${submission.role === 'STUDENT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                {submission.role === "STUDENT" ? `O'QUVCHI • ${submission.level}` : "USTOZ"}
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase ml-2">
                <Calendar className="w-3 h-3" /> {formatDate(submission.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center md:border-x border-white/5 space-y-1 py-2">
             <div className="text-3xl font-black font-outfit text-primary">{submission.score.toFixed(2)} <span className="text-base text-slate-700">/ {maxPossibleScore}</span></div>
             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">To'g'ri javoblar</p>
          </div>

          <div className="flex flex-col justify-center items-center space-y-1 py-2">
             <div className={`text-4xl font-black font-outfit ${percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{percentage}%</div>
             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Natija darajasi</p>
          </div>
        </motion.div>

        {/* Breakdown */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-black font-outfit uppercase tracking-widest">Savollar tahlili</h2>
          </div>

          <div className="space-y-4">
            {submission.test.questions.map((q: any, idx: number) => {
              const answerObj = submission.answers.find((a: any) => a.questionId === q.id)
              const userAnswer = answerObj?.answer
              const isCorrect = answerObj?.isCorrect

              return (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-slate-900/40 p-4 rounded-lg border border-white/5 flex flex-col gap-4"
                >
                   <div className="flex gap-3 items-start">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${q.type === 'MCQ' ? (isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20') : 'bg-primary text-white shadow-lg shadow-primary/20'}`}>
                      {idx + 1}
                    </div>
                     <div className="space-y-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{q.type === 'MCQ' ? 'Variantli' : q.type === 'OPEN' ? 'Ochiq savol' : 'Vocabulary'}</span>
                          {q.type === 'MCQ' && (
                            isCorrect ? 
                            <span className="text-[8px] font-black uppercase text-emerald-500 tracking-[0.2em]">To'g'ri</span> :
                            <span className="text-[8px] font-black uppercase text-rose-500 tracking-[0.2em]">Xato</span>
                          )}
                       </div>
                       <h4 className="text-base font-bold font-outfit leading-tight text-slate-200">{q.text}</h4>
                     </div>
                  </div>

                  {/* Multiple Images Support */}
                  {q.images && q.images.length > 0 && (
                    <div className={`grid gap-3 ${
                      q.images.length === 1 ? 'max-w-md grid-cols-1' : 
                      q.images.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}>
                      {q.images.map((img: string, i: number) => (
                        <div key={i} className="rounded-lg overflow-hidden border border-white/5 bg-slate-950/50 shadow-lg group">
                           <img src={img} alt={`Savol rasmi ${i+1}`} className="w-full h-auto object-contain max-h-[300px]" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                    {q.type === 'MCQ' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {["A", "B", "C", "D"].map(letter => {
                          const optionText = q.options[["A", "B", "C", "D"].indexOf(letter)]
                          const isUserSelect = userAnswer === letter
                          const isCorrectOpt = q.correctAnswer === letter

                          return (
                            <div 
                              key={letter}
                              className={`p-2 rounded-lg flex items-center gap-3 border text-xs transition-all ${
                                isCorrectOpt ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                                isUserSelect && !isCorrectOpt ? 'bg-rose-500/10 border-rose-500 text-rose-400' :
                                'bg-white/5 border-transparent text-slate-500'
                              }`}
                            >
                               <div className={`w-6 h-6 rounded flex items-center justify-center font-black text-xs ${
                                 isCorrectOpt ? 'bg-emerald-500 text-white' :
                                 isUserSelect && !isCorrectOpt ? 'bg-rose-500 text-white' :
                                 'bg-slate-900 border border-white/5'
                               }`}>
                                 {letter}
                               </div>
                               <span className={isCorrectOpt || isUserSelect ? 'font-bold' : ''}>{optionText || letter}</span>
                               {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                               {isUserSelect && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 ml-auto" />}
                            </div>
                          )
                        })}
                      </div>
                     ) : q.type === "OPEN" ? (
                      <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <label className="text-[8px] font-black uppercase tracking-widest text-primary block">Berilgan javob:</label>
                           {answerObj?.aiScore !== undefined && answerObj?.aiScore !== null && (
                             <span className={`px-2 py-0.5 rounded text-[9px] font-black ${answerObj.aiScore >= 0.5 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                               {answerObj.aiScore.toFixed(1)}
                             </span>
                           )}
                         </div>
                         <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm leading-relaxed text-slate-300">
                           {userAnswer || <span className="text-slate-600 italic">Javob berilmagan</span>}
                         </div>
                              {answerObj?.aiFeedback && (
                              <div className="text-xs text-slate-500 ml-1">
                                <span className="text-indigo-400 font-bold text-[9px] uppercase tracking-widest">AI: </span>
                                {answerObj.aiFeedback}
                              </div>
                            )}
                         </div>
                       ) : null}

                      {q.type === "VOCABULARY" && (
                        <div className="overflow-hidden rounded-lg border border-white/5">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-slate-950">
                                    <th className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5">So'z</th>
                                    <th className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5">Talaba javobi</th>
                                    <th className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5">Holat</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(answerObj?.vocabularyResults || (q.vocabularyItems || []).map((item: any) => {
                                    const vocabAns = Array.isArray(userAnswer) ? userAnswer : []
                                    const matched = vocabAns.find((v: any) => v.word === item.word)
                                    return { word: item.word, translation: item.translation, answer: matched?.answer || "", isCorrect: null }
                                  })).map((vr: any, vIdx: number) => (
                                    <tr key={vIdx} className="border-b border-white/5 last:border-0">
                                      <td className="px-3 py-1.5 text-sm font-medium text-white">{vr.word}</td>
                                      <td className="px-3 py-1.5 text-sm text-slate-400">{vr.answer || <span className="text-slate-600 italic">-</span>}</td>
                                      <td className="px-3 py-1.5">
                                    {vr.isCorrect === true ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3" /> To'g'ri</span>
                                    ) : vr.isMisspelled === true ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-widest"><AlertCircle className="w-3 h-3" /> Imlo xato</span>
                                    ) : vr.isCorrect === false ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest"><XCircle className="w-3 h-3" /> Xato</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-600">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
