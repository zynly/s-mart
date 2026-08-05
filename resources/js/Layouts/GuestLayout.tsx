import type { ReactNode } from 'react'
import { Store, ShieldCheck } from 'lucide-react'

type GuestLayoutProps = {
  children: ReactNode
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Mesh & Glow Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="group relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/30">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950/80 backdrop-blur-sm transition-colors group-hover:bg-slate-950/60">
              <Store className="h-7 w-7 text-indigo-400 transition-transform duration-300 group-hover:rotate-6" />
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Skillage Mart System
          </span>
        </div>

        {/* Card Body */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/75 p-8 shadow-2xl shadow-slate-950/80 backdrop-blur-xl sm:p-9">
          {/* Top border accent line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />
          {children}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs font-medium tracking-wide text-slate-400">
          SMK Skill Village Islamic School &bull; Jonggol, Kabupaten Bogor
        </p>
      </div>
    </div>
  )
}
