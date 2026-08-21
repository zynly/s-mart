import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Link } from '@inertiajs/react'

type GuestLayoutProps = {
  children: ReactNode
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12 text-content font-sans selection:bg-mustard-500 selection:text-navy-900">
      {/* Background Decorative Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #0f1b33 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="group mb-3 flex flex-col items-center gap-2">
            <img
              src="/logo/logo2.png"
              alt="S-Mart Logo"
              className="size-14 object-contain rounded-2xl bg-white border-2 border-amber-300 shadow-lg p-1 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1">
              <span className="font-mono text-xl font-extrabold tracking-tight text-navy-900">
                Skillage<span className="text-mustard-500">.Mart</span>
              </span>
            </div>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-semibold text-content-muted shadow-2xs">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            System Minimarket Santri
          </span>
        </div>

        {/* Card Body */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-7 sm:p-9 shadow-lg">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs font-medium text-content-muted">
          SMK Skill Village Islamic School &bull; Jonggol, Kabupaten Bogor
        </p>
      </div>
    </div>
  )
}

