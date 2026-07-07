"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit3, Loader2, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

export default function AdminTestsPage() {
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null}>({
    isOpen: false,
    id: null
  })
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    fetchTests()
  }, [])

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/admin/tests")
      const data = await res.json()
      setTests(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error("Testlarni yuklashda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id })
  }

  const executeDelete = async () => {
    if (!deleteModal.id) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/tests/${deleteModal.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Test o'chirildi")
        fetchTests()
      } else {
        toast.error("O'chirishda xatolik!")
      }
    } catch (err) {
      toast.error("Xatolik yuz berdi")
    } finally {
      setIsDeleting(false)
      setDeleteModal({ isOpen: false, id: null })
    }
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black font-outfit uppercase tracking-wider">Testlar bazasi</h1>
          <p className="text-muted-foreground mt-2">Barcha mavjud testlarni boshqarish va yangilarini qo'shish</p>
        </div>
        <Link 
          href="/admin/tests/new"
          className="btn-premium px-10 py-5 font-black flex items-center gap-3 rounded-2xl shadow-2xl hover:scale-105 transition-all"
        >
          <Plus className="w-6 h-6" />
          Yangi Test yaratish
        </Link>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div key={test.id} className="bg-slate-900/60 p-6 rounded-lg border border-white/5 flex flex-col group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${test.role === 'STUDENT' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                  {test.role === "STUDENT" ? `O'Q • ${test.level}` : "USTOZ"}
                </span>
                <button 
                  onClick={() => handleDeleteClick(test.id)}
                  className="w-8 h-8 bg-black/40 text-slate-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="text-xl font-black font-outfit mb-2 pr-4 leading-tight group-hover:text-primary transition-colors">{test.title}</h3>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                {test.questions.length} ta savol
              </p>

              <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                <Link 
                  href={`/admin/tests/edit/${test.id}`}
                  className="flex-grow py-2.5 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Tahrirlash
                </Link>
                <Link 
                  href={`/admin/tests/view/${test.id}`}
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}

          {tests.length === 0 && (
            <div className="col-span-full h-64 bg-slate-900/40 rounded-lg flex flex-col items-center justify-center text-center p-10 border-dashed border border-white/10">
               <Plus className="w-8 h-8 text-slate-800 mb-4" />
               <h3 className="text-lg font-bold font-outfit text-slate-500">Testlar mavjud emas</h3>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDelete}
        loading={isDeleting}
        title="Testni o'chirish"
        message="Haqiqatan ham ushbu testni o'chirmoqchimisiz? Ushbu amaldan so'ng ushbu testga tegishli barcha topshirilgan natijalar ham o'chib ketadi!"
        variant="danger"
        confirmText="Ha, o'chirilsin"
      />
    </div>
  )
}
