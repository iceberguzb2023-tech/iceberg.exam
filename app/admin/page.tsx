"use client"

import { useState, useEffect } from "react"
import { Users, GraduationCap, ClipboardCheck, TrendingUp, BarChart3, Clock, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSubmissions: 0,
    averageScore: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/submissions")
      if (!res.ok) throw new Error("Yuklashda xatolik")
      const data = await res.json()
      
      const subs = Array.isArray(data) ? data : []
      const students = subs.filter((s: any) => s.role === "STUDENT").length
      const teachers = subs.filter((s: any) => s.role === "TEACHER").length
      const avg = subs.length > 0 
        ? (subs.reduce((acc: any, curr: any) => acc + (curr.score / (curr.maxPossibleScore || curr.totalQuestions)), 0) / subs.length) * 100 
        : 0

      setStats({
        totalSubmissions: subs.length,
        totalStudents: students,
        totalTeachers: teachers,
        averageScore: Math.round(avg),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { name: "Jami topshirilgan", value: stats.totalSubmissions, icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/20", desc: "Oxirgi 30 kun ichida" },
    { name: "Talabalar", value: stats.totalStudents, icon: GraduationCap, color: "text-accent", bg: "bg-accent/20", desc: "Barcha etaplar bo'yicha" },
    { name: "O'qituvchilar", value: stats.totalTeachers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/20", desc: "Mutaxassislar soni" },
    { name: "O'rtacha natija", value: `${stats.averageScore}%`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/20", desc: "Umumiy o'zlashtirish" },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black font-outfit mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Platformaning umumiy holati va statistikalar</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={card.name}
            className="glass-dark p-8 rounded-[32px] border-white/5 relative overflow-hidden group hover:bg-white/5 transition-all"
          >
            <div className={`${card.bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
              <card.icon className={`w-7 h-7 ${card.color}`} />
            </div>
            <div className="text-3xl font-black font-outfit mb-2 tracking-tighter">{card.value}</div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{card.name}</div>
            <div className="text-[10px] text-muted-foreground/40 mt-4">{card.desc}</div>
            
            {/* Decoration */}
            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full transition-all group-hover:opacity-20 ${card.bg}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Mini-List */}
        <div className="lg:col-span-2 glass-dark p-8 rounded-[40px] border-white/5">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold font-outfit flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> So'nggi natijalar
            </h2>
            <button className="text-primary text-sm font-bold hover:underline">Hammasini ko'rish</button>
          </div>
          
          <div className="space-y-4">
             {/* Placeholder for real last 5 activities */}
             <p className="text-muted-foreground text-sm flex items-center gap-2 bg-white/5 p-4 rounded-2xl border border-white/5">
               <AlertCircle className="w-4 h-4" /> Real vaqtda yangilanadigan ma'lumotlar...
             </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass-dark p-8 rounded-[40px] border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
          <h2 className="text-xl font-bold font-outfit mb-6">Tezkor Ma'lumot</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                 <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Oxirgi kirish</p>
                <p className="text-sm font-medium">Hozirda faol</p>
              </div>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-xs text-muted-foreground leading-relaxed">
              Tizim hozirda muammosiz ishlamoqda. Barcha testlar va natijalar xavfsiz holatda saqlanmoqda.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
