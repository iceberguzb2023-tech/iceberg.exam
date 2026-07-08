"use client"

import { useState, useEffect } from "react"
import { 
  BarChart3, Download, Search, User, Calendar, Award, 
  ExternalLink, ChevronLeft, ChevronRight, Trash2, 
  CheckSquare, Square, Check, AlertCircle, Loader2
} from "lucide-react"
import Link from "next/link"
import { exportSubmissionsToExcel } from "@/lib/excel"
import { formatDate } from "@/lib/utils"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

const TEACHER_LEVELS = [
  "Support teacher",
  "Kids teacher",
  "1-2-3 level teachers",
  "4-5-6 level teachers"
]

export default function ResultsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("STUDENT")
  const [selectedLevel, setSelectedLevel] = useState("ALL")
  const [search, setSearch] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [allTests, setAllTests] = useState<any[]>([])
  const [selectedTestId, setSelectedTestId] = useState("ALL")
  
  // Selection & Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean,
    type: 'single' | 'bulk',
    id?: string
  }>({ isOpen: false, type: 'single' })

  useEffect(() => {
    fetchResults()
  }, [])

  useEffect(() => {
    fetchTests()
  }, [filter, selectedLevel])

  const fetchTests = async () => {
    if (selectedLevel === "ALL") {
      setAllTests([])
      setSelectedTestId("ALL")
      return
    }

    try {
      const res = await fetch(`/api/tests?role=${filter}&level=${selectedLevel}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setAllTests(data)
      }
    } catch (err) {
      console.error("Fetch tests error:", err)
    }
  }

  const fetchResults = async () => {
    try {
      const res = await fetch("/api/admin/submissions")
      const data = await res.json()
      
      if (data.error) {
        toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi")
        setSubmissions([])
        return
      }
      
      setSubmissions(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error("Server bilan bog'lanishda xatolik")
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = submissions.filter(s => {
    const searchMatch = (s.firstName?.toLowerCase() || "").includes(search.toLowerCase()) || 
                       (s.lastName?.toLowerCase() || "").includes(search.toLowerCase())
    const levelMatch = selectedLevel === "ALL" || s.level === selectedLevel
    
    // Date filter logic
    const submissionDate = new Date(s.createdAt).toISOString().split('T')[0]
    const dateMatch = !selectedDate || submissionDate === selectedDate
    
    // Test filter logic
    const testMatch = selectedTestId === "ALL" || s.testId === selectedTestId
    
    return s.role === filter && searchMatch && levelMatch && dateMatch && testMatch
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubmissions.map(s => s.id))
    }
  }

  const handleDeleteClick = (id: string) => {
    setConfirmState({ isOpen: true, type: 'single', id })
  }

  const handleBulkDeleteClick = () => {
    setConfirmState({ isOpen: true, type: 'bulk' })
  }

  const executeDelete = async () => {
    setIsDeleting(true)
    try {
      if (confirmState.type === 'single' && confirmState.id) {
        const res = await fetch(`/api/admin/submissions/${confirmState.id}`, { method: "DELETE" })
        if (res.ok) {
          setSubmissions(prev => prev.filter(s => s.id !== confirmState.id))
          setSelectedIds(prev => prev.filter(i => i !== confirmState.id))
          toast.success("Natija muvaffaqiyatli o'chirildi")
        } else {
          toast.error("O'chirishda xatolik yuz berdi")
        }
      } else if (confirmState.type === 'bulk') {
        const res = await fetch("/api/admin/submissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds })
        })
        if (res.ok) {
          setSubmissions(prev => prev.filter(s => !selectedIds.includes(s.id)))
          setSelectedIds([])
          toast.success("Tanlangan natijalar o'chirildi")
        } else {
          toast.error("Ommaviy o'chirishda xatolik yuz berdi")
        }
      }
    } catch (err) {
      toast.error("Tizimda kutilmagan xatolik")
    } finally {
      setIsDeleting(false)
      setConfirmState({ isOpen: false, type: 'single' })
    }
  }

  const handleExport = () => {
    exportSubmissionsToExcel(filteredSubmissions, filter, selectedLevel, selectedDate)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-outfit mb-2">Imtihon Natijalari</h1>
          <p className="text-muted-foreground text-lg">Barcha topshirilgan testlar va statistikalar</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {selectedIds.length > 0 && (
            <motion.button 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleBulkDeleteClick}
              disabled={isDeleting}
              className="px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Tanlanganlarni o'chirish ({selectedIds.length})
            </motion.button>
          )}
          <button 
            onClick={handleExport}
            className="btn-premium px-8 py-4 font-bold flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Excelga yuklash (.xlsx)
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900/40 p-4 rounded-lg border border-white/5">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => { setFilter("STUDENT"); setSelectedLevel("ALL"); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${filter === "STUDENT" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"}`}
          >
            Talabalar
          </button>
          <button 
            onClick={() => { setFilter("TEACHER"); setSelectedLevel("ALL"); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${filter === "TEACHER" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"}`}
          >
            O'qituvchilar
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <select 
            value={selectedLevel}
            onChange={(e) => { setSelectedLevel(e.target.value); setSelectedTestId("ALL"); setSelectedIds([]); }}
            className="bg-slate-950 border border-white/5 rounded-lg py-2.5 px-4 text-sm font-bold focus:border-primary outline-none text-white/80"
          >
            <option value="ALL">Barcha {filter === "STUDENT" ? "Etaplar" : "Darajalar"}</option>
            {filter === "STUDENT" ? (
              [1, 2, 3, 4, 5, "kids"].map(num => (
                <option key={num} value={`${num}-etap`}>{num}-etap</option>
              ))
            ) : (
              TEACHER_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))
            )}
          </select>

          {selectedLevel !== "ALL" && (
            <select 
              value={selectedTestId}
              onChange={(e) => { setSelectedTestId(e.target.value); setSelectedIds([]); }}
              className="bg-slate-950 border border-white/5 rounded-lg py-2.5 px-4 text-sm font-bold focus:border-primary outline-none text-white/80 animate-in fade-in slide-in-from-left-2"
            >
              <option value="ALL">Barcha Testlar</option>
              {allTests.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
        </div>

        {/* Date Filter */}
        <div className="relative group min-w-[180px]">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-primary transition-colors pointer-events-none" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedIds([]); }}
            className="w-full bg-slate-950 border border-white/5 rounded-lg py-2.5 pl-12 pr-10 text-sm font-bold focus:border-primary outline-none text-white/80 transition-all [color-scheme:dark]"
          />
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-md transition-all text-slate-500 hover:text-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Ism yoki familiya bo'yicha qidirish..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIds([]); }}
            className="w-full bg-slate-950 border border-white/5 rounded-lg py-3 pl-12 pr-4 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Results Table/Cards */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-slate-900/40 rounded-lg border border-dashed border-white/10">
          <Search className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold">Hech qanday natija topilmadi</p>
          <p className="text-sm opacity-50 mt-1">Siz tanlagan filtr yoki qidiruv bo'yicha ma'lumot yo'q</p>
        </div>
      ) : (
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto overflow-y-auto max-h-[650px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[#070b14]">
                <tr className="border-b border-white/5">
                  <th className="px-6 py-5 w-10">
                    <button onClick={toggleSelectAll} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-primary transition-colors">
                      {selectedIds.length === filteredSubmissions.length ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Talaba</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Test Nomi</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bosqich</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sana</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Natija</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredSubmissions.map((sub, idx) => {
                  const percentage = sub.totalQuestions > 0 ? Math.round((sub.score / sub.totalQuestions) * 100) : 0;
                  const statusColor = percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400';
                  const statusBg = percentage >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : percentage >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';
                  const isSelected = selectedIds.includes(sub.id)
                  
                  return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.01 }}
                      key={sub.id}
                      className={`group hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <button onClick={() => toggleSelect(sub.id)} className={`w-5 h-5 flex items-center justify-center transition-colors ${isSelected ? 'text-primary' : 'text-slate-800 hover:text-slate-600'}`}>
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">
                            {sub.firstName[0]}{sub.lastName[0]}
                          </div>
                          <div className="font-bold text-slate-200">
                            {sub.firstName} {sub.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-400">
                          {sub.test?.title || "Noma'lum"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-black text-slate-500 uppercase tracking-tight">
                          {sub.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDate(sub.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-md border ${statusBg} ${statusColor} text-[10px] font-black`}>
                            {percentage}%
                          </div>
                          <div className="text-[10px] text-slate-600 font-bold">
                            {sub.score?.toFixed(2)} / {sub.totalQuestions}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/admin/results/${sub.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 transition-all rounded-lg border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Batafsil</span>
                          </Link>
                          <button 
                            onClick={() => handleDeleteClick(sub.id)}
                            disabled={isDeleting}
                            className="p-2 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Mobile footer info */}
          <div className="p-4 bg-slate-950/30 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
            <span>Jami: {filteredSubmissions.length} natija {selectedIds.length > 0 && `(${selectedIds.length} tasi tanlangan)`}</span>
            <div className="flex gap-2">
              <button className="p-2 hover:text-primary transition-colors disabled:opacity-20" disabled><ChevronLeft className="w-4 h-4" /></button>
              <button className="p-2 hover:text-primary transition-colors disabled:opacity-20" disabled><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={executeDelete}
        loading={isDeleting}
        title={confirmState.type === 'bulk' ? "Ommaviy o'chirish" : "Natijani o'chirish"}
        message={confirmState.type === 'bulk' 
          ? `Haqiqatan ham ${selectedIds.length} ta tanlangan natijani o'chirmoqchimisiz?` 
          : "Ushbu natijani o'chirishni tasdiqlaysizmi?"
        }
        variant="danger"
        confirmText="Ha, o'chirilsin"
      />
    </div>
  )
}
