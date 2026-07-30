import type { ReactNode } from 'react'

type GuestLayoutProps = {
  children: ReactNode
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy-700 px-4 py-12">
      <div className="mb-6 text-center">
        <p className="font-mono text-lg font-semibold tracking-wide text-navy-50">Skillage Mart</p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-navy-200">
        SMK Skill Village Islamic School — Jonggol, Kabupaten Bogor
      </p>
    </div>
  )
}
